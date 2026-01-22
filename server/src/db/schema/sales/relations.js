/**
 * Sales Relations
 *
 * Defines relationships between customers, orders, order details, and accounts.
 * UPDATED Dec 2024: Using consolidated batchProducts instead of batchOrders
 */

import { relations } from 'drizzle-orm';
import { customers } from './customers.js';
import { orders } from './orders.js';
import { orderDetails } from './order-details.js';
import { accounts } from './accounts.js';
import { employees } from '../organization/employees.js';
import { batchProducts } from '../production/batch-products.js';
import { dispatches } from './dispatches.js';

// Customers Relations
export const customersRelations = relations(customers, ({ many }) => ({
  orders: many(orders),
}));

// Orders Relations
export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.customerId],
  }),
  salesperson: one(employees, {
    fields: [orders.salespersonId],
    references: [employees.employeeId],
  }),
  orderDetails: many(orderDetails),
  account: one(accounts, {
    fields: [orders.orderId],
    references: [accounts.orderId],
  }),
  batchProducts: many(batchProducts), // Updated from batchOrders
  dispatch: one(dispatches, {
    fields: [orders.dispatchId],
    references: [dispatches.dispatchId],
  }),
}));

// Dispatches Relations
export const dispatchesRelations = relations(dispatches, ({ many }) => ({
  orders: many(orders),
}));

// Order Details Relations
export const orderDetailsRelations = relations(orderDetails, ({ one, many }) => ({
  order: one(orders, {
    fields: [orderDetails.orderId],
    references: [orders.orderId],
  }),
  batchProducts: many(batchProducts), // Link to batch products for this order detail
}));

// Accounts Relations
export const accountsRelations = relations(accounts, ({ one }) => ({
  order: one(orders, {
    fields: [accounts.orderId],
    references: [orders.orderId],
  }),
  accountant: one(employees, {
    fields: [accounts.accountantId],
    references: [employees.employeeId],
  }),
}));
