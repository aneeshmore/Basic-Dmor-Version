/**
 * Customer Types Schema
 *
 * Defines different categories/types of customers
 * (e.g., Retail, Wholesale, Distributor, etc.)
 */

import { serial, varchar, timestamp, boolean } from 'drizzle-orm/pg-core';
import { appSchema } from '../core/app-schema.js';

export const customerTypes = appSchema.table('customer_types', {
  customerTypeId: serial('customer_type_id').primaryKey(),
  customerTypeName: varchar('customer_type_name', { length: 100 }).notNull().unique(),
  isSystemType: boolean('is_system_type').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
