const jwt = require("jsonwebtoken");
const { readDB } = require("../utils/dbStore");

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: { message: "Not authorized", code: "UNAUTHORIZED" }
      });
    }
    const token = authHeader.split(" ")[1];

    console.log("[Auth] Token received:", !!token);

    // Try NextAuth JWT first
    try {
      const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET || "syntrix-ai-super-secret-key-2026");
      console.log("[Auth] Verification result:", !!decoded);
      req.user = {
        id: decoded.sub || decoded.id,
        email: decoded.email,
        name: decoded.name
      };
      return next();
    } catch (jwtError) {
      console.log("[Auth] JWT verification failed, attempting fallback:", jwtError.message);
      
      // Try demo session token
      const db = await readDB();
      const demoSession = db.demoSessions?.[token];
      if (demoSession && demoSession.expiresAt > Date.now()) {
        console.log("[Auth] Verification result (Demo fallback): true");
        req.user = demoSession.user;
        return next();
      }

      // Try demo session by user ID fallback
      const demoUserBySub = Object.values(db.demoSessions || {}).find(d => d.user?.id === token);
      if (demoUserBySub && demoUserBySub.expiresAt > Date.now()) {
        console.log("[Auth] Verification result (Demo user by sub): true");
        req.user = demoUserBySub.user;
        return next();
      }

      console.log("[Auth] Verification result: false");
      return res.status(401).json({
        success: false,
        error: { message: "Invalid or expired token", code: "UNAUTHORIZED" }
      });
    }
  } catch (error) {
    console.error("[Auth] Overall auth error:", error);
    return res.status(401).json({
      success: false,
      error: { message: "Auth error", code: "UNAUTHORIZED" }
    });
  }
};

module.exports = {
  protect,
};
