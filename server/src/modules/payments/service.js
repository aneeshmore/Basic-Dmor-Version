
import { PaymentRepository } from './repository.js';
import { AppError } from '../../utils/AppError.js';
import { db } from '../../db/index.js';

export class PaymentService {
    constructor() {
        this.repository = new PaymentRepository();
    }

    async createPayment(userId, paymentData) {
        return await db.transaction(async (tx) => {
            // 1. Create Payment Record
            const payment = await this.repository.createPayment(
                {
                    ...paymentData,
                    createdBy: userId,
                    // Ensure paymentDate is a Date object for Drizzle
                    paymentDate: paymentData.paymentDate ? new Date(paymentData.paymentDate) : new Date(),
                },
                tx
            );

            // 2. Update Customer Balance (Decrease/Credit)
            // Payment reduces the due amount, so we subtract (pass negative amount)
            const updatedCustomer = await this.repository.updateCustomerBalance(
                paymentData.customerId,
                -Math.abs(paymentData.amount),
                tx
            );

            if (!updatedCustomer) {
                throw new AppError('Customer not found', 404);
            }

            // 3. Get New Balance from updated record
            const newBalance = updatedCustomer.currentBalance;

            // 4. Create Ledger Entry
            await this.repository.createTransaction(
                {
                    customerId: paymentData.customerId,
                    type: 'PAYMENT',
                    referenceId: payment.paymentId,
                    referenceType: 'payments',
                    description: `Payment Received (${paymentData.paymentMode})`,
                    credit: paymentData.amount,
                    debit: 0,
                    balance: newBalance,
                },
                tx
            );

            return payment;
        });
    }

    async getCustomerLedger(customerId) {
        return await this.repository.getLedger(customerId);
    }

    async getCustomerBalance(customerId) {
        return await this.repository.getCustomerBalance(customerId);
    }

    async getPaymentsReport(filters) {
        return await this.repository.findAllPayments(filters);
    }
}
