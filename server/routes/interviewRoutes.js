const express = require("express");
const { 
  createSession, 
  submitSessionAnswer, 
  getSessionState, 
  getUserSessions 
} = require("../controllers/interviewController");

const { interviewLimiter } = require("../middleware/rateLimitMiddleware");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Mount protected session endpoints with rate limits (Fix 3 & 4 requirement)
router.post(
  "/session", 
  protect,
  interviewLimiter, 
  createSession
);

router.post(
  "/session/:id/answer", 
  protect,
  interviewLimiter, 
  submitSessionAnswer
);

router.get(
  "/session/:id", 
  protect,
  interviewLimiter, 
  getSessionState
);

router.get(
  "/sessions", 
  protect,
  interviewLimiter, 
  getUserSessions
);

module.exports = router;
