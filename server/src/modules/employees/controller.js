import { EmployeesService } from './service.js';
import { createEmployeeSchema, updateEmployeeSchema } from './schema.js';
import logger from '../../config/logger.js';

export class EmployeesController {
  constructor() {
    this.service = new EmployeesService();
  }

  getAllEmployees = async (req, res, next) => {
    try {
      // If includeInactive is explicitly true, return all statuses; otherwise default to Active
      const filters = {
        status: req.query.includeInactive === 'true' ? undefined : 'Active',
        departmentId: req.query.departmentId ? parseInt(req.query.departmentId) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset) : undefined,
      };

      // Get user context for data scoping
      const { getUserContext } = await import('../../middleware/dataScoping.js');
      const userContext = getUserContext(req);

      const employees = await this.service.getAllEmployees(filters, userContext);

      res.json({
        success: true,
        data: employees,
      });
    } catch (error) {
      next(error);
    }
  };

  getSalesPersons = async (req, res, next) => {
    try {
      // Get effective permissions to check for view_all_sales_persons
      const { getEffectivePermissions } = await import('../../middleware/requirePermission.js');
      const permissions = await getEffectivePermissions(req.user.employeeId);
      const canViewAllSalesPersons = permissions.includes('GET:view_all_sales_persons');

      const userContext = {
        employeeId: req.user?.employeeId,
        role: req.user?.role,
        isAdmin:
          ['Admin', 'SuperAdmin', 'Accounts Manager', 'Production Manager'].includes(
            req.user?.role
          ) || canViewAllSalesPersons,
      };

      const salesPersons = await this.service.getSalesPersons(userContext);
      res.json({
        success: true,
        data: salesPersons,
      });
    } catch (error) {
      next(error);
    }
  };

  getEmployeeById = async (req, res, next) => {
    try {
      const employeeId = parseInt(req.params.id);
      const employee = await this.service.getEmployeeById(employeeId);

      res.json({
        success: true,
        data: employee,
      });
    } catch (error) {
      next(error);
    }
  };

  createEmployee = async (req, res, next) => {
    try {
      const validatedData = createEmployeeSchema.parse(req.body);
      const employee = await this.service.createEmployee(validatedData);

      logger.info('Employee created', { employeeId: employee.employeeId });

      res.status(201).json({
        success: true,
        data: employee,
      });
    } catch (error) {
      next(error);
    }
  };

  updateEmployee = async (req, res, next) => {
    try {
      const employeeId = parseInt(req.params.id);
      const validatedData = updateEmployeeSchema.parse(req.body);

      const employee = await this.service.updateEmployee(employeeId, validatedData);

      logger.info('Employee updated', { employeeId });

      res.json({
        success: true,
        data: employee,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteEmployee = async (req, res, next) => {
    try {
      const employeeId = parseInt(req.params.id);
      await this.service.deleteEmployee(employeeId);

      logger.info('Employee status toggled', { employeeId });

      res.json({
        success: true,
        message: 'Employee status toggled successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}
