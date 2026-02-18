import { tenantContext } from '../db/tenantContext.js';
import logger from '../config/logger.js';

// Build the set of valid tenant IDs from the environment at startup
const VALID_TENANTS = new Set(
    (process.env.TENANTS || '').split(',').map(t => t.trim()).filter(Boolean)
);

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
    // e.g. origin = https://mundle.paintos.in -> subdomain = "mundle" -> valid tenant
    // e.g. origin = https://morex.paintos.in  -> subdomain = "morex"  -> NOT in TENANTS, skip
    if (!tenantId && req.headers.origin) {
        try {
            const originHost = new URL(req.headers.origin).hostname;
            const parts = originHost.split('.');
            // Require at least 3 parts (subdomain.domain.tld) and not localhost
            if (parts.length >= 3 && !originHost.includes('localhost')) {
                const candidate = parts[0];
                // Only accept if it's a known tenant (not an API subdomain like "morex-api")
                if (VALID_TENANTS.has(candidate)) {
                    tenantId = candidate;
                }
            }
        } catch (e) {
            // URL parse failure, skip origin resolution
        }
    }

    // Priority 3: Host Header (Subdomain of the request itself)
    // e.g. host = morex-api.paintos.in -> subdomain = "morex-api" -> NOT in TENANTS, skip
    if (!tenantId) {
        const parts = host.split('.');

        // Development logic for localhost
        if (host.includes('localhost') || host.includes('127.0.0.1')) {
            if (parts.length >= 2 && !host.startsWith('localhost')) {
                let candidate = parts[0];
                if (candidate.endsWith('-api')) {
                    candidate = candidate.replace('-api', '');
                }

                if (VALID_TENANTS.has(candidate)) tenantId = candidate;
            }
        }
        // Production logic
        else if (parts.length >= 2) {
            let candidate = parts[0];

            // Handle cleanup for API domains (e.g. demopro-api -> demopro)
            if (candidate.endsWith('-api')) {
                candidate = candidate.replace('-api', '');
            }

            // For paintos.in, strictly require 3 parts (subdomain.paintos.in)
            if (host.endsWith('paintos.in')) {
                if (parts.length >= 3 && VALID_TENANTS.has(candidate)) {
                    tenantId = candidate;
                }
            } else if (VALID_TENANTS.has(candidate)) {
                tenantId = candidate;
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
