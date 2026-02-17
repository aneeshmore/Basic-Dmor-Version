import { tenantContext } from '../db/tenantContext.js';
import logger from '../config/logger.js';

/**
 * Middleware to resolve the tenant from the subdomain and set the context.
 */
export const tenantMiddleware = (req, res, next) => {
    const host = req.headers.host;

    if (!host) {
        logger.warn('Request missing Host header');
        return res.status(400).json({ error: 'Missing Host header' });
    }

    // Extract subdomain (e.g., client1.paintos.in -> client1)
    let tenantId = null;

    // Production/Staging logic for paintos.in
    // Check if the host strictly ends with paintos.in
    if (host.endsWith('paintos.in')) {
        const parts = host.split('.');
        // Expecting: subdomain.paintos.in (3 parts)
        // If strict match, we need at least 3 parts
        if (parts.length >= 3) {
            // Take the part before paintos.in (which works out to be the first part if exactly 3)
            // But if we have deep subdomains like a.b.paintos.in, this might need care.
            // Assuming simple 1-level subdomain for tenants:
            tenantId = parts[0];
        } else {
            // Root domain (paintos.in) or invalid
            // We can either set no tenant (null) or a default if desired.
            // Leaving null to trigger 404 below unless specific landing page logic exists.
            logger.info(`Access to root domain ${host} without subdomain`);
        }
    }
    // Development logic
    else if (host.includes('localhost') || host.includes('127.0.0.1')) {
        // Development fallback
        // standard localhost: sub.localhost -> sub
        const parts = host.split('.');
        if (parts.length >= 2 && !host.startsWith('localhost')) {
            tenantId = parts[0];
        } else {
            // Explicit header/query/default for localhost dev without subdomains
            tenantId = req.headers['x-tenant-id'] || req.query.tenantId || process.env.DEFAULT_TENANT;
        }
    }
    // Fallback for other domains (legacy behavior, optional)
    else {
        // Keeping original behavior for flexibility or other domains if needed, 
        // but strictly prefer paintos.in as requested.
        const parts = host.split('.');
        if (parts.length >= 2) {
            tenantId = parts[0];
        }
    }

    if (!tenantId) {
        logger.warn(`Could not resolve tenant for host: ${host}`);
        // Optional: redirects or landing page logic could go here
        return res.status(404).json({ error: 'Tenant not identified' });
    }

    // Set the tenant ID in the AsyncLocalStorage context
    tenantContext.run(tenantId, () => {
        next();
    });
};

export default tenantMiddleware;
