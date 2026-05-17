const fs = require("fs");
const path = require("path");
const { Mutex } = require("async-mutex");

const DB_FILE = path.join(__dirname, "../uploads/db.json");
const mutex = new Mutex();

// Empty default structure required by Audit 3
const emptyDefaultStructure = {
  users: {},
  sessions: {},
  resumes: {},
};

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Audit 3: Startup JSON parser verification
 */
const validateDBStartup = () => {
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      JSON.parse(raw);
      console.log("[DB] JSON storage file validated successfully.");
    } catch (err) {
      console.warn("⚠️ [DB] Warning: JSON storage is corrupted or unparseable. Resetting to default structure.");
      fs.writeFileSync(DB_FILE, JSON.stringify(emptyDefaultStructure, null, 2));
    }
  } else {
    fs.writeFileSync(DB_FILE, JSON.stringify(emptyDefaultStructure, null, 2));
  }
};

validateDBStartup();

/**
 * Read current database snapshot from disk
 */
const readDB = () => {
  try {
    if (!fs.existsSync(DB_FILE)) {
      return { ...emptyDefaultStructure, resumes: [], interviewSessions: [] };
    }
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    
    // Mount array wrappers dynamically to support controller compatibility
    if (!parsed.resumes || !Array.isArray(parsed.resumes)) {
      parsed.resumes = [];
    }
    if (!parsed.interviewSessions || !Array.isArray(parsed.interviewSessions)) {
      parsed.interviewSessions = [];
    }
    return parsed;
  } catch (error) {
    console.error("[DB] Read error, falling back to empty container state:", error);
    return { ...emptyDefaultStructure, resumes: [], interviewSessions: [] };
  }
};

/**
 * Write updated database snapshot to disk utilizing async-mutex lock (Audit 3)
 */
const writeDB = async (data) => {
  const release = await mutex.acquire();
  try {
    // Audit 3: Never store raw resumeText in db.json — only metadata (atsScore, matchScore)
    if (data.resumes && Array.isArray(data.resumes)) {
      data.resumes = data.resumes.map(res => {
        const { resumeText, ...cleanMeta } = res;
        return cleanMeta;
      });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("[DB] Mutex Write Error:", error);
  } finally {
    release();
  }
};

module.exports = {
  readDB,
  writeDB,
};
