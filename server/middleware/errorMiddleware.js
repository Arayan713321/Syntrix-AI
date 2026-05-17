// Centralized error-handling middleware
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  console.error(`[ERROR] ${req.method} ${req.url} - Status: ${statusCode}`);
  console.error(err.stack);

  res.status(statusCode).json({
    success: false,
    data: null,
    error: {
      message,
      code: err.code || "INTERNAL_ERROR",
      details: err.details || null,
    },
    meta: {
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
    },
  });
};

// Async wrapper helper to avoid try/catch boilerplate in controllers
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

class AppError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR", details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  errorHandler,
  asyncHandler,
  AppError,
};
