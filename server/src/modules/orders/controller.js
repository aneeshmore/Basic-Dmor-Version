import { OrdersService } from './service.js';
import { createOrderSchema, updateOrderSchema } from './schema.js';
import logger from '../../config/logger.js';
import { getUserContext } from '../../middleware/dataScoping.js';

export class OrdersController {
  constructor() {
    this.service = new OrdersService();
  }

  /**
   * Get all orders with user-based data scoping
   * Non-admin users only see orders where they are the salesperson
   */
  getAllOrders = async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      const status = req.query.status;

      // Get user context for data scoping
      const userContext = getUserContext(req);

      const orders = await this.service.getAllOrders(limit, offset, status, userContext);

      res.json({
        success: true,
        data: orders,
      });
    } catch (error) {
      next(error);
    }
  };

  getOrderById = async (req, res, next) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await this.service.getOrderById(orderId);

      res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  };

  createOrder = async (req, res, next) => {
    try {
      const validatedData = createOrderSchema.parse(req.body);
      const planType = req.tenantConfig?.planType || 'basic'; // Default to basic if not set
      const order = await this.service.createOrder(validatedData, planType);

      logger.info('Order created', { orderId: order.orderId });

      res.status(201).json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  };

  updateOrder = async (req, res, next) => {
    try {
      const orderId = parseInt(req.params.id);
      const validatedData = updateOrderSchema.parse(req.body);

      const order = await this.service.updateOrder(orderId, validatedData);

      logger.info('Order updated', { orderId });

      res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteOrder = async (req, res, next) => {
    try {
      const orderId = parseInt(req.params.id);
      await this.service.deleteOrder(orderId);

      logger.info('Order deleted', { orderId });

      res.json({
        success: true,
        message: 'Order deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  getOrderStats = async (req, res, next) => {
    try {
      const stats = await this.service.getOrderStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };
}
