/**
 * Units Schema
 *
 * Defines measurement units used across the application.
 * Units can be used for products, inventory, and BOM calculations.
 */

import { serial, varchar, timestamp, boolean } from 'drizzle-orm/pg-core';
import { appSchema } from './app-schema.js';

export const units = appSchema.table('units', {
  unitId: serial('unit_id').primaryKey(),
  unitName: varchar('unit_name', { length: 50 }).notNull().unique(),
  isSystemUnit: boolean('is_system_unit').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
