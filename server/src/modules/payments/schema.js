
import { z } from 'zod';

export const createPaymentSchema = z.object({
    customerId: z.number().int().positive(),
    amount: z.number().positive(),
    paymentDate: z.string().datetime().optional(), // ISO String
    paymentMode: z.string().min(1),
    referenceNo: z.string().optional(),
    notes: z.string().optional(),
});
