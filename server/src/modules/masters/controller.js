import { MastersService } from './service.js';
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  createUnitSchema,
  updateUnitSchema,
  createCustomerTypeSchema,
  updateCustomerTypeSchema,
  createCustomerSchema,
  updateCustomerSchema,
} from './schema.js';
import logger from '../../config/logger.js';

export class MastersController {
  constructor() {
    this.service = new MastersService();
  }

  // Department endpoints
  getAllDepartments = async (req, res, next) => {
    try {
      const departments = await this.service.getAllDepartments();
      res.json({ success: true, data: departments });
    } catch (error) {
      next(error);
    }
  };

  getDepartmentById = async (req, res, next) => {
    try {
      const departmentId = parseInt(req.params.id);
      const department = await this.service.getDepartmentById(departmentId);
      res.json({ success: true, data: department });
    } catch (error) {
      next(error);
    }
  };

  createDepartment = async (req, res, next) => {
    try {
      logger.info('Create department request:', { body: req.body });
      const validatedData = createDepartmentSchema.parse(req.body);
      logger.info('Validated department data:', validatedData);
      const department = await this.service.createDepartment(validatedData);
      logger.info('Department created successfully:', department);
      res.status(201).json({
        success: true,
        data: department,
        message: 'Department created successfully',
      });
    } catch (error) {
      logger.error('Create department error:', { error: error.message, stack: error.stack });
      next(error);
    }
  };

  updateDepartment = async (req, res, next) => {
    try {
      const departmentId = parseInt(req.params.id);
      logger.info('Update department request:', { id: departmentId, body: req.body });
      const validatedData = updateDepartmentSchema.parse(req.body);
      logger.info('Validated update data:', validatedData);
      const department = await this.service.updateDepartment(departmentId, validatedData);
      logger.info('Department updated successfully:', department);
      res.json({
        success: true,
        data: department,
        message: 'Department updated successfully',
      });
    } catch (error) {
      logger.error('Update department error:', { error: error.message, stack: error.stack });
      next(error);
    }
  };

  deleteDepartment = async (req, res, next) => {
    try {
      const departmentId = parseInt(req.params.id);
      logger.info('Delete department request:', { id: departmentId });
      await this.service.deleteDepartment(departmentId);
      logger.info('Department deleted successfully:', { id: departmentId });
      res.json({
        success: true,
        message: 'Department deleted successfully',
      });
    } catch (error) {
      logger.error('Delete department error:', { error: error.message, stack: error.stack });
      next(error);
    }
  };

  // Unit endpoints
  getAllUnits = async (req, res, next) => {
    try {
      const units = await this.service.getAllUnits();
      res.json({ success: true, data: units });
    } catch (error) {
      next(error);
    }
  };

  getUnitById = async (req, res, next) => {
    try {
      const unitId = parseInt(req.params.id);
      const unit = await this.service.getUnitById(unitId);
      res.json({ success: true, data: unit });
    } catch (error) {
      next(error);
    }
  };

  createUnit = async (req, res, next) => {
    try {
      const validatedData = createUnitSchema.parse(req.body);
      const unit = await this.service.createUnit(validatedData);
      res.status(201).json({
        success: true,
        data: unit,
        message: 'Unit created successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  updateUnit = async (req, res, next) => {
    try {
      const unitId = parseInt(req.params.id);
      const validatedData = updateUnitSchema.parse(req.body);
      const unit = await this.service.updateUnit(unitId, validatedData);
      res.json({
        success: true,
        data: unit,
        message: 'Unit updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  deleteUnit = async (req, res, next) => {
    try {
      const unitId = parseInt(req.params.id);
      await this.service.deleteUnit(unitId);
      res.json({
        success: true,
        message: 'Unit deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  // Customer Type endpoints
  getAllCustomerTypes = async (req, res, next) => {
    try {
      const customerTypes = await this.service.getAllCustomerTypes();
      res.json({ success: true, data: customerTypes });
    } catch (error) {
      next(error);
    }
  };

  getCustomerTypeById = async (req, res, next) => {
    try {
      const customerTypeId = parseInt(req.params.id);
      const customerType = await this.service.getCustomerTypeById(customerTypeId);
      res.json({ success: true, data: customerType });
    } catch (error) {
      next(error);
    }
  };

  createCustomerType = async (req, res, next) => {
    try {
      const validatedData = createCustomerTypeSchema.parse(req.body);
      const customerType = await this.service.createCustomerType(validatedData);
      res.status(201).json({
        success: true,
        data: customerType,
        message: 'Customer type created successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  updateCustomerType = async (req, res, next) => {
    try {
      const customerTypeId = parseInt(req.params.id);
      const validatedData = updateCustomerTypeSchema.parse(req.body);
      const customerType = await this.service.updateCustomerType(customerTypeId, validatedData);
      res.json({
        success: true,
        data: customerType,
        message: 'Customer type updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  deleteCustomerType = async (req, res, next) => {
    try {
      const customerTypeId = parseInt(req.params.id);
      await this.service.deleteCustomerType(customerTypeId);
      res.json({
        success: true,
        message: 'Customer type deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  // Customer endpoints

  /**
   * Get all customers with data scoping
   * Admins see all customers, non-admins see only their own
   */
  getAllCustomers = async (req, res, next) => {
    try {
      const userContext = {
        employeeId: req.user?.employeeId,
        role: req.user?.role,
        isAdmin: ['SuperAdmin'].includes(
          req.user?.role
        ),
        companyName: req.user?.companyName,
      };

      // For non-admin users, apply ownership filtering
      let customers;
      if (userContext.isAdmin) {
        customers = await this.service.getAllCustomers();
      } else {
        customers = await this.service.getCustomersForUser(userContext);
      }

      res.json({ success: true, data: customers });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get customers filtered by user ownership
   * Non-admin sees only customers they created or are assigned to
   */
  getCustomersForUser = async (req, res, next) => {
    try {
      const userContext = {
        employeeId: req.user?.employeeId,
        role: req.user?.role,
        isAdmin: ['SuperAdmin'].includes(
          req.user?.role
        ),
        companyName: req.user?.companyName,
      };
      const customers = await this.service.getCustomersForUser(userContext);
      res.json({ success: true, data: customers });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get active customers with data scoping
   * Admins see all active, non-admins see only their own
   */
  getActiveCustomers = async (req, res, next) => {
    try {
      const userContext = {
        employeeId: req.user?.employeeId,
        role: req.user?.role,
        isAdmin: ['SuperAdmin'].includes(
          req.user?.role
        ),
        companyName: req.user?.companyName,
      };

      let customers;
      if (userContext.isAdmin) {
        customers = await this.service.getActiveCustomers();
      } else {
        // For non-admin, get their customers and filter active ones
        const allCustomers = await this.service.getCustomersForUser(userContext);
        customers = allCustomers.filter(c => c.IsActive !== false);
      }

      res.json({ success: true, data: customers });
    } catch (error) {
      next(error);
    }
  };

  getCustomerById = async (req, res, next) => {
    try {
      const customerId = parseInt(req.params.id);
      const customer = await this.service.getCustomerById(customerId);
      res.json({ success: true, data: customer });
    } catch (error) {
      next(error);
    }
  };

  createCustomer = async (req, res, next) => {
    try {
      logger.info('Create customer request:', { body: req.body, user: req.user });
      const validatedData = createCustomerSchema.parse(req.body);

      // Inject createdBy from authenticated user
      validatedData.CreatedBy = req.user?.employeeId || null;

      logger.info('Validated customer data with createdBy:', validatedData);
      const customer = await this.service.createCustomer(validatedData);
      logger.info('Customer created successfully:', customer);
      res.status(201).json({
        success: true,
        data: customer,
        message: 'Customer created successfully',
      });
    } catch (error) {
      logger.error('Create customer error:', { error: error.message, stack: error.stack });
      next(error);
    }
  };

  updateCustomer = async (req, res, next) => {
    try {
      const customerId = parseInt(req.params.id);
      const validatedData = updateCustomerSchema.parse(req.body);
      const customer = await this.service.updateCustomer(customerId, validatedData);
      res.json({
        success: true,
        data: customer,
        message: 'Customer updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  deleteCustomer = async (req, res, next) => {
    try {
      const customerId = parseInt(req.params.id);
      await this.service.deleteCustomer(customerId);
      res.json({
        success: true,
        message: 'Customer deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Transfer customer ownership to a new salesperson
   * Admin-only endpoint
   */
  transferCustomer = async (req, res, next) => {
    try {
      const customerId = parseInt(req.params.id);
      const { newSalesPersonId } = req.body;

      if (!newSalesPersonId) {
        return res.status(400).json({
          success: false,
          message: 'newSalesPersonId is required',
        });
      }

      logger.info('Customer transfer request:', {
        customerId,
        newSalesPersonId,
        requestedBy: req.user?.employeeId,
      });

      const result = await this.service.transferCustomer(customerId, parseInt(newSalesPersonId));

      res.json({
        success: true,
        data: result,
        message: `Customer transferred successfully. ${result.ordersTransferred} orders also transferred.`,
      });
    } catch (error) {
      logger.error('Transfer customer error:', { error: error.message, stack: error.stack });
      next(error);
    }
  };

  // Role endpoints
  getAllRoles = async (req, res, next) => {
    try {
      const roles = await this.service.getAllRoles();
      res.json({ success: true, data: roles });
    } catch (error) {
      next(error);
    }
  };

  getRoleById = async (req, res, next) => {
    try {
      const roleId = parseInt(req.params.id);
      const role = await this.service.getRoleById(roleId);
      res.json({ success: true, data: role });
    } catch (error) {
      next(error);
    }
  };

  createRole = async (req, res, next) => {
    try {
      logger.info('Create role request:', { body: req.body });
      const role = await this.service.createRole(req.body);
      logger.info('Role created successfully:', role);
      res.status(201).json({
        success: true,
        data: role,
        message: 'Role created successfully',
      });
    } catch (error) {
      logger.error('Create role error:', { error: error.message, stack: error.stack });
      next(error);
    }
  };

  updateRole = async (req, res, next) => {
    try {
      const roleId = parseInt(req.params.id);
      logger.info('Update role request:', { id: roleId, body: req.body });
      const role = await this.service.updateRole(roleId, req.body);
      logger.info('Role updated successfully:', role);
      res.json({
        success: true,
        data: role,
        message: 'Role updated successfully',
      });
    } catch (error) {
      logger.error('Update role error:', { error: error.message, stack: error.stack });
      next(error);
    }
  };

  deleteRole = async (req, res, next) => {
    try {
      const roleId = parseInt(req.params.id);
      logger.info('Delete role request:', { id: roleId });
      await this.service.deleteRole(roleId);
      logger.info('Role deleted successfully:', { id: roleId });
      res.json({
        success: true,
        message: 'Role deleted successfully',
      });
    } catch (error) {
      logger.error('Delete role error:', { error: error.message, stack: error.stack });
      next(error);
    }
  };
}

export const mastersController = new MastersController();
