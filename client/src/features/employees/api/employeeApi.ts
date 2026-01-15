import apiClient from '@/api/client';
import { Employee } from '../types';

const API_PREFIX = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Transform Employee object from PascalCase to camelCase for backend
const toBackendFormat = (employee: Partial<Employee>) => {
  const data: Record<string, unknown> = {};

  if (employee.FirstName) data.firstName = employee.FirstName;
  if (employee.LastName) data.lastName = employee.LastName;
  if (employee.Username) data.username = employee.Username;
  if (employee.Password) data.password = employee.Password;
  if (employee.EmailID) data.emailId = employee.EmailID;
  if (employee.MobileNo) data.mobileNo = employee.MobileNo;
  if (employee.CountryCode) data.countryCode = employee.CountryCode;
  if (employee.DepartmentID) data.departmentId = employee.DepartmentID;
  // Include roleId for employee_roles table
  if (employee.RoleID) data.roleId = employee.RoleID;
  // Include JoiningDate even if empty (will be null on backend)
  if (employee.JoiningDate !== undefined) data.joiningDate = employee.JoiningDate || null;
  // Include DOB even if empty (will be null on backend)
  if (employee.DOB !== undefined) data.dob = employee.DOB || null;
  if (employee.Status) data.status = employee.Status;

  // Dealer specific fields
  if (employee.CompanyName) data.companyName = employee.CompanyName;
  if (employee.GSTIN) data.gstin = employee.GSTIN;
  if (employee.Pincode) data.pincode = employee.Pincode;
  if (employee.AddressCity) data.addressCity = employee.AddressCity;
  if (employee.AddressState) data.addressState = employee.AddressState;
  if (employee.Area) data.area = employee.Area;
  if (employee.AddressComplete) data.addressComplete = employee.AddressComplete;
  if (employee.CustomerType) data.customerType = employee.CustomerType;

  return data;
};

export const employeeApi = {
  getAll: async (params?: any): Promise<ApiResponse<Employee[]>> => {
    try {
      const { data } = await apiClient.get(`${API_PREFIX}/employees`, { params });
      return { success: true, data: data.data ?? data };
    } catch (err: any) {
      return {
        success: false,
        error: err?.response?.data?.error || err?.message || 'Failed to load employees',
      };
    }
  },

  create: async (employee: Partial<Employee>): Promise<ApiResponse<Employee>> => {
    try {
      const { data } = await apiClient.post(`${API_PREFIX}/employees`, toBackendFormat(employee));
      return { success: true, data: data.data ?? data };
    } catch (err: any) {
      return {
        success: false,
        error: err?.response?.data?.error || err?.message || 'Failed to create employee',
      };
    }
  },

  update: async (id: number, employee: Partial<Employee>): Promise<ApiResponse<Employee>> => {
    try {
      const { data } = await apiClient.put(
        `${API_PREFIX}/employees/${id}`,
        toBackendFormat(employee)
      );
      return { success: true, data: data.data ?? data };
    } catch (err: any) {
      return {
        success: false,
        error: err?.response?.data?.error || err?.message || 'Failed to update employee',
      };
    }
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    try {
      await apiClient.delete(`${API_PREFIX}/employees/${id}`);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err?.response?.data?.error || err?.message || 'Failed to delete employee',
      };
    }
  },

  getSalesPersons: async (): Promise<ApiResponse<Employee[]>> => {
    try {
      const { data } = await apiClient.get(`${API_PREFIX}/employees/sales-persons`);
      return { success: true, data: data.data ?? data };
    } catch (err: any) {
      return {
        success: false,
        error: err?.response?.data?.error || err?.message || 'Failed to load sales persons',
      };
    }
  },
};
