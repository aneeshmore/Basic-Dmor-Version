import { EmployeesRepository } from './repository.js';
import { EmployeeDTO } from './dto.js';
import { AppError } from '../../utils/AppError.js';
import { hashValue } from '../../utils/encryption.js';

export class EmployeesService {
  constructor() {
    this.repository = new EmployeesRepository();
  }

  async getAllEmployees(filters, userContext) {
    const employees = await this.repository.findAll(filters, userContext);
    return employees.map(e => new EmployeeDTO(e));
  }

  async getEmployeeById(employeeId) {
    const employee = await this.repository.findById(employeeId);
    if (!employee) {
      throw new AppError('Employee not found', 404);
    }
    return new EmployeeDTO(employee);
  }

  async getSalesPersons(userContext) {
    let filterId = null;

    // Scope for non-admin users (e.g. Sales Persons see only themselves)
    if (userContext && !userContext.isAdmin && userContext.employeeId) {
      filterId = userContext.employeeId;
    }

    const employees = await this.repository.findSalesPersons(filterId);
    return employees.map(e => new EmployeeDTO(e));
  }

  async createEmployee(employeeData) {
    // Check if username already exists
    if (employeeData.username) {
      const existing = await this.repository.findByUsername(employeeData.username);
      if (existing) {
        throw new AppError('Username already exists', 400);
      }
    }

    // Check if email already exists
    if (employeeData.emailId) {
      const existingEmail = await this.repository.findByEmail(employeeData.emailId);
      if (existingEmail) {
        throw new AppError('Email already exists', 400);
      }
    }

    // Check for duplicate mobile numbers within the same employee
    if (employeeData.mobileNo && employeeData.mobileNo.length > 0) {
      const uniqueMobiles = new Set(employeeData.mobileNo);
      if (uniqueMobiles.size !== employeeData.mobileNo.length) {
        throw new AppError(
          'Duplicate mobile numbers are not allowed within the same employee',
          400
        );
      }

      // Check if any mobile number already exists in database
      const existingMobiles = await this.repository.findByMobileNumbers(employeeData.mobileNo);
      if (existingMobiles.length > 0) {
        const duplicateNumbers = existingMobiles[0].mobile_no.filter(num =>
          employeeData.mobileNo.includes(num)
        );
        throw new AppError(
          `Mobile number(s) ${duplicateNumbers.join(', ')} already exist(s) for employee: ${existingMobiles[0].first_name} ${existingMobiles[0].last_name}`,
          400
        );
      }
    }

    // DEBUG: Log incoming employee data
    console.log('[DEBUG] createEmployee incoming data:', JSON.stringify(employeeData, null, 2));

    // Hash password if provided
    let passwordHash = null;
    if (employeeData.password) {
      passwordHash = await hashValue(employeeData.password);
    }

    // Prepare employee data for database
    const dbData = {
      firstName: employeeData.firstName,
      lastName: employeeData.lastName,
      username: employeeData.username,
      passwordHash,
      emailId: employeeData.emailId,
      mobileNo: employeeData.mobileNo,
      countryCode: employeeData.countryCode,
      departmentId: employeeData.departmentId,
      joiningDate: employeeData.joiningDate || null,
      dob: employeeData.dob || null,
      status: 'Active', // Always set new employees as Active
      // Dealer specific fields
      companyName: employeeData.companyName,
      gstin: employeeData.gstin,
      pincode: employeeData.pincode,
      addressCity: employeeData.addressCity,
      addressState: employeeData.addressState,
      area: employeeData.area,
      addressComplete: employeeData.addressComplete,
      customerType: employeeData.customerType,
    };

    const employee = await this.repository.create(dbData);

    // Assign Role if provided
    if (employeeData.roleId) {
      console.log(
        '[DEBUG] Assigning roleId:',
        employeeData.roleId,
        'to employeeId:',
        employee.employeeId
      );
      await this.repository.assignRole(employee.employeeId, employeeData.roleId);
    }

    // Refetch to get role name and role-based flags
    const freshEmployee = await this.repository.findById(employee.employeeId);
    return new EmployeeDTO(freshEmployee);
  }

  async updateEmployee(employeeId, updateData) {
    console.log('UpdateEmployee called for:', employeeId);
    const existing = await this.repository.findById(employeeId);
    if (!existing) {
      throw new AppError('Employee not found', 404);
    }

    // Check if username is being changed and if it already exists (for a different employee)
    if (updateData.username && updateData.username !== existing.username) {
      const existingUsername = await this.repository.findByUsername(updateData.username);
      if (existingUsername && existingUsername.employeeId !== employeeId) {
        throw new AppError('Username already exists', 400);
      }
    }

    // Check if email is being changed and if it already exists (for a different employee)
    if (updateData.emailId && updateData.emailId !== existing.emailId) {
      const existingEmail = await this.repository.findByEmail(updateData.emailId);
      if (existingEmail && existingEmail.employeeId !== employeeId) {
        throw new AppError('Email already exists', 400);
      }
    }

    // Check for duplicate mobile numbers if being updated
    if (updateData.mobileNo && updateData.mobileNo.length > 0) {
      // Check for duplicates within the same employee
      const uniqueMobiles = new Set(updateData.mobileNo);
      if (uniqueMobiles.size !== updateData.mobileNo.length) {
        throw new AppError(
          'Duplicate mobile numbers are not allowed within the same employee',
          400
        );
      }

      // Check if any mobile number already exists for other employees
      const existingMobiles = await this.repository.findByMobileNumbers(updateData.mobileNo);
      const otherEmployees = existingMobiles.filter(emp => emp.employee_id !== employeeId);

      if (otherEmployees.length > 0) {
        const duplicateNumbers = otherEmployees[0].mobile_no.filter(num =>
          updateData.mobileNo.includes(num)
        );
        throw new AppError(
          `Mobile number(s) ${duplicateNumbers.join(', ')} already exist(s) for employee: ${otherEmployees[0].first_name} ${otherEmployees[0].last_name}`,
          400
        );
      }
    }

    // DEBUG: Log incoming update data
    console.log('[DEBUG] updateEmployee incoming data:', JSON.stringify(updateData, null, 2));

    // Convert date strings to Date objects if provided
    const processedData = { ...updateData };
    const roleId = processedData.roleId;
    delete processedData.roleId; // Remove from employee table data

    // Remove employeeType from data (now determined by role)
    delete processedData.employeeType;

    // Handle password: hash it if provided
    if (processedData.password) {
      console.log('Hashing password for update...');
      try {
        processedData.passwordHash = await hashValue(processedData.password);
        console.log('Password hashed successfully');
        delete processedData.password; // Remove plain password, use passwordHash
      } catch (err) {
        console.error('Error hashing password:', err);
        throw err;
      }
    }

    // Handle DOB: convert string to Date, or keep null
    if (processedData.dob !== undefined) {
      if (processedData.dob === null || processedData.dob === '') {
        processedData.dob = null;
      } else if (typeof processedData.dob === 'string') {
        processedData.dob = new Date(processedData.dob);
      }
    }

    // Handle Joining Date: convert string to Date, or keep null
    if (processedData.joiningDate !== undefined) {
      if (processedData.joiningDate === null || processedData.joiningDate === '') {
        processedData.joiningDate = null;
      } else if (typeof processedData.joiningDate === 'string') {
        processedData.joiningDate = new Date(processedData.joiningDate);
      }
    }

    console.log(
      'Calling repository.update with:',
      JSON.stringify({ ...processedData, passwordHash: '***' })
    );
    const updated = await this.repository.update(employeeId, processedData);

    // Update Role if provided
    if (roleId) {
      await this.repository.assignRole(employeeId, roleId);
    }

    // Refetch to get updated role info and role-based flags
    const freshEmployee = await this.repository.findById(employeeId);

    console.log('Repository update successful');
    return new EmployeeDTO(freshEmployee);
  }

  async deleteEmployee(employeeId) {
    const existing = await this.repository.findById(employeeId);
    if (!existing) {
      throw new AppError('Employee not found', 404);
    }

    // Prevent toggling SuperAdmin
    const roleName = existing.role || '';
    if (roleName.toLowerCase() === 'superadmin') {
      throw new AppError('Cannot toggle SuperAdmin employee status', 403);
    }

    // Toggle status: Active → Inactive, Inactive → Active
    const newStatus = existing.status === 'Active' ? 'Inactive' : 'Active';
    await this.repository.update(employeeId, { status: newStatus });
  }
}
