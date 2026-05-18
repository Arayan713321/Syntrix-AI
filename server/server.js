const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

// 1. Startup Environment Validation
const validateEnv = require("./utils/envValidator");
validateEnv();

// Startup JWT Secret Check (Audit 1 requirement)
console.log("[Auth] JWT secret loaded:", !!process.env.NEXTAUTH_SECRET);

// Startup ChromaDB connectivity check
const { getChromaStatus, checkConnection } = require("./services/ragService");
checkConnection().catch(() => {});

const resumeRoutes = require("./routes/resumeRoutes");
const interviewRoutes = require("./routes/interviewRoutes");
const { errorHandler } = require("./middleware/errorMiddleware");

const app = express();

// Trust Proxy Configuration for production behind reverse-proxies (Audit 4 requirement)
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// 2. Helmet Security Headers with custom Content Security Policy (Audit 1 requirement)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: [
          "'self'", 
          "http://localhost:3000", 
          "http://127.0.0.1:3000", 
          "https://api.openai.com"
        ],
      },
    },
  })
);

// 3. Optimized CORS Configuration
const allowedOrigins = [
  "http://localhost:3000",
  "https://syntrix-ai.vercel.app",
  "https://syntrix-ai-nu.vercel.app",
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS policy violation"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const { globalFallbackLimiter } = require("./middleware/rateLimitMiddleware");

// 4. Public Health Check Endpoint (Audit 3 requirement)
app.get("/api/health", async (req, res) => {
  let dbStatus = "healthy";
  try {
    const { readDB } = require("./utils/dbStore");
    readDB();
  } catch (error) {
    dbStatus = "degraded";
  }

  // Actively ping ChromaDB each time health is called (Fix 4)
  const startTime = Date.now();
  let chromaStatus = "fallback";
  let chromaLatency = null;
  
  try {
    const { ChromaClient } = require("chromadb");
    const CHROMA_URL = process.env.CHROMA_URL || "http://localhost:8000";
    const pingClient = new ChromaClient({ path: CHROMA_URL });
    await pingClient.listCollections();
    chromaStatus = "connected";
    chromaLatency = `${Date.now() - startTime}ms`;
  } catch (e) {
    chromaStatus = "fallback";
  }

  res.status(200).json({
    status: "ok",
    dbStatus,
    chromaStatus,
    chromaLatency,
    uptime: process.uptime(),
  });
});

// 5. Routing mounts
app.use("/api", globalFallbackLimiter);

// 5.1 Custom Magic Demo Session endpoint
app.post("/api/auth/demo-session", async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Missing email address." });
    }

    const userId = `demo_${Date.now()}`;
    const jwt = require("jsonwebtoken");
    const secret = process.env.NEXTAUTH_SECRET || "syntrix-ai-super-secret-key-2026";
    
    const token = jwt.sign(
      { sub: userId, email: email.trim().toLowerCase(), name: "Demo User" },
      secret,
      { expiresIn: "24h" }
    );

    const { readDB, writeDB } = require("./utils/dbStore");
    const db = readDB();
    if (!db.demoSessions) {
      db.demoSessions = {};
    }

    // Clean up expired demo sessions periodically
    const now = Date.now();
    for (const key in db.demoSessions) {
      if (db.demoSessions[key].expiresAt < now) {
        delete db.demoSessions[key];
      }
    }

    db.demoSessions[token] = {
      user: { id: userId, email: email.trim().toLowerCase(), name: "Demo User" },
      expiresAt: now + 24 * 60 * 60 * 1000
    };

    await writeDB(db);

    console.log(`[Auth] Demo session created for ${email}. Token: ${token.substring(0, 20)}...`);

    res.status(200).json({
      success: true,
      token,
      apiToken: token,
      email,
      expiresAt: new Date(now + 24 * 60 * 60 * 1000).toISOString()
    });
  } catch (error) {
    next(error);
  }
});

app.use("/api/resume", resumeRoutes);
app.use("/api/interview", interviewRoutes);

// 6. Centralized Error Middleware (must be registered last!)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Production-grade Server running on port ${PORT} [Mode: ${process.env.NODE_ENV}]`);
  console.log("[ENV] NODE_ENV:", process.env.NODE_ENV);
  console.log("[ENV] FRONTEND_URL:", process.env.FRONTEND_URL);
  console.log("[ENV] NEXTAUTH_SECRET set:", !!process.env.NEXTAUTH_SECRET);
  console.log("[ENV] OPENAI_API_KEY set:", !!process.env.OPENAI_API_KEY);
});
