/**
 * Payments Schema
 *
 * Tracks payments received from customers.
 */

import { serial, uuid, varchar, integer, numeric, text, timestamp, date } from 'drizzle-orm/pg-core';
import { appSchema } from '../core/app-schema.js';
import { customers } from './customers.js';
import { employees } from '../organization/employees.js';

export const payments = appSchema.table('payments', {
    paymentId: serial('payment_id').primaryKey(),
    paymentUuid: uuid('payment_uuid').defaultRandom().notNull(),

    customerId: integer('customer_id')
        .notNull()
        .references(() => customers.customerId, { onDelete: 'cascade' }),

    amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
    paymentDate: timestamp('payment_date', { withTimezone: true }).defaultNow().notNull(),

    // Payment Details
    paymentMode: varchar('payment_mode', { length: 50 }).notNull(), // Cash, Cheque, UPI, Bank Transfer
    referenceNo: varchar('reference_no', { length: 100 }), // Cheque No, Transaction ID

    notes: text('notes'),

    // Ownership
    createdBy: integer('created_by').references(() => employees.employeeId),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
