import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import dotenv from 'dotenv';
import logger from './config/logger.js';

dotenv.config();

/**
 * Utility script to register a new tenant and initialize its database.
 * Usage: node src/db/scripts/register-tenant.js <tenantId> <dbUrl>
 */

const [tenantId, dbUrl] = process.argv.slice(2);

if (!tenantId || !dbUrl) {
    console.error('Usage: node src/db/scripts/register-tenant.js <tenantId> <dbUrl>');
    process.exit(1);
}

const envPath = path.resolve(process.cwd(), '.env');

async function registerTenant() {
    try {
        console.log(`🚀 Registering tenant: ${tenantId}...`);

        // 1. Update .env file
        let envContent = fs.readFileSync(envPath, 'utf8');

        // Add to TENANTS list if not already there
        const tenantsMatch = envContent.match(/TENANTS=(.*)/);
        if (tenantsMatch) {
            const currentTenants = tenantsMatch[1].split(',').map(t => t.trim());
            if (!currentTenants.includes(tenantId)) {
                currentTenants.push(tenantId);
                envContent = envContent.replace(/TENANTS=.*/, `TENANTS=${currentTenants.join(',')}`);
            }
        } else {
            envContent += `\nTENANTS=${tenantId}`;
        }

        // Add DB_URL_[TENANT]=...
        const urlKey = `DB_URL_${tenantId.toUpperCase()}`;
        if (envContent.includes(`${urlKey}=`)) {
            envContent = envContent.replace(new RegExp(`${urlKey}=.*`), `${urlKey}=${dbUrl}`);
        } else {
            envContent += `\n${urlKey}=${dbUrl}`;
        }

        fs.writeFileSync(envPath, envContent);
        console.log(`✅ Updated .env with ${tenantId} configuration.`);

        // 2. Run migrations for the new tenant
        console.log(`📦 Running migrations for ${tenantId}...`);
        // Using MIGRATION_TENANT=... so drizzle-kit uses the right URL
        execSync(`set MIGRATION_TENANT=${tenantId} && npm run db:push`, { stdio: 'inherit' });
        console.log(`✅ Migrations completed for ${tenantId}.`);

        // 3. Optional: Seed the new tenant
        console.log(`🌱 Seeding initial data for ${tenantId}...`);
        execSync(`set MIGRATION_TENANT=${tenantId} && npm run db:seed`, { stdio: 'inherit' });
        console.log(`✅ Seeding completed for ${tenantId}.`);

        console.log(`\n🎉 Tenant ${tenantId} is ready!`);
        console.log(`Access at: http://${tenantId}.yourdomain.com:5000`);

    } catch (error) {
        console.error('❌ Failed to register tenant:', error.message);
        process.exit(1);
    }
}

registerTenant();
