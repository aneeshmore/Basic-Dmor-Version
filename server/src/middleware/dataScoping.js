/**
 * Data Scoping Middleware
 *
 * Provides role-based data scoping for API endpoints.
 * Non-admin users (especially salespersons) only see data they own.
 * Admins and SuperAdmins see all data.
 */

import logger from '../config/logger.js';

// Roles that have full data access
const ADMIN_ROLES = ['SuperAdmin', 'Admin', 'Accounts Manager', 'Production Manager'];

/**
 * Check if user has admin privileges (can see all data)
 * @param {Object} user - User object from req.user
 * @returns {boolean}
 */
export function isAdmin(user) {
  if (!user) return false;
  const role = user.role || user.Role;
  if (!role) return false;

  // Normalize both to lowercase for comparison
  const roleLower = role.toLowerCase();
  const adminRolesLower = ADMIN_ROLES.map(r => r.toLowerCase());

  return adminRolesLower.includes(roleLower);
}

/**
 * Check if user is a salesperson (based on role's isSalesRole flag)
 * @param {Object} user - User object from req.user
 * @returns {boolean}
 */
export function isSalesPerson(user) {
  if (!user) return false;
  // Check the isSalesRole flag from the user token (set during login based on role)
  return user.isSalesRole === true || user.IsSalesRole === true;
}

/**
 * Build user context object for data filtering
 * @param {Object} req - Express request object
 * @returns {Object} User context with employeeId, role, isAdmin flags
 */
export function getUserContext(req) {
  const user = req.user;
  if (!user) {
    return {
      employeeId: null,
      role: null,
      isAdmin: false,
      isSalesPerson: false,
      isAuthenticated: false,
    };
  }

  return {
    employeeId: user.employeeId || user.EmployeeID,
    role: user.role || user.Role,
    isAdmin: isAdmin(user),
    isSalesPerson: isSalesPerson(user),
    isAuthenticated: true,
  };
}

/**
 * Middleware that injects user context into request
 * Use this before controllers that need data scoping
 */
export function injectUserContext(req, res, next) {
  req.userContext = getUserContext(req);
  logger.debug('User context injected', {
    employeeId: req.userContext.employeeId,
    role: req.userContext.role,
    isAdmin: req.userContext.isAdmin,
  });
  next();
}

/**
 * Build SQL filter conditions based on user context
 * @param {Object} userContext - From getUserContext
 * @param {string} createdByField - Name of createdBy column
 * @param {string} ownerField - Name of owner/salesperson column (optional)
 * @returns {Object|null} Filter conditions or null if no filter needed
 */
export function buildOwnershipFilter(userContext, options = {}) {
  // Admins see all data
  if (userContext.isAdmin) {
    return null;
  }

  // Non-admin must have an employeeId
  if (!userContext.employeeId) {
    logger.warn('Non-admin user without employeeId attempted data access');
    return { deny: true };
  }

  return {
    employeeId: userContext.employeeId,
    filterBy: ['createdBy', 'salesPersonId', 'salespersonId', 'assignedTo'],
  };
}

export default {
  isAdmin,
  isSalesPerson,
  getUserContext,
  injectUserContext,
  buildOwnershipFilter,
};
