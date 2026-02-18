
import db from '../src/db/index.js';
import { sql } from 'drizzle-orm';
import { tenantContext } from '../src/db/tenantContext.js';

const checkSchema = async () => {
    const tenantId = 'demobasic';
    console.log(`Checking schema for tenant: ${tenantId}`);

    await tenantContext.run(tenantId, async () => {
        try {
            const result = await db.execute(sql`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_schema = 'app' 
                AND table_name = 'orders';
            `);

            console.log('Columns in app.orders:', result.rows);

            const hasStockStatus = result.rows.some(r => r.column_name === 'stock_status' || r.column_name === 'stockStatus');
            console.log(`Has stock_status column: ${hasStockStatus}`);

        } catch (error) {
            console.error('Error checking schema:', error);
        } finally {
            process.exit();
        }
    });
};

checkSchema();
