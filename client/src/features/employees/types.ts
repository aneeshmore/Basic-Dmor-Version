// Employee Feature Types

export type EmployeeType = 'SalesPerson' | 'Supervisor' | 'Regular';

export interface Employee {
  EmployeeID: number;
  FirstName: string;
  LastName?: string;
  Username: string;
  Password?: string; // Only used during creation
  MobileNo?: string[];
  CountryCode?: (string | null)[];
  EmailID: string;
  DepartmentID?: number;
  DesignationID?: number;
  JoiningDate?: string;
  DOB?: string;
  Role?: string;
  Status: 'Active' | 'Inactive' | 'On Leave' | 'Locked';
  RoleID?: number;
  departmentName?: string;
  EmployeeType?: EmployeeType; // 'SalesPerson', 'Supervisor', or 'Regular'
  IsSalesPerson?: boolean;
  IsSupervisor?: boolean;
  // Dealer specific fields
  CompanyName?: string;
  GSTIN?: string;
  Pincode?: string;
  AddressCity?: string;
  AddressState?: string;
  Area?: string;
  AddressComplete?: string;
  CustomerType?: string;
  AssignedSalespersonID?: number;
}
