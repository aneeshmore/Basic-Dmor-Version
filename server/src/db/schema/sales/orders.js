/**
 * Orders Schema
 *
 * Customer orders/sales orders.
 * Tracks order status, payment information, and delivery details.
 */

import {
  serial,
  uuid,
  varchar,
  integer,
  numeric,
  text,
  timestamp,
  date,
} from 'drizzle-orm/pg-core';
import { appSchema } from '../core/app-schema.js';
import { customers } from './customers.js';

export const orders = appSchema.table('orders', {
  orderId: serial('order_id').primaryKey(),
  orderUuid: uuid('order_uuid').defaultRandom().notNull(),
  orderNumber: varchar('order_number', { length: 50 }),
  customerId: integer('customer_id')
    .notNull()
    .references(() => customers.customerId, { onDelete: 'cascade' }),
  salespersonId: integer('salesperson_id'),
  orderDate: timestamp('order_date', { withTimezone: true }).defaultNow(),
  totalAmount: numeric('total_amount', { precision: 14, scale: 3 }).default('0'),
  status: varchar('status', { length: 30 }).notNull().default('Pending'),
  // Status flow: Pending -> Accepted -> Scheduled -> In Production -> Ready for Dispatch -> Dispatched -> Delivered
  deliveryAddress: text('delivery_address'),
  notes: text('notes'),
  priorityLevel: varchar('priority_level', { length: 20 }).notNull().default('Normal'),
  expectedDeliveryDate: date('expected_delivery_date'), // Set by production manager

  // Production tracking
  productionBatchId: integer('production_batch_id'), // Quick reference to batch
  pmRemarks: text('pm_remarks'), // Production manager remarks
  adminRemarks: text('admin_remarks'), // Admin/accountant remarks

  // Dispatch information
  dispatchId: integer('dispatch_id'), // References dispatches.dispatchId (added circularly in relations)
  dispatchRemarks: text('dispatch_remarks'),

  // Stock availability status (Derived from inventory check)
  // 'Stock Ready' (Green) or 'Production Needed' (Yellow)
  stockStatus: varchar('stock_status', { length: 50 }),

  // Ownership: The employee who created this order
  createdBy: integer('created_by'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
