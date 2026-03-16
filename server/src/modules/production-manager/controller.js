/**
 * Production Manager Controller
 *
 * HTTP handlers for production manager endpoints.
 */

import { ProductionManagerService } from './service.js';
import {
  checkInventorySchema,
  scheduleBatchSchema,
  updateDeliveryDateSchema,
  autoScheduleSchema,
} from './schema.js';
import logger from '../../config/logger.js';

const service = new ProductionManagerService();

/**
 * GET /production-manager/accepted-orders
 * Get all orders accepted by accountant, ready for production assessment
 */
export const getAcceptedOrders = async (req, res, next) => {
  try {
    const orders = await service.getAcceptedOrders();

    res.json({
      success: true,
      data: orders,
      message: 'Accepted orders retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /production-manager/batchable-orders
 * Get orders eligible for batching (Accepted + Scheduled for Production)
 */
export const getBatchableOrders = async (req, res, next) => {
  try {
    const orders = await service.getBatchableOrders();

    res.json({
      success: true,
      data: orders,
      message: 'Batchable orders retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /production-manager/orders/:orderId
 * Get order details with products
 */
export const getOrderDetails = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const orderData = await service.getOrderDetails(parseInt(orderId));

    res.json({
      success: true,
      data: orderData,
      message: 'Order details retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /production-manager/check-inventory
 * Check inventory availability for order products with BOM calculation
 */
export const checkInventory = async (req, res, next) => {
  try {
    const validatedData = checkInventorySchema.parse(req.body);

    const results = await service.checkInventoryAvailability(validatedData.products);

    res.json({
      success: true,
      data: results,
      message: 'Inventory check completed',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /production-manager/schedule-batch
 * Schedule a new production batch
 */
export const scheduleBatch = async (req, res, next) => {
  try {
    console.log('Received batch data:', JSON.stringify(req.body, null, 2));
    const validatedData = scheduleBatchSchema.parse(req.body);
    console.log('Validation passed');

    // Get user ID from auth context (should be set by auth middleware)
    const performedBy = req.user?.employeeId || 1; // Default to 1 for now

    const batch = await service.scheduleBatch(
      validatedData,
      validatedData.orders.map(o => o.orderId),
      performedBy
    );

    res.status(201).json({
      success: true,
      data: batch,
      message: 'Batch scheduled successfully',
    });
  } catch (error) {
    console.error('ERROR in scheduleBatch controller:');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error:', error);
    next(error);
  }
};

/**
 * GET /production-manager/batches
 * Get all batches with optional filters
 */
export const getAllBatches = async (req, res, next) => {
  try {
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.supervisorId) filters.supervisorId = parseInt(req.query.supervisorId);

    const batches = await service.getAllBatches(filters);

    res.json({
      success: true,
      data: batches,
      message: 'Batches retrieved successfully',
    });
  } catch (error) {
    console.error('ERROR in getAllBatches controller:');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    next(error);
  }
};

/**
 * GET /production-manager/batches/:batchId
 * Get batch details by ID
 */
export const getBatchDetails = async (req, res, next) => {
  try {
    const { batchId } = req.params;
    const batch = await service.getBatchDetails(parseInt(batchId));

    res.json({
      success: true,
      data: batch,
      message: 'Batch details retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /production-manager/auto-schedule
 * Auto-schedule an order (create tentative batch)
 */
export const autoScheduleOrder = async (req, res, next) => {
  try {
    const validatedData = autoScheduleSchema.parse(req.body);
    const performedBy = req.user?.employeeId || 1;

    const result = await service.autoScheduleOrder(
      validatedData.orderId,
      validatedData.expectedDeliveryDate,
      performedBy
    );

    res.json({
      success: true,
      data: result,
      message: 'Order auto-scheduled successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /production-manager/orders/:orderId
 * Update order details (delivery date, PM remarks)
 */
export const updateOrderDetails = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const updates = req.body;

    const updated = await service.updateOrderDetails(parseInt(orderId), updates);

    res.json({
      success: true,
      data: updated,
      message: 'Order details updated successfully',
    });
  } catch (error) {
    next(error);
  }
};
/**
 * POST /production-manager/orders/:orderId/send-to-dispatch
 * Send order to dispatch
 */
export const sendToDispatch = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const performedBy = req.user?.employeeId || 1;

    const result = await service.sendToDispatch(parseInt(orderId), performedBy);

    res.json({
      success: true,
      data: result,
      message: 'Order sent to Accept successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /production-manager/orders/:orderId/reserve-stock
 * Reserve stock for an order (when Load checkbox is checked in Dispatch Planning)
 */
export const reserveOrderStock = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const performedBy = req.user?.employeeId || 1;

    const result = await service.reserveOrderStock(parseInt(orderId), performedBy);

    res.json({
      success: true,
      data: result,
      message: 'Stock reserved successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /production-manager/orders/:orderId/release-stock
 * Release reserved stock for an order (when Load checkbox is unchecked in Dispatch Planning)
 */
export const releaseOrderStock = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const performedBy = req.user?.employeeId || 1;

    const result = await service.releaseOrderStock(parseInt(orderId), performedBy);

    res.json({
      success: true,
      data: result,
      message: 'Stock released successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /production-manager/update-delivery-date
 * Update expected delivery date for multiple orders
 */
export const updateDeliveryDate = async (req, res, next) => {
  try {
    const validatedData = updateDeliveryDateSchema.parse(req.body);

    const performedBy = req.user?.employeeId || 1;

    const result = await service.updateDeliveryDate(
      validatedData.orderIds,
      validatedData.deliveryDate,
      performedBy
    );

    res.json({
      success: true,
      data: result,
      message: 'Delivery dates updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /production-manager/calculate-bom
 * Calculate consolidated BOM for multiple orders
 */
export const calculateConsolidatedBOM = async (req, res, next) => {
  try {
    const validatedData = checkInventorySchema.parse(req.body);

    const bom = await service.calculateConsolidatedBOM(validatedData.products);

    res.json({
      success: true,
      data: bom,
      message: 'BOM calculated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /production-manager/planning-dashboard
 * Get planning dashboard data
 */
export const getPlanningDashboard = async (req, res, next) => {
  try {
    const data = await service.getPlanningDashboardData();
    res.json({
      success: true,
      data,
      message: 'Planning dashboard data retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /production-manager/check-production-feasibility
 * Check production feasibility
 */
export const checkProductionFeasibility = async (req, res, next) => {
  try {
    const { productId, productionQty } = req.body;
    // Basic validation
    if (!productId || productionQty === undefined) {
      return res.status(400).json({
        success: false,
        message: 'productId and productionQty are required',
      });
    }

    const result = await service.checkProductionFeasibility(productId, productionQty);
    res.json({
      success: true,
      data: result,
      message: 'Production feasibility checked successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /production-manager/check-group-feasibility
 * Check feasibility for a group of products
 */
export const checkGroupFeasibility = async (req, res, next) => {
  try {
    const { products } = req.body;
    if (!products || !Array.isArray(products)) {
      return res.status(400).json({
        success: false,
        message: 'products array is required',
      });
    }

    const result = await service.checkGroupFeasibility(products);
    res.json({
      success: true,
      data: result,
      message: 'Group feasibility checked successfully',
    });
  } catch (error) {
    next(error);
  }
};

// PUT /production-manager/batches/:batchId/complete
// Complete a batch with actual production data
export const completeBatch = async (req, res, next) => {
  try {
    const batchId = parseInt(req.params.batchId);
    const completionData = req.body;
    const performedBy = req.user?.employeeId || 1; // Default to 1 if no user context

    logger.info('Completing batch', { batchId, completionData });

    const result = await service.completeBatch(batchId, completionData, performedBy);

    res.json({
      success: true,
      data: result,
      message: 'Batch completed successfully. Inventory deducted and orders updated.',
    });
  } catch (error) {
    logger.error('Error completing batch', { error: error.message });
    next(error);
  }
};

// PUT /production-manager/batches/:batchId/cancel
// Cancel a batch
export const cancelBatch = async (req, res, next) => {
  try {
    const batchId = parseInt(req.params.batchId);
    const { reason } = req.body;
    const performedBy = req.user?.employeeId || 1;

    const result = await service.cancelBatch(batchId, reason, performedBy);

    res.json({
      success: true,
      data: result,
      message: 'Batch cancelled successfully',
    });
  } catch (error) {
    logger.error('Error cancelling batch', { error: error.message });
    next(error);
  }
};
