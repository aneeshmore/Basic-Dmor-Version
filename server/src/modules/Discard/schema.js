import { z } from 'zod';

// Accept both date (YYYY-MM-DD) and datetime strings
const dateOrDatetime = z.string().refine(
  val => {
    // Accept YYYY-MM-DD or full ISO datetime
    return /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/.test(val);
  },
  { message: 'Invalid date format. Expected YYYY-MM-DD or ISO datetime' }
);

export const createDiscardSchema = z.object({
  productId: z.number().int().positive(),
  productType: z.enum(['FG', 'RM', 'PM']),
  discardDate: dateOrDatetime.optional(),
  unitId: z.number().int().optional(),
  quantityPerUnit: z.number().positive(),
  numberOfUnits: z.number().positive(),
  reason: z.string().max(255).optional(),
  notes: z.string().optional(),
});

export const updateDiscardSchema = z.object({
  productId: z.number().int().positive().optional(),
  discardDate: dateOrDatetime.optional(),
  quantity: z.number().positive().optional(),
  reason: z.string().max(255).optional(),
  notes: z.string().optional(),
});
