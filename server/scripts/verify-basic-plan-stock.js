
import db from '../src/db/index.js';
import { orders, accounts } from '../src/db/schema/index.js';
import { OrdersService } from '../src/modules/orders/service.js';
import { eq } from 'drizzle-orm';
import { tenantContext } from '../src/db/tenantContext.js';

// Mock request/middleware context
const runTest = async () => {
    const tenantId = 'demobasic'; // Using demobasic as it likely simulates Basic Plan
    console.log(`Running test for tenant: ${tenantId}`);

    await tenantContext.run(tenantId, async () => {
        const service = new OrdersService();

        // 1. Data Setup
        console.log('--- Setting up Test Data ---');
        // We need a customer and salesperson. 
        // Assuming seed data exists (ID 1 for customer, ID 1 for employee) from previous conversations
        const customerId = 1;
        const salespersonId = 1;

        // We need a product. Assuming Product ID 1 exists.
        // We need to check its stock to know what to expect.
        // Ensure Product 1 has 0 stock for "Production Needed" test.
        // Or we pick a product we know.
        // Let's just create an order and see what happens, then adjust.
        const productId = 1;

        const orderData = {
            customerId,
            salespersonId,
            orderDate: new Date(),
            status: 'Pending',
            orderDetails: [
                {
                    productId: productId,
                    quantity: 1000, // Large quantity to likely force "Production Needed"
                    unitPrice: 100,
                    discount: 0
                }
            ],
            remarks: 'Test Order for Basic Plan Automation',
            priority: 'Normal'
        };

        try {
            // 2. Execute createOrder with 'basic' plan
            console.log('--- Creating Order (Basic Plan) ---');
            const order = await service.createOrder(orderData, 'basic');

            console.log('Order Created:', {
                id: order.orderId,
                orderNumber: order.orderNumber,
                status: order.status,
                stockStatus: order.stockStatus,
                paymentCleared: order.paymentCleared
            });

            // 3. Verification
            let passed = true;

            // Check Status
            if (order.status === 'Scheduled for Production') {
                console.log('✅ Status is "Scheduled for Production"');
            } else {
                console.error(`❌ Status mismatch. Expected "Scheduled for Production", got "${order.status}"`);
                passed = false;
            }

            // Check Stock Status
            if (order.stockStatus === 'Production Needed' || order.stockStatus === 'Stock Ready') {
                console.log(`✅ Stock Status is present: "${order.stockStatus}"`);
            } else {
                console.error(`❌ Stock Status missing or invalid. Got "${order.stockStatus}"`);
                passed = false;
            }

            // Check Payment
            if (order.paymentCleared === true) {
                console.log('✅ Payment is Cleared');
            } else {
                console.error('❌ Payment returned as not cleared');
                passed = false;
            }

            if (passed) {
                console.log('--- TEST PASSED ---');
            } else {
                console.log('--- TEST FAILED ---');
            }

        } catch (error) {
            console.error('Test Error Details:', {
                message: error.message,
                code: error.code,
                detail: error.detail,
                table: error.table,
                column: error.column
            });
            console.error('Full Error:', error);
        } finally {
            process.exit();
        }
    });
};

runTest();
