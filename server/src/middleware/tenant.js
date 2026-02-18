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

    // 1. Resolve Tenant ID with Priority:
    // Priority 1: Explicit header (e.g., from Mobile App or specialized Client)
    let tenantId = req.headers['x-tenant-id'] || req.query.tenantId;

    // Priority 2: Origin Header (Request source domain) - BEST for centralized API
    if (!tenantId && req.headers.origin) {
        try {
            const originHost = new URL(req.headers.origin).hostname;
            const parts = originHost.split('.');
            // If it's a subdomain (e.g., dmor.morex.cloud -> parts.length is 3)
            // Or a 2-part domain that isn't localhost
            if (parts.length >= 2 && !originHost.includes('localhost')) {
                // Ignore "basic-api" if it somehow ends up in origin
                if (parts[0] !== 'basic-api') {
                    tenantId = parts[0];
                }
            }
        } catch (e) {
            // URL parse failure, skip origin resolution
        }
    }

    // Priority 3: Host Header (Subdomain of the request itself)
    if (!tenantId) {
        const parts = host.split('.');

        // Development logic for localhost
        if (host.includes('localhost') || host.includes('127.0.0.1')) {
            if (parts.length >= 2 && !host.startsWith('localhost')) {
                tenantId = parts[0];
            }
        }
        // Production logic
        else if (parts.length >= 2) {
            // Ignore "basic-api" or root domains
            if (parts[0] !== 'basic-api' && parts[0] !== 'www') {
                // For paintos.in, strictly require 3 parts (subdomain.paintos.in)
                if (host.endsWith('paintos.in')) {
                    if (parts.length >= 3) tenantId = parts[0];
                } else {
                    tenantId = parts[0];
                }
            }
        }
    }

    // Priority 4: Default fallback from environment
    if (!tenantId) {
        tenantId = process.env.DEFAULT_TENANT;
    }

    if (!tenantId) {
        logger.warn(`Could not resolve tenant for host: ${host}`);
        // Optional: redirects or landing page logic could go here
        return res.status(404).json({ error: 'Tenant not identified' });
    }

    // Set the tenant ID in the AsyncLocalStorage context
    tenantContext.run(tenantId, async () => {
        try {
            // Lazy load dependencies to avoid circular deps
            const { db } = await import('../db/index.js');
            const { tenantSettings } = await import('../db/schema/core/tenant-settings.js');

            // Fetch tenant settings
            const settings = await db.select().from(tenantSettings).limit(1);
            const planType = settings.length > 0 ? settings[0].planType : 'basic'; // Default to basic

            // Attach to request for easy access
            req.tenantConfig = {
                planType
            };

            next();
        } catch (error) {
            logger.error(`Failed to load tenant settings for ${tenantId}`, error);
            // Fallback to basic if DB fails (don't block request)
            req.tenantConfig = { planType: 'basic' };
            next();
        }
    });
};

export default tenantMiddleware;
