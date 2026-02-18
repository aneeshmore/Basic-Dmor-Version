import { OrdersService } from '../orders/service.js';
import { AppError } from '../../utils/AppError.js';
import logger from '../../config/logger.js';
import db from '../../db/index.js';
import { orders, accounts } from '../../db/schema/index.js';
import { eq } from 'drizzle-orm';

export class SplitOrdersService {
  constructor() {
    this.ordersService = new OrdersService();
  }

  /**
   * Split an order into two new orders
   * @param {string} originalOrderId - ID of the order to split
   * @param {Object} splitData - Data containing details for the two new orders
   * @returns {Object} Result containing the original order and the two new orders
   */
  async splitOrder(originalOrderId, splitData, userContext = {}) {
    const { order1, order2 } = splitData;
    const { resolvePlanType } = await import('../../utils/planAccess.js');
    const { AdminAccountsService } = await import('../admin-accounts/service.js');
    const adminService = new AdminAccountsService();
    const planType = resolvePlanType(userContext);

    logger.info(`Splitting order ${originalOrderId}`);

    // 1. Get original order
    const originalOrder = await this.ordersService.getOrderById(originalOrderId);
    if (!originalOrder) {
      throw new AppError('Original order not found', 404);
    }

    if (originalOrder.status === 'Cancelled') {
      throw new AppError('Order is already cancelled', 400);
    }

    // 2. Mark original order as Cancelled
    logger.info(`Cancelling original order ${originalOrderId}`);
    const cancellationRemark = 'Order cancled by Split Order.';

    await this.ordersService.updateOrder(originalOrderId, {
      status: 'Cancelled',
      notes: (originalOrder.remarks ? originalOrder.remarks + '\n' : '') + cancellationRemark,
    });

    // Update account remarks for the original order so it shows up in Cancelled Orders Report
    await db
      .update(accounts)
      .set({ remarks: cancellationRemark })
      .where(eq(accounts.orderId, originalOrder.orderId));

    // 3. Create first new order
    // Ensure we create a clean object for creation, copying relevant fields from original if not provided
    const newOrder1Data = this._prepareNewOrderData(originalOrder, order1);
    logger.info('Creating first split order');
    const newOrder1 = await this.ordersService.createOrder(newOrder1Data);

    // Update Bill No in accounts for newOrder1
    if (order1.billNo) {
      await db
        .update(accounts)
        .set({ billNo: order1.billNo })
        .where(eq(accounts.orderId, newOrder1.orderId));
    }

    // 4. Create second new order only if order2 is provided with items
    let newOrder2 = null;
    if (order2 && order2.orderDetails && order2.orderDetails.length > 0) {
      const newOrder2Data = this._prepareNewOrderData(originalOrder, order2);
      logger.info('Creating second split order');
      newOrder2 = await this.ordersService.createOrder(newOrder2Data);

      // Update Bill No in accounts for newOrder2
      if (order2.billNo) {
        await db
          .update(accounts)
          .set({ billNo: order2.billNo })
          .where(eq(accounts.orderId, newOrder2.orderId));
      }
    } else {
      logger.info('No second order created - dispatching full quantity');
    }

    // [NEW] Auto-accept split orders for Basic Plan
    if (planType === 'basic') {
      try {
        logger.info('[Basic Plan] Auto-accepting split orders at Accounts level');

        // Accept Order 1
        if (newOrder1) {
          // Move to Verified first
          await this.ordersService.repository.update(newOrder1.orderId, { status: 'Verified' });
          // Then accept by accounts
          await adminService.acceptOrder(newOrder1.orderId, {
            billNo: order1.billNo || newOrder1.orderNumber, // Use provided or generated? splits usually have billNo
            adminRemarks: 'Auto-approved Split Order (Basic Plan)',
          });

          // Reload logic if needed, but return object usually serves enough info
          const updated1 = await this.ordersService.getOrderById(newOrder1.orderId);
          Object.assign(newOrder1, updated1.order); // naive update
        }

        // Accept Order 2
        if (newOrder2) {
          await this.ordersService.repository.update(newOrder2.orderId, { status: 'Verified' });
          await adminService.acceptOrder(newOrder2.orderId, {
            billNo: order2.billNo || newOrder2.orderNumber,
            adminRemarks: 'Auto-approved Split Order (Basic Plan)',
          });
          const updated2 = await this.ordersService.getOrderById(newOrder2.orderId);
          Object.assign(newOrder2, updated2.order);
        }

      } catch (err) {
        logger.error('[Basic Plan] Failed to auto-accept split orders', err);
        // Don't throw, let the split finish successfully, user can manually accept if auto fails
      }
    }

    return {
      originalOrder: { ...originalOrder, status: 'Cancelled' },
      newOrder1,
      newOrder2,
    };
  }

  /**
   * Search for an order by ID, Order Number, or Bill No
   * @param {string} query
   * @returns {Object} Order details
   */
  async searchOrder(query) {
    let orderId = null;

    // 1. Try if query is a number (Order ID)
    if (!isNaN(query) && Number.isInteger(Number(query))) {
      const id = Number(query);
      const exists = await db
        .select({ id: orders.orderId })
        .from(orders)
        .where(eq(orders.orderId, id))
        .limit(1)
        .then(res => res[0]);

      if (exists) {
        orderId = id;
      }
    }

    // 2. Try finding by Bill No (in accounts)
    if (!orderId) {
      const account = await db
        .select({ orderId: accounts.orderId })
        .from(accounts)
        .where(eq(accounts.billNo, query))
        .limit(1)
        .then(res => res[0]);

      if (account) {
        orderId = account.orderId;
      }
    }

    // 3. Try finding by Order Number (in orders)
    if (!orderId) {
      const order = await db
        .select({ orderId: orders.orderId })
        .from(orders)
        .where(eq(orders.orderNumber, query))
        .limit(1)
        .then(res => res[0]);

      if (order) {
        orderId = order.orderId;
      }
    }

    if (orderId) {
      return await this.ordersService.getOrderById(orderId);
    }

    throw new AppError('Order not found', 404);
  }

  _prepareNewOrderData(originalOrder, newOrderPartial) {
    // We expect newOrderPartial to contain: billNo, orderDetails (array of { productId, quantity, unitPrice })
    // We retain customerId, salespersonId, and address from original order
    return {
      customerId: originalOrder.customerId,
      salespersonId: originalOrder.salespersonId,
      address: originalOrder.address,
      priority: originalOrder.priority,
      status: 'Pending', // Split orders go to admin for approval
      paymentCleared: false,
      ...newOrderPartial, // Overwrites billNo and orderDetails
      remarks:
        newOrderPartial.remarks ||
        `Split from Order ${originalOrder.billNo || originalOrder.orderNumber}`,
    };
  }
}
