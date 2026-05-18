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

  console.log("[Auth] Token received:", !!token);

  if (!token) {
    return next(new AppError("Not authorized to access this resource. Please authenticate.", 401, "UNAUTHORIZED"));
  }

  let decoded = null;

  // 1. Try NextAuth JWT verification
  try {
    decoded = jwt.verify(token, NEXTAUTH_SECRET);
    console.log("[Auth] Verification result:", !!decoded);
    
    // Bind parsed user context to request object (Fix 2 requirement)
    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
    };
    
    return next();
  } catch (error) {
    console.log("[Auth] JWT verification failed, attempting fallback:", error.message);
    
    // 2. Fallback: Treat token as user sub or look it up in db.demoSessions
    try {
      const db = readDB();
      
      // Look up by token or look up by email match
      const demo = db.demoSessions?.find(d => d.token === token);
      if (demo && new Date(demo.expiresAt) > new Date()) {
        console.log("[Auth] Verification result (Demo fallback): true");
        req.user = {
          id: demo.userId,
          email: demo.email,
          name: demo.email.split("@")[0],
        };
        return next();
      }
      
      // Or if token matches a userId from our demo sessions (fallback for when sub/userId is sent directly)
      const demoUserBySub = db.demoSessions?.find(d => d.userId === token);
      if (demoUserBySub && new Date(demoUserBySub.expiresAt) > new Date()) {
        console.log("[Auth] Verification result (Demo user by sub): true");
        req.user = {
          id: demoUserBySub.userId,
          email: demoUserBySub.email,
          name: demoUserBySub.email.split("@")[0],
        };
        return next();
      }
    } catch (dbErr) {
      console.error("[AuthMiddleware] Demo session check error:", dbErr);
    }
    
    console.log("[Auth] Verification result: false");
    return next(new AppError("Session token is invalid or has expired. Please sign in.", 401, "UNAUTHORIZED", error.message));
  }
};

module.exports = {
  protect,
};
