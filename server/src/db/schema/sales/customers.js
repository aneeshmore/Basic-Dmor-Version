/**
 * Customers Schema
 *
 * Customer/client information including contact details,
 * business information, and assigned sales personnel.
 */

import { serial, uuid, varchar, text, boolean, integer, timestamp, numeric } from 'drizzle-orm/pg-core';
import { appSchema } from '../core/app-schema.js';

export const customers = appSchema.table('customers', {
  customerId: serial('customer_id').primaryKey(),
  customerUuid: uuid('customer_uuid').defaultRandom().notNull(),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  contactPerson: varchar('contact_person', { length: 255 }).notNull(),
  mobileNo: varchar('mobile_no', { length: 20 }).array().notNull(),
  countryCode: varchar('country_code', { length: 10 }).array(),
  emailId: varchar('email_id', { length: 255 }),
  location: varchar('location', { length: 255 }),
  area: varchar('area', { length: 255 }),
  address: text('address'),
  gstNumber: varchar('gst_number', { length: 50 }),
  pinCode: varchar('pin_code', { length: 10 }),
  // Balance: Tracks the current outstanding amount (Positive = Due, Negative = Advance)
  currentBalance: numeric('current_balance', { precision: 14, scale: 2 }).default('0'),
  isActive: boolean('is_active').notNull().default(true),
  salesPersonId: integer('sales_person_id'),
  customerTypeId: integer('customer_type_id'),
  // Ownership: The employee who created this customer record
  createdBy: integer('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
