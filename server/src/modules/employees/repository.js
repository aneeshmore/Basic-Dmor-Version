import { eq, desc, and } from 'drizzle-orm';
import db from '../../db/index.js';
import { employees, departments, employeeRoles, roles } from '../../db/schema/index.js';

export class EmployeesRepository {
  async findAll(filters = {}, userContext = null) {
    try {
      let query = db
        .select({
          employeeId: employees.employeeId,
          employeeUuid: employees.employeeUuid,
          firstName: employees.firstName,
          lastName: employees.lastName,
          username: employees.username,
          mobileNo: employees.mobileNo,
          countryCode: employees.countryCode,
          emailId: employees.emailId,
          departmentId: employees.departmentId,
          currentBranchId: employees.currentBranchId,
          status: employees.status,
          joiningDate: employees.joiningDate,
          dob: employees.dob,
          createdAt: employees.createdAt,
          updatedAt: employees.updatedAt,
          departments: {
            departmentId: departments.departmentId,
            departmentName: departments.departmentName,
          },
          roleId: employeeRoles.roleId,
          role: roles.roleName,
          isSalesRole: roles.isSalesRole,
          isSupervisorRole: roles.isSupervisorRole,
          // Dealer specific fields
          companyName: employees.companyName,
          gstin: employees.gstin,
          pincode: employees.pincode,
          addressCity: employees.addressCity,
          addressState: employees.addressState,
          area: employees.area,
          addressComplete: employees.addressComplete,
          customerType: employees.customerType,
          assignedSalespersonId: employees.assignedSalespersonId,
        })
        .from(employees)
        .leftJoin(departments, eq(employees.departmentId, departments.departmentId))
        .leftJoin(employeeRoles, eq(employees.employeeId, employeeRoles.employeeId))
        .leftJoin(roles, eq(employeeRoles.roleId, roles.roleId));

      // Build where conditions
      const whereConditions = [];
      if (filters.status) {
        whereConditions.push(eq(employees.status, filters.status));
      }
      if (filters.departmentId) {
        whereConditions.push(eq(employees.departmentId, filters.departmentId));
      }

      // Data scoping: Non-admins only see themselves
      if (userContext && !userContext.isAdmin && userContext.employeeId) {
        whereConditions.push(eq(employees.employeeId, userContext.employeeId));
      }

      // Apply where conditions if any exist
      if (whereConditions.length > 0) {
        query = query.where(
          whereConditions.length === 1 ? whereConditions[0] : and(...whereConditions)
        );
      }

      // Apply ordering
      query = query.orderBy(desc(employees.createdAt));

      // Apply pagination
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      if (filters.offset) {
        query = query.offset(filters.offset);
      }

      const results = await query;
      return results;
    } catch (error) {
      console.error('Employees findAll error:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  async findSalesPersons(filteredEmployeeId = null) {
    try {
      const conditions = [eq(employees.status, 'Active'), eq(roles.isSalesRole, true)];

      if (filteredEmployeeId) {
        conditions.push(eq(employees.employeeId, filteredEmployeeId));
      }

      // Use role-based detection: filter by roles.isSalesRole
      const results = await db
        .select({
          employeeId: employees.employeeId,
          firstName: employees.firstName,
          lastName: employees.lastName,
          role: roles.roleName,
        })
        .from(employees)
        .innerJoin(employeeRoles, eq(employees.employeeId, employeeRoles.employeeId))
        .innerJoin(roles, eq(employeeRoles.roleId, roles.roleId))
        .where(conditions.length > 1 ? and(...conditions) : conditions[0])
        .orderBy(employees.firstName);

      return results;
    } catch (error) {
      console.error('Employees findSalesPersons error:', error);
      throw error;
    }
  }

  async findById(employeeId) {
    const result = await db
      .select({
        employeeId: employees.employeeId,
        employeeUuid: employees.employeeUuid,
        firstName: employees.firstName,
        lastName: employees.lastName,
        username: employees.username,
        mobileNo: employees.mobileNo,
        countryCode: employees.countryCode,
        emailId: employees.emailId,
        departmentId: employees.departmentId,
        currentBranchId: employees.currentBranchId,
        status: employees.status,
        joiningDate: employees.joiningDate,
        dob: employees.dob,
        createdAt: employees.createdAt,
        updatedAt: employees.updatedAt,
        departments: {
          departmentId: departments.departmentId,
          departmentName: departments.departmentName,
        },
        roleId: employeeRoles.roleId,
        role: roles.roleName,
        isSalesRole: roles.isSalesRole,
        isSupervisorRole: roles.isSupervisorRole,
        // Dealer specific fields
        companyName: employees.companyName,
        gstin: employees.gstin,
        pincode: employees.pincode,
        addressCity: employees.addressCity,
        addressState: employees.addressState,
        area: employees.area,
        addressComplete: employees.addressComplete,
        customerType: employees.customerType,
        assignedSalespersonId: employees.assignedSalespersonId,
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.departmentId))
      .leftJoin(employeeRoles, eq(employees.employeeId, employeeRoles.employeeId))
      .leftJoin(roles, eq(employeeRoles.roleId, roles.roleId))
      .where(eq(employees.employeeId, employeeId));

    return result[0] || null;
  }

  async findByUsername(username) {
    const result = await db
      .select()
      .from(employees)
      .where(eq(employees.username, username))
      .limit(1);

    return result[0] || null;
  }

  async findByEmail(emailId) {
    const result = await db.select().from(employees).where(eq(employees.emailId, emailId)).limit(1);

    return result[0] || null;
  }

  async findByMobileNumbers(mobileNumbers) {
    // Find any employee that has any of the provided mobile numbers
    // Fetch all employees and check in application code since DB schema might not be array yet
    const allEmployees = await db
      .select({
        employeeId: employees.employeeId,
        firstName: employees.firstName,
        lastName: employees.lastName,
        mobileNo: employees.mobileNo,
      })
      .from(employees);

    // Filter employees that have any overlapping mobile numbers
    const matchingEmployees = allEmployees.filter(emp => {
      if (!emp.mobileNo) return false;

      // Handle both array and string types
      const empMobiles = Array.isArray(emp.mobileNo) ? emp.mobileNo : [emp.mobileNo];

      // Check if any of the employee's mobile numbers match any of the provided numbers
      return empMobiles.some(empMobile => mobileNumbers.includes(empMobile));
    });

    // Convert to match expected format
    return matchingEmployees.map(emp => ({
      employee_id: emp.employeeId,
      first_name: emp.firstName,
      last_name: emp.lastName,
      mobile_no: emp.mobileNo,
    }));
  }

  async create(employeeData) {
    const result = await db.insert(employees).values(employeeData).returning();

    // After create, fetch the complete record with proper formatting
    return await this.findById(result[0].employeeId);
  }

  async update(employeeId, updateData) {
    console.log('EmployeesRepository.update calling db with:', JSON.stringify(updateData));
    try {
      const result = await db
        .update(employees)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(employees.employeeId, employeeId))
        .returning();
      console.log('EmployeesRepository.update result:', result);
    } catch (err) {
      console.error('EmployeesRepository.update DB error:', err);
      throw err;
    }

    // After update, fetch the complete record with proper formatting
    return await this.findById(employeeId);
  }

  async delete(employeeId) {
    // Delete from employee_roles (no cascade on employeeId FK)
    await db.delete(employeeRoles).where(eq(employeeRoles.employeeId, employeeId));
    // Finally delete the employee
    await db.delete(employees).where(eq(employees.employeeId, employeeId));
  }

  async assignRole(employeeId, roleId) {
    // Check if role assignment exists
    const existing = await db
      .select()
      .from(employeeRoles)
      .where(eq(employeeRoles.employeeId, employeeId))
      .limit(1);

    if (existing.length > 0) {
      // Update existing
      await db
        .update(employeeRoles)
        .set({ roleId, assignedAt: new Date() })
        .where(eq(employeeRoles.employeeRoleId, existing[0].employeeRoleId));
    } else {
      // Insert new
      await db.insert(employeeRoles).values({
        employeeId,
        roleId,
      });
    }
  }

  // Fetch role by ID to get role flags
  async findRoleById(roleId) {
    const result = await db.select().from(roles).where(eq(roles.roleId, roleId)).limit(1);

    return result[0] || null;
  }
}
