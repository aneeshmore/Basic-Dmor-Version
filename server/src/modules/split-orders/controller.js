import { SplitOrdersService } from './service.js';
import { AppError } from '../../utils/AppError.js';

const splitOrdersService = new SplitOrdersService();

export const splitOrder = async (req, res, next) => {
  try {
    const { originalOrderId } = req.params;
    const { order1, order2 } = req.body;

    if (!originalOrderId) {
      throw new AppError('Original Order ID is required', 400);
    }

    if (!order1 || !order1.orderDetails || order1.orderDetails.length === 0) {
      throw new AppError('Order 1 data is incomplete (items required)', 400);
    }

    // order2 is optional - if not provided, only order1 is created (no balance order)

    const result = await splitOrdersService.splitOrder(originalOrderId, { order1, order2 }, req.user);

    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Order split successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const searchOrder = async (req, res, next) => {
  try {
    const { query } = req.query;

    if (!query) {
      throw new AppError('Query parameter is required', 400);
    }

    const result = await splitOrdersService.searchOrder(query);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
