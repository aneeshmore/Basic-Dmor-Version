import { QuotationsService } from './service.js';

export class QuotationsController {
  constructor() {
    this.service = new QuotationsService();
  }

  createQuotation = async (req, res, next) => {
    try {
      // Add user ID if authenticated
      const data = {
        ...req.body,
        createdBy: req.user?.employeeId || req.user?.EmployeeID || null,
      };

      const planType = req.tenantConfig?.planType || 'basic';
      const quotation = await this.service.createQuotation(data, planType);
      res.status(201).json({ success: true, data: quotation });
    } catch (error) {
      next(error);
    }
  };

  getAllQuotations = async (req, res, next) => {
    try {
      const { customerId } = req.query;
      const user = req.user;

      // Determine if user is admin/superadmin (can see all quotations)
      const isAdmin = ['Admin', 'SuperAdmin', 'Accounts Manager', 'Production Manager'].includes(
        user?.role
      );
      const userId = user?.employeeId || user?.EmployeeID;

      const quotations = await this.service.getAllQuotations(
        customerId ? parseInt(customerId) : null,
        isAdmin ? null : userId // Pass userId for filtering if not admin
      );
      res.json({ success: true, data: quotations });
    } catch (error) {
      next(error);
    }
  };

  updateStatus = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status, rejectionRemark } = req.body;
      const updated = await this.service.updateStatus(parseInt(id), status, rejectionRemark);
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  };

  approveQuotation = async (req, res, next) => {
    try {
      const { id } = req.params;
      const updated = await this.service.approveQuotation(parseInt(id));
      res.json({ success: true, data: updated, message: 'Quotation approved successfully' });
    } catch (error) {
      next(error);
    }
  };

  rejectQuotation = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { remark } = req.body;

      if (!remark || !remark.trim()) {
        return res.status(400).json({ success: false, error: 'Rejection remark is required' });
      }

      const updated = await this.service.rejectQuotation(parseInt(id), remark.trim());
      res.json({ success: true, data: updated, message: 'Quotation rejected' });
    } catch (error) {
      next(error);
    }
  };

  convertOrder = async (req, res, next) => {
    try {
      const { id } = req.params;
      const user = req.user;
      const isAdmin = ['Admin', 'SuperAdmin', 'Accounts Manager', 'Production Manager'].includes(
        user?.role
      );
      const userId = user?.employeeId || user?.EmployeeID;

      const order = await this.service.convertToOrder(
        parseInt(id),
        { isAdmin, userId } // Pass user context for ownership check
      );
      res.json({ success: true, data: order, message: 'Order created from quotation' });
    } catch (error) {
      next(error);
    }
  };

  updateQuotation = async (req, res, next) => {
    try {
      const { id } = req.params;
      const user = req.user;
      const isAdmin = ['Admin', 'SuperAdmin', 'Accounts Manager', 'Production Manager'].includes(
        user?.role
      );
      const userId = user?.employeeId || user?.EmployeeID;

      const updated = await this.service.updateQuotation(
        parseInt(id),
        req.body,
        parseInt(id),
        req.body,
        { isAdmin, userId }, // Pass user context for ownership check
        req.tenantConfig?.planType || 'basic'
      );
      res.json({
        success: true,
        data: updated,
        message: 'Quotation updated and resubmitted for approval',
      });
    } catch (error) {
      next(error);
    }
  };
}
