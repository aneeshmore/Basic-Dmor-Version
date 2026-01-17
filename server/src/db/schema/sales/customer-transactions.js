/**
 * Customer Transactions Schema (Ledger)
 *
 * Tracks the history of debits (Invoices/Orders) and credits (Payments)
 * for a customer account. Used to generate the ledger report.
 */

import { serial, integer, numeric, varchar, timestamp, text } from 'drizzle-orm/pg-core';
import { appSchema } from '../core/app-schema.js';
import { customers } from './customers.js';

export const customerTransactions = appSchema.table('customer_transactions', {
    transactionId: serial('transaction_id').primaryKey(),

    customerId: integer('customer_id')
        .notNull()
        .references(() => customers.customerId, { onDelete: 'cascade' }),

    // Transaction Info
    type: varchar('type', { length: 20 }).notNull(), // 'INVOICE', 'PAYMENT', 'ADJUSTMENT'
    referenceId: integer('reference_id'), // ID of Order or Payment (Loose reference for flexibility)
    referenceType: varchar('reference_type', { length: 50 }), // 'orders', 'payments'

    // Descriptions
    description: text('description'), // e.g., "Order #ORD-001" or "Payment Ref #123"

    // Financials
    debit: numeric('debit', { precision: 14, scale: 2 }).default('0'), // Amount Billed (Increase Balance)
    credit: numeric('credit', { precision: 14, scale: 2 }).default('0'), // Amount Received (Decrease Balance)
    balance: numeric('balance', { precision: 14, scale: 2 }).default('0'), // Running Balance after this transaction

    transactionDate: timestamp('transaction_date', { withTimezone: true }).defaultNow().notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
