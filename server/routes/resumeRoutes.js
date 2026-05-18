const express = require("express");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

const { 
  uploadResume, 
  matchJD, 
  chatRAG, 
  getResumeHistory, 
  getResumeById 
} = require("../controllers/resumeController");

const validateRequest = require("../middleware/validationMiddleware");
const { matchJDSchema, chatSchema } = require("../utils/validationSchemas");
const { resumeLimiter, chatLimiter } = require("../middleware/rateLimitMiddleware");
const { protect } = require("../middleware/authMiddleware");

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "syntrix-ai-super-secret-key-2026";
const router = express.Router();

// Multer Disk storage configuration dynamically namespaced by active authenticated userId (Fix 6 requirement)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let userId = "default-user";
    try {
      // Decode user context from Bearer token
      if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, NEXTAUTH_SECRET);
        userId = decoded.id || "default-user";
      }
    } catch (err) {
      console.warn("Could not determine user folder from upload session:", err.message);
    }

    // Resolve directories safely to prevent path traversal attempts (Audit 1 requirement)
    const baseDir = process.env.NODE_ENV === "production" 
      ? "/tmp/uploads" 
      : path.resolve(__dirname, "../uploads");
      
    const userDir = path.resolve(baseDir, userId);

    if (!userDir.startsWith(baseDir)) {
      return cb(new Error("Security Error: Path traversal attempt detected."), null);
    }

    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: function (req, file, cb) {
    // Sanitize filename before saving: replace all non-alphanumeric chars except dash/underscore/dot
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9\-_\.]/g, "_");
    cb(null, `${Date.now()}-${sanitized}`);
  },
});

// File filter to restrict uploads to PDF only (Audit 1 requirement)
const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Security Error: Only PDF documents are supported."), false);
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // Cap file size at 5MB (Audit 1 requirement)
});

// Protected endpoints with rate limiters, validations and auth check
router.post(
  "/upload", 
  protect,
  resumeLimiter, 
  upload.single("resume"), 
  uploadResume
);

router.post(
  "/match-jd", 
  protect,
  resumeLimiter, 
  validateRequest(matchJDSchema), 
  matchJD
);

router.post(
  "/chat", 
  protect,
  chatLimiter, 
  validateRequest(chatSchema), 
  chatRAG
);

router.get(
  "/history",
  protect,
  resumeLimiter,
  getResumeHistory
);

router.get(
  "/:id",
  protect,
  resumeLimiter,
  getResumeById
);

module.exports = router;
