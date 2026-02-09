import cron from 'node-cron';
import { sql, and, eq, lt, notInArray } from 'drizzle-orm';
import db from '../db/index.js';
import { customers, orders } from '../db/schema/index.js';
import logger from '../config/logger.js';

// Configuration
const INACTIVITY_DAYS = 60;

export const startCustomerJobs = () => {
    logger.info('Initializing Customer Cron Jobs...');

    // Schedule task to run at 00:00 every day
    cron.schedule('0 0 * * *', async () => {
        logger.info('Running job: Auto-inactivate idle customers');

        try {
            const sixtyDaysAgo = new Date();
            sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - INACTIVITY_DAYS);

            const recentOrderCustomers = await db
                .select({ customerId: orders.customerId })
                .from(orders)
                .where(sql`${orders.orderDate} > ${sixtyDaysAgo}`);

            const recentCustomerIds = recentOrderCustomers.map(r => r.customerId);

            let whereClause = and(
                eq(customers.isActive, true),
                lt(customers.updatedAt, sixtyDaysAgo)
            );

            if (recentCustomerIds.length > 0) {
                whereClause = and(
                    whereClause,
                    notInArray(customers.customerId, recentCustomerIds)
                );
            }

            const result = await db
                .update(customers)
                .set({
                    isActive: false,
                    updatedAt: new Date()
                })
                .where(whereClause)
                .returning({
                    id: customers.customerId,
                    name: customers.companyName
                });

            if (result.length > 0) {
                logger.info(`Auto-inactivated ${result.length} idle customers.`, {
                    inactivatedCustomers: result.map(c => c.name)
                });
            } else {
                logger.info('No idle customers found to inactivate.');
            }

        } catch (error) {
            logger.error('Error in auto-inactivate customers job:', error);
        }
    });

    logger.info('Customer Cron Jobs scheduled.');
};
