/**
 * AutoCare AI - Authentication & Authorization Middleware
 * Validates stateless JWT and enforces role-based access control
 */

const jwt = require('jsonwebtoken');
const { UnauthorizedError, ForbiddenError } = require('./errorHandler');

const JWT_SECRET = process.env.JWT_SECRET || '404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970';

/**
 * Middleware: Verifies JWT in Authorization Bearer header
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return next(new UnauthorizedError('Full authentication is required to access this resource'));
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return next(new UnauthorizedError('Malformed Authorization header. Format must be: Bearer <token>'));
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      userId: decoded.userId,
      workshopId: decoded.workshopId,
      role: decoded.role,
      email: decoded.sub || decoded.email
    };
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware: Restricts route to specific user roles
 * @param  {...string} allowedRoles - e.g. 'ADMIN', 'MECHANIC', 'CUSTOMER'
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError('Access denied: You do not have permission for this resource'));
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  requireRole
};
