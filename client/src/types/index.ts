// ============================================
// CENTRAL TYPE EXPORTS
// Re-export types from feature modules for backward compatibility
// ============================================

import { LucideIcon } from 'lucide-react';

// Masters Feature Types
export type {
  Department,
  Designation,
  Unit,
  MasterProduct,
  Customer,
} from '@/features/masters/types';

// Employees Feature Types
export type { Employee } from '@/features/employees/types';

// Products Feature Types
export type { Product, ProductBOM } from '@/features/master-products/types';

// Orders Feature Types
export type {
  Order,
  OrderDetail,
  OrderWithDetails,
  CreateOrderInput,
  UpdateOrderInput,
} from '@/features/orders/types';

// Production Feature Types
export type {
  ProductionBatch,
  CreateProductionBatchInput,
  UpdateProductionBatchInput,
} from '@/features/production/types';

// Inventory Feature Types
export type {
  Product as InventoryProduct,
  StockLedger,
  CreateProductInput,
  UpdateProductInput,
} from '@/features/inventory/types';

// BOM Feature Types

// Notification Types
export type {
  Notification,
  MaterialShortageData,
  NotificationPriority,
} from '@/features/notifications/types';

// ============================================
// SHARED AUTHENTICATION TYPES
// ============================================

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthUser {
  EmployeeID: number;
  FirstName: string;
  LastName?: string;
  Username: string;
  Role: string;
  landingPage?: string;
  permissions?: UserPermission[];
  // Dealer fields
  companyName?: string;
  address?: string;
  gstin?: string;
  mobileNo?: string;
  customerId?: number;
  customerUuid?: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: AuthUser;
  message?: string;
}

export interface UserPermission {
  PageName: string;
  CanCreate: boolean;
  CanModify: boolean;
  CanView: boolean;
  CanLock: boolean;
  grantedApis: string[]; // Actual API routes granted (e.g., 'GET:/orders', 'POST:/orders')
}

export interface Permission {
  permissionId: number;
  permissionName: string;
  description?: string;
  // Page metadata for DB-driven permission management
  pagePath?: string;
  pageLabel?: string;
  pageGroup?: string;
  parentId?: number;
  isPage?: boolean;
  // Available actions for this permission (e.g., ['view', 'export'] for reports)
  availableActions?: string[];
}

export interface Role {
  roleId: number;
  roleName: string;
  description?: string;
  isActive: boolean;
}

export interface RolePermission {
  roleId: number;
  permissionId: number;
  grantedActions: string[];
}

// ============================================
// SHARED UI TYPES
// ============================================

export interface ThemeConfig {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  success: string;
  danger: string;
}

export enum PageType {
  DASHBOARD = 'DASHBOARD',
  MASTER_DEPARTMENT = 'MASTER_DEPARTMENT',
  MASTER_EMPLOYEE = 'MASTER_EMPLOYEE',
  MASTER_PRODUCT = 'MASTER_PRODUCT',
  OPERATION_PRODUCTION = 'OPERATION_PRODUCTION',
  REPORT_STOCK = 'REPORT_STOCK',
  SYSTEM_CONTROL = 'SYSTEM_CONTROL',
}

export interface NavItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  page: PageType;
  group: 'Masters' | 'Operations' | 'Reports' | 'System' | 'Analytics';
}

// ============================================
// SHARED API TYPES
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
}
