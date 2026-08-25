/**
 * AutoCare AI - Global Error Handler & Custom Exception Classes
 * Matches Spring Boot ErrorResponse and frontend ApiError contracts
 */

class AppError extends Error {
  constructor(message, statusCode = 500, errorName = 'Internal Server Error', validationErrors = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.errorName = errorName;
    this.validationErrors = validationErrors;
    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Bad Request', validationErrors = undefined) {
    super(message, 400, 'Bad Request', validationErrors);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'Unauthorized');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'Forbidden');
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource Not Found') {
    super(message, 404, 'Not Found');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflict occurred') {
    super(message, 409, 'Conflict');
  }
}

/**
 * Global Express Error Handling Middleware
 */
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let errorName = err.errorName || 'Internal Server Error';
  let message = err.message || 'An unexpected server error occurred.';
  let validationErrors = err.validationErrors;

  // Handle MySQL Duplicate Key Constraint (Code 1062 / ER_DUP_ENTRY)
  if (err.code === 'ER_DUP_ENTRY' || (err.errno && err.errno === 1062)) {
    statusCode = 409;
    errorName = 'Conflict';
    if (err.sqlMessage && err.sqlMessage.includes('uq_user_email')) {
      message = 'An account with this email already exists.';
    } else if (err.sqlMessage && err.sqlMessage.includes('uq_workshop_access_code')) {
      message = 'Workshop access code is already in use.';
    } else if (err.sqlMessage && err.sqlMessage.includes('uq_vehicle_vin')) {
      message = 'A vehicle with this VIN is already registered.';
    } else if (err.sqlMessage && err.sqlMessage.includes('uq_mechanic_employee_code')) {
      message = 'Employee badge code is already in use.';
    } else {
      message = 'A resource with duplicate unique attributes already exists.';
    }
  }

  // Handle JWT Verification Errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorName = 'Unauthorized';
    message = 'Invalid authentication token signature.';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorName = 'Unauthorized';
    message = 'Authentication token has expired. Please log in again.';
  }

  if (statusCode >= 500) {
    console.error('[Unhandled Error]:', err);
  }

  const responseBody = {
    timestamp: new Date().toISOString(),
    status: statusCode,
    error: errorName,
    message: message,
    path: req.originalUrl || req.url
  };

  if (validationErrors) {
    responseBody.validationErrors = validationErrors;
  }

  res.status(statusCode).json(responseBody);
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  errorHandler
};
