
import { PaymentService } from './service.js';
import { createPaymentSchema } from './schema.js';
import { AppError } from '../../utils/AppError.js';

const paymentService = new PaymentService();

export const createPayment = async (req, res, next) => {
    try {
        const validation = createPaymentSchema.safeParse(req.body);
        if (!validation.success) {
            throw new AppError(validation.error.errors[0].message, 400);
        }

        const payment = await paymentService.createPayment(req.user.employeeId, validation.data);
        res.status(201).json({ success: true, data: payment });
    } catch (error) {
        console.error('Create Payment Error:', error);
        next(error);
    }
};

export const getCustomerLedger = async (req, res, next) => {
    try {
        const { customerId } = req.params;
        const ledger = await paymentService.getCustomerLedger(Number(customerId)); // Ensure number
        res.json({ success: true, data: ledger });
    } catch (error) {
        next(error);
    }
};

export const getCustomerBalance = async (req, res, next) => {
    try {
        const { customerId } = req.params;
        const balance = await paymentService.getCustomerBalance(Number(customerId));
        res.json({ success: true, data: { balance } });
    } catch (error) {
        next(error);
    }
}

export const getPaymentsReport = async (req, res, next) => {
    try {
        const { fromDate, toDate, customerId, paymentMode } = req.query;
        const payments = await paymentService.getPaymentsReport({
            fromDate,
            toDate,
            customerId: customerId ? Number(customerId) : undefined,
            paymentMode,
        });
        res.json({ success: true, data: payments });
    } catch (error) {
        next(error);
    }
};
