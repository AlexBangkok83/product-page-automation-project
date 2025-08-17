// Comprehensive error handling middleware

class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

    Error.captureStackTrace(this, this.constructor);
  }
}

// Development error handler - detailed error info
const handleDevError = (err, req, res) => {
  console.error('💥 ERROR STACK:', err.stack);
  
  if (req.originalUrl.startsWith('/api/')) {
    // API error response
    return res.status(err.statusCode || 500).json({
      error: err.message,
      status: err.status || 'error',
      stack: err.stack,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method
    });
  }
  
  // Web page error response
  res.status(err.statusCode || 500).render('error', {
    title: 'Error',
    message: err.message,
    error: err, // Show full error in development
    statusCode: err.statusCode || 500
  });
};

// Production error handler - sanitized error info
const handleProdError = (err, req, res) => {
  // Only log unexpected errors
  if (!err.isOperational) {
    console.error('💥 UNEXPECTED ERROR:', err);
  }
  
  if (req.originalUrl.startsWith('/api/')) {
    // API error response
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        error: err.message,
        status: err.status,
        timestamp: new Date().toISOString()
      });
    }
    
    // Don't leak error details in production
    return res.status(500).json({
      error: 'Something went wrong!',
      status: 'error',
      timestamp: new Date().toISOString()
    });
  }
  
  // Web page error response
  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      title: 'Error',
      message: err.message,
      statusCode: err.statusCode
    });
  }
  
  // Generic error page for unexpected errors
  res.status(500).render('error', {
    title: 'Error',
    message: 'Something went wrong!',
    statusCode: 500
  });
};

// Handle specific error types
const handleDatabaseError = (err) => {
  let message = 'Database operation failed';
  let statusCode = 500;
  
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    message = 'A record with this information already exists';
    statusCode = 409;
  } else if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    message = 'Referenced record does not exist';
    statusCode = 400;
  } else if (err.code === 'SQLITE_CONSTRAINT_NOTNULL') {
    message = 'Required field is missing';
    statusCode = 400;
  }
  
  return new AppError(message, statusCode);
};

const handleValidationError = (err) => {
  const message = `Invalid input data: ${err.message}`;
  return new AppError(message, 400);
};

const handleJSONError = (err) => {
  const message = 'Invalid JSON format in request body';
  return new AppError(message, 400);
};

// Async error wrapper for route handlers
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// Main error handling middleware
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  
  // Handle specific error types
  let error = { ...err };
  error.message = err.message;
  
  // SQLite errors
  if (err.code && err.code.startsWith('SQLITE_')) {
    error = handleDatabaseError(err);
  }
  
  // Validation errors
  if (err.name === 'ValidationError') {
    error = handleValidationError(err);
  }
  
  // JSON parsing errors
  if (err.type === 'entity.parse.failed') {
    error = handleJSONError(err);
  }
  
  // Environment-specific error handling
  if (process.env.NODE_ENV === 'development') {
    handleDevError(error, req, res);
  } else {
    handleProdError(error, req, res);
  }
};

// 404 handler for unmatched routes
const notFoundHandler = (req, res, next) => {
  const message = `Route ${req.originalUrl} not found`;
  const err = new AppError(message, 404);
  next(err);
};

// Uncaught exception handler
const handleUncaughtException = () => {
  process.on('uncaughtException', (err) => {
    console.error('💥 UNCAUGHT EXCEPTION! Shutting down...');
    console.error(err.name, err.message);
    console.error(err.stack);
    process.exit(1);
  });
};

// Unhandled rejection handler
const handleUnhandledRejection = (server) => {
  process.on('unhandledRejection', (err) => {
    console.error('💥 UNHANDLED REJECTION! Shutting down...');
    console.error(err.name, err.message);
    server.close(() => {
      process.exit(1);
    });
  });
};

module.exports = {
  AppError,
  globalErrorHandler,
  notFoundHandler,
  catchAsync,
  handleUncaughtException,
  handleUnhandledRejection
};