import { pgTable, serial, varchar, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { appSchema } from './app-schema.js';

export const planTypeEnum = appSchema.enum('plan_type', ['basic', 'pro']);

export const tenantSettings = appSchema.table('tenant_settings', {
    settingId: serial('setting_id').primaryKey(),
    planType: varchar('plan_type', { length: 20 }).default('basic').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
