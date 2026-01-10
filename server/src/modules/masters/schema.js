import { z } from 'zod';

export const createDepartmentSchema = z.object({
  DepartmentName: z.string().min(1, 'Department name is required').max(255),
});

export const updateDepartmentSchema = z.object({
  DepartmentName: z.string().min(1).max(255).optional(),
  IsActive: z.boolean().optional(),
});

export const createUnitSchema = z.object({
  UnitName: z.string().min(1, 'Unit name is required').max(50),
});

export const updateUnitSchema = z.object({
  UnitName: z.string().min(1).max(50),
});

export const createCustomerTypeSchema = z.object({
  CustomerTypeName: z.string().min(1, 'Customer type name is required').max(100),
});

export const updateCustomerTypeSchema = z.object({
  CustomerTypeName: z.string().min(1).max(100),
});

const emptyStringToNull = val => (val === '' ? null : val);

export const createCustomerSchema = z.object({
  CompanyName: z.string().min(1, 'Company name is required').max(255),
  ContactPerson: z.preprocess(emptyStringToNull, z.string().nullable().optional()),
  MobileNo: z.preprocess(
    emptyStringToNull,
    z
      .union([z.string().regex(/^\d{10}$/, 'Mobile number must be exactly 10 digits'), z.null()])
      .optional()
  ),
  MobileNo2: z.preprocess(
    emptyStringToNull,
    z
      .union([z.string().regex(/^\d{10}$/, 'Mobile number must be exactly 10 digits'), z.null()])
      .optional()
  ),
  MobileNo3: z.preprocess(
    emptyStringToNull,
    z
      .union([z.string().regex(/^\d{10}$/, 'Mobile number must be exactly 10 digits'), z.null()])
      .optional()
  ),
  EmailID: z.preprocess(
    val => {
      // Convert empty string, whitespace-only, or non-email-like strings to null
      if (!val || (typeof val === 'string' && (!val.trim() || !val.includes('@')))) return null;
      return val;
    },
    z.union([z.string().email('Invalid email address'), z.null()]).optional()
  ),
  Location: z.preprocess(emptyStringToNull, z.string().nullable().optional()),
  Area: z.preprocess(emptyStringToNull, z.string().nullable().optional()),
  Address: z.preprocess(emptyStringToNull, z.string().nullable().optional()),
  GSTNumber: z.preprocess(emptyStringToNull, z.string().nullable().optional()),
  Pincode: z.string().min(6, 'Pincode is required').max(10),
  SalesPersonID: z.number().int().positive().nullable().optional(),
  CustomerTypeID: z.number().int().positive().nullable().optional(),
  IsActive: z.boolean().optional().default(true),
});

export const updateCustomerSchema = z.object({
  CompanyName: z.string().min(1).max(255).optional(),
  ContactPerson: z.preprocess(emptyStringToNull, z.string().nullable().optional()),
  MobileNo: z.preprocess(
    emptyStringToNull,
    z
      .union([z.string().regex(/^\d{10}$/, 'Mobile number must be exactly 10 digits'), z.null()])
      .optional()
  ),
  MobileNo2: z.preprocess(
    emptyStringToNull,
    z
      .union([z.string().regex(/^\d{10}$/, 'Mobile number must be exactly 10 digits'), z.null()])
      .optional()
  ),
  MobileNo3: z.preprocess(
    emptyStringToNull,
    z
      .union([z.string().regex(/^\d{10}$/, 'Mobile number must be exactly 10 digits'), z.null()])
      .optional()
  ),
  EmailID: z.preprocess(
    val => {
      // Convert empty string, whitespace-only, or non-email-like strings to null
      if (!val || (typeof val === 'string' && (!val.trim() || !val.includes('@')))) return null;
      return val;
    },
    z.union([z.string().email(), z.null()]).optional()
  ),
  Location: z.preprocess(emptyStringToNull, z.string().nullable().optional()),
  Area: z.preprocess(emptyStringToNull, z.string().nullable().optional()),
  Address: z.preprocess(emptyStringToNull, z.string().nullable().optional()),
  GSTNumber: z.preprocess(emptyStringToNull, z.string().nullable().optional()),
  Pincode: z.string().min(6).max(10).optional(),
  SalesPersonID: z.number().int().positive().nullable().optional(),
  CustomerTypeID: z.number().int().positive().nullable().optional(),
  IsActive: z.boolean().optional(),
});
