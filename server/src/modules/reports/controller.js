import { ReportsService } from './service.js';
import { isBasicPlan } from '../../utils/planAccess.js';

const reportsService = new ReportsService();

export const getBatchProductionReport = async (req, res, next) => {
  try {
    const { status, startDate, endDate } = req.query;
    const data = await reportsService.getBatchProductionReport(status, startDate, endDate);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getDailyConsumptionReport = async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ success: false, message: 'Date is required' });
    }
    const data = await reportsService.getDailyConsumptionReport(date);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getMaterialInwardReport = async (req, res, next) => {
  try {
    const { type, startDate, endDate } = req.query;
    // Type is optional now, defaults to All if not provided or handled in service

    const data = await reportsService.getMaterialInwardReport(type, startDate, endDate);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getStockReport = async (req, res, next) => {
  try {
    const { type, productId, startDate, endDate } = req.query;
    // Type is optional now

    const data = await reportsService.getStockReport(type, productId, startDate, endDate);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getProfitLossReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const data = await reportsService.getProfitLossReport(startDate, endDate);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getProductWiseReport = async (req, res, next) => {
  try {
    const { productId, productType, startDate, endDate } = req.query;

    const data = await reportsService.getProductWiseReport(
      productId,
      startDate,
      endDate,
      productType
    );
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderCountsByMonth = async (req, res, next) => {
  try {
    const data = await reportsService.getOrderCountsByMonth();
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getCancelledOrders = async (req, res, next) => {
  try {
    const { year, month } = req.query;
    const data = await reportsService.getCancelledOrders(year, month);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getSalesmanRevenueReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    // Basic Plan Restriction: Only show own data
    let salespersonId = null;
    const effectiveUserContext = { ...req.user, planType: req.tenantConfig?.planType || req.user.planType };
    if (isBasicPlan(effectiveUserContext) && req.user.role !== 'Admin' && req.user.role !== 'SuperAdmin') {
      // Wait, the user said "super admin to be visible only".
      // In Basic plan, there is only 1 super admin.
      // So if I am the super admin loggen in, I should see my own data.
      // If I am a basic user (which shouldn't exist in strict basic plan but might in testing), I should see mine.
      // The requirement "report of super admin to be visible only" implies the logged-in user (who is the super admin) sees their own.
      salespersonId = req.user.employeeId;
    }

    // Actually, looking at the code, existing restriction for Basic Plan allows only 1 Super Admin.
    // So req.user.employeeId IS the super admin's ID.
    // However, if we ever allow other users, this logic holds: restrict to SELF.

    // STRICT interpretation of "super admin visible only":
    // If I am Basic Plan, I pass my own ID.
    if (isBasicPlan(effectiveUserContext)) {
      salespersonId = req.user.employeeId;
    }

    const data = await reportsService.getSalesmanRevenueReport(startDate, endDate, salespersonId);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getSalespersonIncentiveReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const data = await reportsService.getSalespersonIncentiveReport(startDate, endDate);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

