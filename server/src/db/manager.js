import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema/index.js';
import logger from '../config/logger.js';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

class DBManager {
    constructor() {
        this.tenants = new Map(); // tenantId -> { db, pool }
        this.tenantConfigs = this.loadTenantConfigs();
    }

    /**
     * Parse tenants from .env
     * Format: TENANTS=client1,client2
     * DB_URL_CLIENT1=...
     */
    loadTenantConfigs() {
        const tenantsList = process.env.TENANTS ? process.env.TENANTS.split(',') : [];
        const configs = {};

        tenantsList.forEach(id => {
            const trimmedId = id.trim();
            const envKey = `DB_URL_${trimmedId.toUpperCase()}`;
            const url = process.env[envKey];

            if (url) {
                configs[trimmedId] = url;
            } else {
                logger.warn(`Missing database URL for tenant: ${trimmedId} (${envKey})`);
            }
        });

        return configs;
    }

    /**
     * Get or initialize a DB connection for a tenant
     */
    getTenantDB(tenantId) {
        if (!tenantId) return null;

        if (this.tenants.has(tenantId)) {
            return this.tenants.get(tenantId).db;
        }

        const connectionString = this.tenantConfigs[tenantId];
        if (!connectionString) {
            logger.error(`No database configuration found for tenant: ${tenantId}`);
            return null;
        }

        try {
            const pool = new Pool({
                connectionString,
                max: parseInt(process.env.DB_POOL_MAX || '20'),
                idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
            });

            const db = drizzle(pool, {
                schema,
                logger: process.env.NODE_ENV === 'development'
            });

            this.tenants.set(tenantId, { db, pool });
            logger.info(`Initialized database connection for tenant: ${tenantId}`);

            return db;
        } catch (error) {
            logger.error(`Failed to initialize database for tenant: ${tenantId}`, error);
            return null;
        }
    }

    /**
     * Initial validation of all configured databases
     */
    async validateConnections() {
        const results = await Promise.allSettled(
            Object.keys(this.tenantConfigs).map(async (id) => {
                const db = this.getTenantDB(id);
                if (db) {
                    // Accessing the pool from our Map
                    const { pool } = this.tenants.get(id);
                    await pool.query('SELECT 1');
                    return id;
                }
                throw new Error(`Failed to initialize ${id}`);
            })
        );

        results.forEach((res, i) => {
            if (res.status === 'fulfilled') {
                logger.info(`Verified connection for tenant: ${res.value}`);
            } else {
                logger.error(`Connection check failed for tenant: ${Object.keys(this.tenantConfigs)[i]}`);
            }
        });
    }
}

export const dbManager = new DBManager();
export default dbManager;
