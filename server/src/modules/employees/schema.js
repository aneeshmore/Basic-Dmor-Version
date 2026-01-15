import { z } from 'zod';

export const createEmployeeSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().max(100).optional(),
  username: z.string().min(3, 'Username must be at least 3 characters').max(100),
  password: z.string().min(8, 'Password must be at least 8 characters').max(255).optional(),
  emailId: z.string().email('Invalid email format').max(255).optional(),
  mobileNo: z
    .array(z.string().regex(/^\d{10}$/, 'Each mobile number must be 10 digits'))
    .min(1, 'At least one mobile number is required')
    .max(3, 'Maximum 3 mobile numbers are allowed')
    .refine(
      mobiles => {
        const uniqueMobiles = new Set(mobiles);
        return uniqueMobiles.size === mobiles.length;
      },
      { message: 'Duplicate mobile numbers are not allowed' }
    ),
  countryCode: z.array(z.string().max(10).nullable()).max(3).optional(),
  departmentId: z.number().int().positive('Department is required'),
  roleId: z.number().int().positive('Role is required'),
  employeeType: z.enum(['Regular', 'SalesPerson', 'Supervisor']).optional().default('Regular'),
  joiningDate: z
    .string()
    .nullable()
    .optional()
    .refine(
      val => {
        if (!val) return true; // Allow null/undefined
        const joiningDate = new Date(val);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        joiningDate.setHours(0, 0, 0, 0);
        return joiningDate <= today;
      },
      { message: 'Joining date cannot be a future date' }
    ),
  dob: z
    .string()
    .nullable()
    .optional()
    .refine(
      val => {
        if (!val) return true; // Allow null/undefined
        const dob = new Date(val);
        const today = new Date();
        const age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        const dayDiff = today.getDate() - dob.getDate();
        const exactAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
        return exactAge >= 18;
      },
      { message: 'Employee must be at least 18 years old' }
    ),
  // Dealer specific fields
  companyName: z.string().max(255).optional(),
  gstin: z.string().max(50).optional(),
  pincode: z.string().max(10).optional(),
  addressCity: z.string().max(100).optional(),
  addressState: z.string().max(100).optional(),
  area: z.string().max(100).optional(),
  addressComplete: z.string().max(500).optional(),
  customerType: z.enum(['Dealer', 'Distributor', 'Retailer']).optional().default('Dealer'),
});

export const updateEmployeeSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  username: z.string().min(3, 'Username must be at least 3 characters').max(100).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(255).optional(),
  emailId: z.string().email().max(255).optional(),
  mobileNo: z
    .array(z.string().regex(/^\d{10}$/, 'Each mobile number must be 10 digits'))
    .min(1, 'At least one mobile number is required')
    .max(3, 'Maximum 3 mobile numbers are allowed')
    .refine(
      mobiles => {
        const uniqueMobiles = new Set(mobiles);
        return uniqueMobiles.size === mobiles.length;
      },
      { message: 'Duplicate mobile numbers are not allowed' }
    )
    .optional(),
  countryCode: z.array(z.string().max(10).nullable()).max(3).optional(),
  departmentId: z.number().int().positive('Department is required').optional(),
  status: z.enum(['Active', 'Inactive', 'On Leave', 'Locked']).optional(),
  roleId: z.number().int().positive('Role ID must be a positive integer').optional(),
  employeeType: z.enum(['Regular', 'SalesPerson', 'Supervisor']).optional(),
  joiningDate: z
    .string()
    .nullable()
    .optional()
    .refine(
      val => {
        if (!val) return true; // Allow null/undefined
        const joiningDate = new Date(val);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        joiningDate.setHours(0, 0, 0, 0);
        return joiningDate <= today;
      },
      { message: 'Joining date cannot be a future date' }
    ),
  dob: z
    .string()
    .nullable()
    .optional()
    .refine(
      val => {
        if (!val) return true; // Allow null/undefined
        const dob = new Date(val);
        const today = new Date();
        const age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        const dayDiff = today.getDate() - dob.getDate();
        const exactAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
        return exactAge >= 18;
      },
      { message: 'Employee must be at least 18 years old' }
    ),
  // Dealer specific fields
  companyName: z.string().max(255).optional(),
  gstin: z.string().max(50).optional(),
  pincode: z.string().max(10).optional(),
  addressCity: z.string().max(100).optional(),
  addressState: z.string().max(100).optional(),
  area: z.string().max(100).optional(),
  addressComplete: z.string().max(500).optional(),
  customerType: z.enum(['Dealer', 'Distributor', 'Retailer']).optional(),
});
