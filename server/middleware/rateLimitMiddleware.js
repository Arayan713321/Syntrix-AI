const rateLimit = require("express-rate-limit");
const { AppError } = require("./errorMiddleware");

/**
 * High-speed rate limiting builder utilizing default scoped IP extraction
 */
const createRateLimiter = (maxRequests = 100, windowMinutes = 15, rateScope = "General") => {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    
    // Explicitly configure validation to suppress trust proxy warnings
    validate: { trustProxy: false },

    // Detailed 429 handler computing dynamic seconds to wait before retry
    handler: (req, res, next) => {
      const resetTime = req.rateLimit?.resetTime;
      const secondsLeft = resetTime ? Math.ceil((new Date(resetTime).getTime() - Date.now()) / 1000) : windowMinutes * 60;
      
      const retryMinutes = Math.ceil(secondsLeft / 60);
      const errMsg = `Rate limit exceeded for ${rateScope}. Please slow down and try again in ${retryMinutes} minute${retryMinutes > 1 ? "s" : ""}.`;
      
      const error = new AppError(errMsg, 429, "RATE_LIMIT_EXCEEDED");
      error.retryAfter = secondsLeft;
      
      next(error);
    },
  });
};

// Configured route group specific limits (Fix 4 requirement)
const resumeLimiter = createRateLimiter(20, 15, "Resume scanner");
const chatLimiter = createRateLimiter(30, 10, "RAG chat advisor");
const interviewLimiter = createRateLimiter(15, 15, "Interview simulator");
const globalFallbackLimiter = createRateLimiter(100, 15, "General API gateway");

module.exports = {
  resumeLimiter,
  chatLimiter,
  interviewLimiter,
  globalFallbackLimiter,
};
