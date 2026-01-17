
import { db } from '../../db/index.js';
import { payments, customerTransactions, customers } from '../../db/schema/index.js';
import { eq, desc, sql } from 'drizzle-orm';

export class PaymentRepository {
    async createPayment(paymentData, transaction) {
        const tx = transaction || db;
        const [createdPayment] = await tx.insert(payments).values(paymentData).returning();
        return createdPayment;
    }

    async createTransaction(transactionData, transaction) {
        const tx = transaction || db;
        const [createdTx] = await tx.insert(customerTransactions).values(transactionData).returning();
        return createdTx;
    }

    async updateCustomerBalance(customerId, amountChange, transaction) {
        const tx = transaction || db;
        // Amount Change: Positive to increase balance (Debit), Negative to decrease (Credit)
        // SQL: current_balance + amountChange
        const [updatedCustomer] = await tx
            .update(customers)
            .set({
                currentBalance: sql`${customers.currentBalance} + ${amountChange}`,
                updatedAt: new Date(),
            })
            .where(eq(customers.customerId, customerId))
            .returning();
        return updatedCustomer;
    }

    async getCustomerBalance(customerId) {
        const [customer] = await db
            .select({ balance: customers.currentBalance })
            .from(customers)
            .where(eq(customers.customerId, customerId));
        return customer?.balance || 0;
    }

    async getLedger(customerId, fromDate, toDate) {
        let query = db
            .select()
            .from(customerTransactions)
            .where(eq(customerTransactions.customerId, customerId))
            .orderBy(desc(customerTransactions.transactionDate));

        // Add date filters if needed (omitted for brevity, can depend on requirement)

        return await query;
    }

    async findAllPayments({ fromDate, toDate, customerId, paymentMode }) {
        const conditions = [];

        if (customerId) conditions.push(eq(payments.customerId, customerId));
        if (paymentMode) conditions.push(eq(payments.paymentMode, paymentMode));
        if (fromDate) conditions.push(sql`${payments.paymentDate} >= ${new Date(fromDate)}`);
        if (toDate) conditions.push(sql`${payments.paymentDate} <= ${new Date(toDate)}`);

        // Using raw SQL for date comparison might be safer or use between() if available/imported
        // But sql template string is standard in Drizzle.

        const query = db
            .select({
                paymentId: payments.paymentId,
                amount: payments.amount,
                paymentDate: payments.paymentDate,
                paymentMode: payments.paymentMode,
                referenceNo: payments.referenceNo,
                notes: payments.notes,
                customer: {
                    id: customers.customerId,
                    name: customers.companyName,
                },
            })
            .from(payments)
            .leftJoin(customers, eq(payments.customerId, customers.customerId))
            .where(conditions.length > 0 ? sql.join(conditions, sql` AND `) : undefined)
            .orderBy(desc(payments.paymentDate));

        return await query;
    }
}
