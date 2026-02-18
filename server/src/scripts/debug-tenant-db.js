
import pg from 'pg';
const { Client } = pg;

const checkTenantSettings = async () => {
    const connectionString = "postgres://postgres:h37ZKAlcFbQSQez3sCGuqkpl2516P9BwVfQYGLUbB6aAa1CaS0kadgilj3die6uL@145.223.18.139:5436/postgres";

    const client = new Client({
        connectionString,
    });

    try {
        await client.connect();
        console.log("✅ Connected to demobasic DB");

        // Check if tenant_settings table exists
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'tenant_settings'
            );
        `);

        if (!tableCheck.rows[0].exists) {
            console.log("❌ tenant_settings table DOES NOT EXIST");
            return;
        }

        const res = await client.query('SELECT * FROM tenant_settings');
        if (res.rows.length === 0) {
            console.log("⚠️ tenant_settings table is EMPTY");
        } else {
            console.log("✅ Tenant Settings found:", res.rows[0]);
        }

    } catch (err) {
        console.error("❌ Database connection error:", err);
    } finally {
        await client.end();
    }
};

checkTenantSettings();
