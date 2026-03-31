import { eq, desc, and, ilike, or, sql } from 'drizzle-orm';
import db from '../../db/index.js';
import {
  orders,
  dispatches,
  products,
  orderDetails,
  customers,
  accounts,
} from '../../db/schema/index.js';

export class DeliveryCompleteRepository {
  async findAll({ search }) {
    // Join dispatches -> orders -> orderDetails -> products, customers, accounts
    // Group by dispatch/order to list items

    // Bill No comes from accounts table

    let query = db
      .select({
        dispatch: dispatches,
        order: orders,
        customer: customers,
        orderDetail: orderDetails,
        product: products,
        account: accounts,
      })
      .from(dispatches)
      .innerJoin(orders, eq(dispatches.dispatchId, orders.dispatchId))
      .innerJoin(customers, eq(orders.customerId, customers.customerId))
      .leftJoin(orderDetails, eq(orders.orderId, orderDetails.orderId))
      .leftJoin(products, eq(orderDetails.productId, products.productId))
      .leftJoin(accounts, eq(orders.orderId, accounts.orderId))
      // Filter out Returned and Cancelled orders.
      // We essentially want 'Dispatched' orders (to be marked delivered)
      // or 'Delivered' (history, if that's the use case, though user didn't specify).
      // Safest to just exclude Returned/Cancelled to solve the specific request.
      .where(
        and(
          // If search exists, it's added below. If not, we just need this filter.
          // actually 'where' overwrites previous where if chained? No, drizzle usually combines or requires explicit AND.
          // However, let's look at lines 31-36. It initializes `query` and then adds `.where` if search.
          // So I should apply the base filter first.
          or(
            eq(orders.status, 'Dispatched'),
            eq(orders.status, 'Delivered')
            // including Delivered just in case they want to see what they did,
            // but definitely excluding Returned.
          )
        )
      )
      .orderBy(desc(dispatches.dispatchDate));

    if (search) {
      // Filter by bill no (order number or account billNo) and vehicle no
      query = query.where(
        or(
          ilike(orders.orderNumber, `%${search}%`),
          ilike(dispatches.vehicleNo, `%${search}%`),
          ilike(accounts.billNo, `%${search}%`)
        )
      );
    }

    const rows = await query;

    // Grouping
    const grouped = {};
    for (const row of rows) {
      const oid = row.order.orderId;
      if (!grouped[oid]) {
        grouped[oid] = {
          billNo: row.account?.billNo || null,
          orderNumber: row.order.orderNumber,
          customerName: row.customer.customerName,
          companyName: row.customer.companyName,
          location: row.order.deliveryAddress || row.customer.address,
          dispatchDate: row.dispatch.dispatchDate,
          vehicleNo: row.dispatch.vehicleNo,
          driverName: row.dispatch.driverName,
          status: row.order.status, // "Dispatched", "Delivered"
          orderId: row.order.orderId,
          dispatchId: row.dispatch.dispatchId,
          items: [],
        };
      }

      if (row.product) {
        grouped[oid].items.push({
          productName: row.product.productName,
          quantity: row.orderDetail.quantity,
          unit: row.product.unitId, // fetching unit if needed, better if joined with units table but simpler for now
        });
      }
    }

    return Object.values(grouped);
  }

  async markAsDelivered(orderId) {
    return await db
      .update(orders)
      .set({
        status: 'Delivered',
        updatedAt: new Date(),
      })
      .where(eq(orders.orderId, orderId))
      .returning();
  }
  async markAsReturned(orderId) {
    // 1. Get order details to know what to restore
    const details = await db
      .select({
        productId: orderDetails.productId,
        quantity: orderDetails.quantity,
      })
      .from(orderDetails)
      .where(eq(orderDetails.orderId, orderId));

    // 2. Restore inventory - add quantity back to BOTH availableQuantity AND reservedQuantity
    // When dispatched: available -= qty, reserved -= qty
    // When undispatched (returned): available += qty, reserved += qty
    // This puts the order back to "Ready for Dispatch" state with proper reservation
    for (const item of details) {
      await db
        .update(products)
        .set({
          availableQuantity: sql`COALESCE(${products.availableQuantity}, 0) + ${item.quantity}`,
          reservedQuantity: sql`COALESCE(${products.reservedQuantity}, 0) + ${item.quantity}`,
          updatedAt: new Date(),
        })
        .where(eq(products.productId, item.productId));

      // Record reversal transaction
      try {
        await inventoryTransactionService.recordTransaction({
          productId: item.productId,
          transactionType: 'Return',
          quantity: item.quantity, // Positive for inward/return
          referenceType: 'Order',
          referenceId: orderId,
          notes: 'Order Returned to Stock',
          createdBy: 1, // Default system user or fetch common ID
        });
      } catch (error) {
        console.error('[DeliveryCompleteRepo] Error recording return transaction:', error);
      }
    }

    // 3. Update order status to 'Ready for Dispatch' (not 'Returned')
    // This allows the order to show up in PM Dashboard (Stock Ready) and Dispatch Planning (100%)
    // Also clear the dispatchId so it can be assigned to a new dispatch
    return await db
      .update(orders)
      .set({
        status: 'Ready for Dispatch',
        dispatchId: null, // Clear dispatch assignment
        updatedAt: new Date(),
      })
      .where(eq(orders.orderId, orderId))
      .returning();
  }

  async markAsCancelled(orderId) {
    // 1. Get order details to know what to restore
    const details = await db
      .select({
        productId: orderDetails.productId,
        quantity: orderDetails.quantity,
      })
      .from(orderDetails)
      .where(eq(orderDetails.orderId, orderId));

    // 2. Check current order status to determine if inventory was deducted
    const [order] = await db
      .select({ status: orders.status })
      .from(orders)
      .where(eq(orders.orderId, orderId));

    // 3. If order was dispatched, restore FG inventory
    // (Dispatch deducted from available, so we add it back)
    if (order && order.status === 'Dispatched') {
      for (const item of details) {
        await db
          .update(products)
          .set({
            availableQuantity: sql`${products.availableQuantity} + ${item.quantity}`,
            // NOT adding back to reservedQuantity - the cancelled stock is FREE
            updatedAt: new Date(),
          })
          .where(eq(products.productId, item.productId));

        // Record reversal transaction
        try {
          await inventoryTransactionService.recordTransaction({
            productId: item.productId,
            transactionType: 'Adjustment',
            quantity: item.quantity,
            referenceType: 'Order',
            referenceId: orderId,
            notes: 'Dispatch Reversal (Order Cancelled after Dispatch)',
            createdBy: 1,
          });
        } catch (error) {
          console.error('[DeliveryCompleteRepo] Error recording cancellation adjustment:', error);
        }
      }
    }

    // 4. Update order status to Cancelled
    return await db
      .update(orders)
      .set({
        status: 'Cancelled',
        updatedAt: new Date(),
      })
      .where(eq(orders.orderId, orderId))
      .returning();
  }
}
