const jwt = require("jsonwebtoken");
const { AppError } = require("./errorMiddleware");
const { readDB } = require("../utils/dbStore");

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "syntrix-ai-super-secret-key-2026";

/**
 * Express middleware to enforce secure JWT verification for protected API endpoints
 */
const protect = (req, res, next) => {
  let token = null;

  // Extract Bearer token from headers
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(new AppError("Not authorized to access this resource. Please authenticate.", 401, "UNAUTHORIZED"));
  }

  // 1. Try NextAuth JWT verification
  try {
    const decoded = jwt.verify(token, NEXTAUTH_SECRET);
    
    // Bind parsed user context to request object (Fix 2 requirement)
    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
    };
    
    return next();
  } catch (error) {
    // 2. Fallback: Try Demo Session token verification (Fix 3 requirement)
    try {
      const db = readDB();
      const demo = db.demoSessions?.find(d => d.token === token);
      if (demo && new Date(demo.expiresAt) > new Date()) {
        req.user = {
          id: demo.userId,
          email: demo.email,
          name: demo.email.split("@")[0],
        };
        return next();
      }
    } catch (dbErr) {
      console.error("[AuthMiddleware] Demo session check error:", dbErr);
    }
    
    return next(new AppError("Session token is invalid or has expired. Please sign in.", 401, "UNAUTHORIZED", error.message));
  }
};

module.exports = {
  protect,
};
