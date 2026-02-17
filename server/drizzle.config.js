import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config();

// For migrations, we can specify which tenant to target via an environment variable
// Defaulting to DATABASE_URL if present, otherwise using a specific tenant's URL
const targetTenant = process.env.MIGRATION_TENANT || process.env.DEFAULT_TENANT;
const tenantDbUrl = targetTenant ? process.env[`DB_URL_${targetTenant.toUpperCase()}`] : process.env.DATABASE_URL;

const connectionString = tenantDbUrl?.replace('&channel_binding=require', '');

export default defineConfig({
  schema: './src/db/schema/index.js',
  out: './database_schemas/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: connectionString,
  },
  schemaFilter: ['app'],
  verbose: true,
  strict: true,
});
