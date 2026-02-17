import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * AsyncLocalStorage instance to track the current tenant ID throughout the request lifecycle.
 */
export const tenantContext = new AsyncLocalStorage();

/**
 * Helper to get the current tenant ID.
 * @returns {string|null} The tenant ID or null if not in a tenant context.
 */
export const getTenantId = () => tenantContext.getStore();
