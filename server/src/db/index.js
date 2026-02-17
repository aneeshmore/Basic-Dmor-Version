import logger from '../config/logger.js';
import { dbManager } from './manager.js';
import { getTenantId } from './tenantContext.js';

/**
 * Proxy object that dynamically resolves to the correct database instance
 * based on the current tenant context.
 */
export const db = new Proxy({}, {
  get(target, prop) {
    const tenantId = getTenantId();

    // If no tenant context is set, we might be in a background job or initialization
    if (!tenantId) {
      // Check for manual override (useful for CLI scripts like migrations/seeds)
      const overrideTenant = process.env.MIGRATION_TENANT || process.env.DEFAULT_TENANT;

      if (overrideTenant) {
        const overrideDb = dbManager.getTenantDB(overrideTenant);
        if (overrideDb) return overrideDb[prop];
      }

      logger.error(`Database access attempted without tenant context! Property: ${prop}`);
      throw new Error(`Tenant context missing for database operation: ${prop}`);
    }

    const tenantDb = dbManager.getTenantDB(tenantId);
    if (!tenantDb) {
      logger.error(`Database instance not found for tenant: ${tenantId}`);
      throw new Error(`Database connection failed for tenant: ${tenantId}`);
    }

    return tenantDb[prop];
  }
});

// Optionally validate connections on startup if needed
// dbManager.validateConnections().catch(err => logger.error('Initial connection check failed', err));

export default db;
