import { db } from '../../db/index.js';
import { tenantSettings } from '../../db/schema/core/tenant-settings.js';
import { AppError } from '../../utils/AppError.js';
import logger from '../../config/logger.js';
import { eq } from 'drizzle-orm';
import { tenantContext } from '../../db/tenantContext.js';

export class WebhookController {

    /**
     * Handle subscription update webhook
     * @route POST /api/v1/webhooks/subscription/update
     */
    updateSubscription = async (req, res, next) => {
        try {
            const { secret } = req.headers;
            const { subdomain, planType } = req.body;

            // 1. Validate Secret
            if (secret !== process.env.WEBHOOK_SECRET) {
                logger.warn('Webhook unauthorized attempt', { ip: req.ip });
                throw new AppError('Invalid webhook secret', 401);
            }

            if (!subdomain || !planType) {
                throw new AppError('Subdomain and planType are required', 400);
            }

            const normalizedPlan = planType.toLowerCase();
            if (!['basic', 'pro'].includes(normalizedPlan)) {
                throw new AppError('Invalid plan type. Must be "basic" or "pro"', 400);
            }

            logger.info('Received subscription update webhook', { subdomain, planType });

            // 2. Initialize Tenant Context for the target subdomain
            // We manually run this in the context of the specific tenant
            await tenantContext.run(subdomain, async () => {
                try {
                    // Check if settings exist
                    const existingSettings = await db.select().from(tenantSettings).limit(1);

                    if (existingSettings.length > 0) {
                        // Update
                        await db.update(tenantSettings)
                            .set({
                                planType: normalizedPlan,
                                updatedAt: new Date()
                            })
                            .where(eq(tenantSettings.settingId, existingSettings[0].settingId));
                    } else {
                        // Insert
                        await db.insert(tenantSettings).values({
                            planType: normalizedPlan
                        });
                    }

                    logger.info(`Updated plan for tenant ${subdomain} to ${normalizedPlan}`);

                } catch (dbError) {
                    logger.error(`Failed to update DB for tenant ${subdomain}`, dbError);
                    // If the tenant DB doesn't exist or connection fails, this will throw
                    // We might want to return 404 or 500 depending on the nature of the error
                    // For now, assuming if context.run works, DB *should* be accessible if configured
                    throw new AppError(`Failed to update tenant database: ${dbError.message}`, 500);
                }
            });

            res.json({
                success: true,
                message: `Plan updated to ${normalizedPlan} for ${subdomain}`
            });

        } catch (error) {
            next(error);
        }
    };
}
