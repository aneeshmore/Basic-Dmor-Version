/**
 * Employees Schema
 *
 * Core employee information including personal details,
 * organizational assignment, and authentication credentials.
 */

import { serial, uuid, varchar, integer, timestamp } from 'drizzle-orm/pg-core';
import { appSchema } from '../core/app-schema.js';
import { departments } from './departments.js';
import { branches } from './branches.js';

export const employees = appSchema.table('employees', {
  employeeId: serial('employee_id').primaryKey(),
  employeeUuid: uuid('employee_uuid').defaultRandom().notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  username: varchar('username', { length: 100 }).unique(),
  passwordHash: varchar('password_hash', { length: 255 }),
  mobileNo: varchar('mobile_no', { length: 20 }).array().notNull(),
  countryCode: varchar('country_code', { length: 10 }).array(),
  emailId: varchar('email_id', { length: 255 }).unique(),
  departmentId: integer('department_id').references(() => departments.departmentId, {
    onDelete: 'set null',
  }),
  currentBranchId: integer('current_branch_id').references(() => branches.branchId, {
    onDelete: 'set null',
  }),
  status: varchar('status', { length: 20 }).notNull().default('Active'),
  joiningDate: timestamp('joining_date', { mode: 'string' }),
  dob: timestamp('dob', { mode: 'string' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  // Dealer specific fields
  companyName: varchar('company_name', { length: 255 }),
  gstin: varchar('gstin', { length: 50 }),
  pincode: varchar('pincode', { length: 10 }),
  addressCity: varchar('address_city', { length: 100 }),
  addressState: varchar('address_state', { length: 100 }),
  area: varchar('area', { length: 100 }),
  addressComplete: varchar('address_complete', { length: 500 }),
  customerType: varchar('customer_type', { length: 50 }).default('Dealer'),
});
