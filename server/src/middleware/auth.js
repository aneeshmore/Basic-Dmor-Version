import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from '../utils/AppError.js';
import logger from '../config/logger.js';

// ============================================
// JWT SECRET VALIDATION (Fail-Fast)
// ============================================
export const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  logger.error('FATAL: JWT_SECRET environment variable is not set');
  throw new Error('JWT_SECRET environment variable is required. Set it in your .env file.');
}

if (JWT_SECRET.length < 32) {
  logger.error('FATAL: JWT_SECRET must be at least 32 characters for security');
  throw new Error('JWT_SECRET must be at least 32 characters long.');
}

logger.info('JWT secret validated successfully');

/**
 * Authentication middleware
 * Verifies JWT token and adds user info to request
 * Checks both Authorization header and httpOnly cookie
 */
export const authenticate = (req, res, next) => {
  try {
    let token = null;

    // Try Authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // Fallback to httpOnly cookie
    if (!token && req.cookies && req.cookies.auth_token) {
      token = req.cookies.auth_token;
    }

    if (!token) {
      throw new UnauthorizedError('Access token required');
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Add user info to request object
    req.user = {
      employeeId: decoded.employeeId,
      username: decoded.username,
      role: decoded.role,
      planType: decoded.planType,
      companyName: decoded.companyName,
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      logger.warn('Invalid JWT token', { error: error.message });
      return next(new UnauthorizedError('Invalid token'));
    }

    if (error.name === 'TokenExpiredError') {
      logger.warn('Expired JWT token');
      return next(new UnauthorizedError('Token expired'));
    }

    next(error);
  }
};

/**
 * Authorization middleware
 * Checks if user has required role
 * Must be placed after authenticate middleware
 */
export const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Not authenticated'));
    }

    // req.user.role might be a string (e.g. 'Admin') or ID.
    // If it's a string from JWT payload:
    if (roles.length && !roles.includes(req.user.role)) {
      return next(new ForbiddenError('Access denied: Insufficient permissions'));
    }

    next();
  };
};
