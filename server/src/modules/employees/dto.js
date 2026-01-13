/**
 * EmployeeDTO
 * Data Transfer Object for Employee entity
 * Converts snake_case database fields to PascalCase for frontend
 * SECURITY: Password hash is intentionally excluded from all responses
 */
export class EmployeeDTO {
  constructor(employee) {
    // Extract date string from YYYY-MM-DD HH:MM:SS format (returns only date part)
    const extractDateOnly = dateString => {
      if (!dateString) return null;
      if (typeof dateString === 'string') {
        return dateString.split(' ')[0]; // Extract YYYY-MM-DD part only
      }
      return null;
    };

    // Map to PascalCase for frontend compatibility
    this.EmployeeID = employee.employeeId || employee.employee_id;
    this.EmployeeUUID = employee.employeeUuid || employee.employee_uuid;
    this.Username = employee.username;
    this.FirstName = employee.firstName || employee.first_name;
    this.LastName = employee.lastName || employee.last_name;
    this.EmailID = employee.emailId || employee.email_id;
    this.MobileNo = employee.mobileNo || employee.mobile_no;
    this.CountryCode = employee.countryCode || employee.country_code;
    this.DepartmentID = employee.departmentId || employee.department_id;
    this.CurrentBranchID = employee.currentBranchId || employee.current_branch_id;
    // Dates come from database as YYYY-MM-DD HH:MM:SS strings in 'string' mode
    this.JoiningDate = extractDateOnly(employee.joiningDate || employee.joining_date);
    this.DOB = extractDateOnly(employee.dob);
    this.Status = employee.status;
    this.Role = employee.role;
    this.RoleID = employee.roleId || employee.role_id;
    this.CreatedAt = employee.createdAt || employee.created_at;
    this.UpdatedAt = employee.updatedAt || employee.updated_at;

    // Employee type fields derived from role flags (replaces employeeSubTable)
    this.IsSalesPerson = employee.isSalesRole || employee.is_sales_role || false;
    this.IsSalesPerson = employee.isSalesRole || employee.is_sales_role || false;
    this.IsSupervisor = employee.isSupervisorRole || employee.is_supervisor_role || false;

    // Dealer/Customer Info
    this.CompanyName = employee.companyName || employee.company_name;
    this.GSTIN = employee.gstin;
    this.Pincode = employee.pincode;
    this.AddressCity = employee.addressCity || employee.address_city;
    this.AddressState = employee.addressState || employee.address_state;
    this.Area = employee.area;
    this.AddressComplete = employee.addressComplete || employee.address_complete;
    this.CustomerType = employee.customerType || employee.customer_type;
    this.AssignedSalespersonID = employee.assignedSalespersonId || employee.assigned_salesperson_id;

    // Computed EmployeeType for frontend convenience
    if (this.IsSalesPerson) {
      this.EmployeeType = 'SalesPerson';
    } else if (this.IsSupervisor) {
      this.EmployeeType = 'Supervisor';
    } else {
      this.EmployeeType = 'Regular';
    }

    // SECURITY: password_hash is intentionally NOT included
    // Passwords should never be sent to the frontend

    // Include related data if available
    if (employee.departments) {
      this.Department = {
        DepartmentID: employee.departments.departmentId || employee.departments.department_id,
        DepartmentName: employee.departments.departmentName || employee.departments.department_name,
      };
    }
  }
}
