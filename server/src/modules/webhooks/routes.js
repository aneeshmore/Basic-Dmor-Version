import { Router } from 'express';
import { WebhookController } from './controller.js';

const router = Router();
const controller = new WebhookController();

// Subscription update webhook
// This route is NOT protected by standard JWT auth, but by a shared secret header
router.post('/subscription/update', controller.updateSubscription);

export default router;
