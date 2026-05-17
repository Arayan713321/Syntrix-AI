const fs = require("fs");
const path = require("path");
const parsePDF = require("../utils/pdfParser");
const { analyzeResumeATS } = require("../services/atsService");
const { matchResumeWithJD } = require("../services/jdService");
const { answerRAGQuestion, answerRAGQuestionStream } = require("../services/ragService");
const { asyncHandler, AppError } = require("../middleware/errorMiddleware");
const { readDB, writeDB } = require("../utils/dbStore");

/**
 * Audit 1 & 3: Upload resume PDF, parse text, extract ATS metrics, and perform cleanup
 */
const uploadResume = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    throw new AppError("No file uploaded. Please upload a PDF resume.", 400, "FILE_UPLOAD_ERROR");
  }

  // 1. Validate MIME type server-side (not just extension)
  if (req.file.mimetype !== "application/pdf") {
    // Attempt file cleanup immediately to prevent disk clogging
    fs.unlink(req.file.path, () => {});
    throw new AppError("Invalid file type. Only PDF documents are supported.", 400, "FILE_UPLOAD_ERROR");
  }

  const filePath = req.file.path;

  // 2. Verify uploads/{userId}/ path cannot be traversed
  const resolvedPath = path.resolve(filePath);
  const UPLOAD_BASE_DIR = path.resolve(__dirname, "../uploads");
  if (!resolvedPath.startsWith(UPLOAD_BASE_DIR)) {
    fs.unlink(filePath, () => {});
    throw new AppError("Forbidden: Invalid path traversal attempt.", 403, "FORBIDDEN");
  }

  let extractedText = "";
  try {
    // 3. Parse PDF
    extractedText = await parsePDF(filePath);
  } catch (error) {
    throw new AppError("Failed to parse PDF resume text.", 500, "PARSING_ERROR", error.message);
  } finally {
    // 4. Perform disk file cleanup after parsing
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(`[Cleanup] Failed to delete temporary file ${filePath}:`, err);
      }
    });
  }

  // 5. Process with ATS Engine using cost-efficient gpt-4o-mini (Audit 6)
  let atsAnalysis = null;
  try {
    atsAnalysis = await analyzeResumeATS(extractedText);
  } catch (error) {
    throw new AppError("OpenAI ATS scanning failed.", 502, "AI_SERVICE_ERROR", error.message);
  }

  // 6. Save metadata only (never save raw resumeText in db.json — Audit 3)
  const db = readDB();
  const newResume = {
    id: `res_${Date.now()}`,
    userId: req.user.id,
    filename: req.file.originalname,
    uploadedAt: new Date().toISOString(),
    atsScore: atsAnalysis?.scores?.overall || 0,
    matchScore: 0,
    atsAnalysis,
    matchResults: null,
  };
  
  db.resumes.push(newResume);
  await writeDB(db); // Await async mutex lock

  res.status(200).json({
    success: true,
    data: {
      id: newResume.id,
      extractedText, // Returned to client React state in-memory only (never saved to DB)
      atsAnalysis,
    },
    error: null,
    meta: {
      timestamp: new Date().toISOString(),
      service: "Syntrix ATS Scanner Engine",
    },
  });
});

/**
 * Audit 1 & 3: Compare resume embeddings with target Job Description
 */
const matchJD = asyncHandler(async (req, res, next) => {
  const { resumeText, jdText } = req.body;

  if (!resumeText || !jdText) {
    throw new AppError("Missing resumeText or jdText in request payload.", 400, "BAD_REQUEST");
  }

  // 1. Process matching
  let matchResults = null;
  try {
    matchResults = await matchResumeWithJD(resumeText, jdText);
  } catch (error) {
    throw new AppError("Job alignment comparison failed.", 502, "AI_SERVICE_ERROR", error.message);
  }

  // 2. Persist JD alignment record to user history metadata
  const db = readDB();
  let resumeEntry = db.resumes.find(r => r.userId === req.user.id);
  
  if (resumeEntry) {
    resumeEntry.matchScore = matchResults.match_percentage || 0;
    resumeEntry.matchResults = matchResults;
  } else {
    // Scaffold fallback metadata entry if direct compare is run
    resumeEntry = {
      id: `res_${Date.now()}`,
      userId: req.user.id,
      filename: "Aligned Resume Capture",
      uploadedAt: new Date().toISOString(),
      atsScore: 0,
      matchScore: matchResults.match_percentage || 0,
      atsAnalysis: null,
      matchResults,
    };
    db.resumes.push(resumeEntry);
  }
  
  await writeDB(db); // Await async mutex lock

  res.status(200).json({
    success: true,
    data: {
      matchResults,
    },
    error: null,
    meta: {
      timestamp: new Date().toISOString(),
      service: "Syntrix JD Matcher",
    },
  });
});

/**
 * Audit 2: Contextual vector chatbot advisor (RAG) - SSE Streaming implementation
 */
const chatRAG = asyncHandler(async (req, res, next) => {
  const { question, resumeText, jdText, history = [] } = req.body;

  if (!question) {
    throw new AppError("Missing question in request body.", 400, "BAD_REQUEST");
  }

  let activeStream = null;
  let isClosed = false;

  // 30-seconds stream timeout (Audit 2)
  req.setTimeout(30000, () => {
    console.warn("[SSE] RAG stream connection timed out after 30 seconds.");
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ error: "Stream timed out after 30 seconds" })}\n\n`);
      res.end();
    }
    isClosed = true;
  });

  // Client disconnect listener (Audit 2)
  req.on("close", () => {
    isClosed = true;
    console.log("[SSE] Client closed connection mid-stream. Cleaning resources.");
    if (activeStream && typeof activeStream.controller?.abort === "function") {
      activeStream.controller.abort();
    }
  });

  try {
    const { stream, retrievalMode } = await answerRAGQuestionStream(question, resumeText, jdText, history);
    activeStream = stream;

    // Set streaming headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    });

    // Send meta event containing retrievalMode
    res.write(`data: ${JSON.stringify({ meta: { retrievalMode } })}\n\n`);

    // Stream tokens
    for await (const chunk of stream) {
      if (isClosed || res.writableEnded) break;
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        res.write(`data: ${JSON.stringify({ token: content })}\n\n`);
      }
    }

    if (!isClosed && !res.writableEnded) {
      res.write("data: [DONE]\n\n");
      res.end();
    }
  } catch (error) {
    console.error("Streaming chat RAG failed:", error);
    if (!res.writableEnded) {
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Stream failed: " + error.message })}\n\n`);
        res.end();
      } else {
        next(new AppError("Vector DB RAG chat retrieval failed.", 502, "AI_SERVICE_ERROR", error.message));
      }
    }
  } finally {
    if (!res.writableEnded) {
      res.end();
    }
  }
});

/**
 * GET user's past resumes (Fix 6 requirement)
 */
const getResumeHistory = asyncHandler(async (req, res, next) => {
  const db = readDB();
  const userResumes = db.resumes
    .filter(r => r.userId === req.user.id)
    .map(r => ({
      id: r.id,
      filename: r.filename,
      uploadedAt: r.uploadedAt,
      atsScore: r.atsScore || r.atsAnalysis?.scores?.overall || 0,
      matchScore: r.matchScore || r.matchResults?.match_percentage || null,
    }));

  res.status(200).json({
    success: true,
    data: userResumes,
  });
});

/**
 * GET full resume analysis by ID (Fix 6 requirement)
 */
const getResumeById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const db = readDB();
  const resume = db.resumes.find(r => r.id === id && r.userId === req.user.id);

  if (!resume) {
    throw new AppError("Resume analysis not found or access denied.", 404, "NOT_FOUND");
  }

  res.status(200).json({
    success: true,
    data: resume,
  });
});

module.exports = {
  uploadResume,
  matchJD,
  chatRAG,
  getResumeHistory,
  getResumeById,
};
