
import express from 'express';
import * as paymentController from './controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = express.Navigator ? express.Navigator() : express.Router(); // fallback just in case, standard is Router()

router.post('/', authenticate, paymentController.createPayment);
router.put('/:id', authenticate, paymentController.updatePayment);
router.get('/reports/payments', authenticate, paymentController.getPaymentsReport);
router.get('/ledger/:customerId', authenticate, paymentController.getCustomerLedger);
router.get('/balance/:customerId', authenticate, paymentController.getCustomerBalance);

export default router;
