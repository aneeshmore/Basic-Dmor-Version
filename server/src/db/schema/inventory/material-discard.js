/**
 * Material Discard Schema
 *
 * Tracks discarded/wasted materials.
 * Records reasons for discarding and quantities.
 */

import { bigserial, integer, timestamp, numeric, varchar, text } from 'drizzle-orm/pg-core';
import { appSchema } from '../core/app-schema.js';

export const materialDiscard = appSchema.table('material_discard', {
  discardId: bigserial('discard_id', { mode: 'bigint' }).primaryKey(),
  productId: integer('product_id').notNull(),
  discardDate: timestamp('discard_date', { withTimezone: true }).defaultNow(),
  quantity: integer('quantity').notNull(),
  productType: varchar('product_type', { length: 10 }).notNull().default('FG'),
  reason: varchar('reason', { length: 255 }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
