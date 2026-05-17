const { generateInterviewQuestions, evaluateAnswer } = require("../services/interviewService");
const { asyncHandler, AppError } = require("../middleware/errorMiddleware");
const { readDB, writeDB } = require("../utils/dbStore");

/**
 * Create a new persistent interview simulator session (Fix 1.1)
 */
const createSession = asyncHandler(async (req, res, next) => {
  const { resumeText, jdText, type = "Technical", role = "Software Engineer" } = req.body;

  if (!resumeText) {
    throw new AppError("Missing resumeText to generate tailored interview questions.", 400, "BAD_REQUEST");
  }

  let interviewData = null;
  try {
    // Generate tailored interview questions via quality model gpt-4o (Audit 6)
    interviewData = await generateInterviewQuestions(resumeText, jdText, type, role);
  } catch (error) {
    throw new AppError("Failed to generate interview questions.", 502, "AI_SERVICE_ERROR", error.message);
  }

  const sessionId = `sess_${Date.now()}`;
  const db = readDB();
  
  const newSession = {
    id: sessionId,
    userId: req.user.id,
    questions: interviewData.questions || [],
    totalQuestions: (interviewData.questions || []).length,
    type,
    role,
    answers: {},            // Record<questionId, answerText>
    evaluations: {},        // Record<questionId, evaluationObj>
    currentQuestionIndex: 0,
    isComplete: false,
    createdAt: new Date().toISOString(),
  };

  db.interviewSessions.push(newSession);
  await writeDB(db); // Await async mutex lock

  console.log(`[Interview] Session created: ${sessionId}`);

  res.status(201).json({
    success: true,
    data: {
      sessionId,
      questions: newSession.questions,
      totalQuestions: newSession.totalQuestions,
      type: newSession.type,
      role: newSession.role
    },
    error: null,
    meta: {
      timestamp: new Date().toISOString(),
      service: "Syntrix Interview Session Starter",
    },
  });
});

/**
 * Submit and grade a single session answer, saving it to disk (Fix 1.3)
 */
const submitSessionAnswer = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { questionId, answerText, question } = req.body;

  if (!question || !answerText || questionId === undefined) {
    throw new AppError("Missing question, answerText or questionId parameters.", 400, "BAD_REQUEST");
  }

  const db = readDB();
  const session = db.interviewSessions.find(s => s.id === id && s.userId === req.user.id);
  if (!session) {
    throw new AppError("Interview session not found or access denied.", 404, "NOT_FOUND");
  }

  let evaluation = null;
  try {
    // Grade the candidate response using standard gpt-4o (Audit 6)
    evaluation = await evaluateAnswer(question, answerText);
  } catch (error) {
    throw new AppError("Failed to grade response.", 502, "AI_SERVICE_ERROR", error.message);
  }

  // Persist response and AI evaluation to database
  session.answers[questionId] = answerText;
  session.evaluations[questionId] = evaluation;

  // Progress the cursor index or flag complete
  if (session.currentQuestionIndex < session.questions.length - 1) {
    session.currentQuestionIndex += 1;
  } else {
    session.isComplete = true;
  }

  await writeDB(db); // Await async mutex lock

  console.log(`[InterviewController] POST /api/interview/session/${id}/answer - Evaluation registered for questionId: ${questionId}`);

  res.status(200).json({
    success: true,
    data: {
      evaluation,
      currentQuestionIndex: session.currentQuestionIndex,
      isComplete: session.isComplete,
    },
    error: null,
    meta: {
      timestamp: new Date().toISOString(),
      service: "Syntrix Session Answer Grader",
    },
  });
});

/**
 * Retrieve current state for an active/past session
 */
const getSessionState = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const db = readDB();
  const session = db.interviewSessions.find(s => s.id === id && s.userId === req.user.id);

  if (!session) {
    throw new AppError("Interview session not found or access denied.", 404, "NOT_FOUND");
  }

  res.status(200).json({
    success: true,
    data: session,
  });
});

/**
 * List all past sessions for the authenticated user
 */
const getUserSessions = asyncHandler(async (req, res, next) => {
  const db = readDB();
  const userSessions = db.interviewSessions.filter(s => s.userId === req.user.id);

  res.status(200).json({
    success: true,
    data: userSessions,
  });
});

module.exports = {
  createSession,
  submitSessionAnswer,
  getSessionState,
  getUserSessions,
};
