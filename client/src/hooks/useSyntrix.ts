"use client";

import { useState, useEffect, useRef } from "react";
import API from "@/services/api";
import { toast } from "sonner";

export interface ATSResults {
  scores: {
    technical_depth: number;
    ats_optimization: number;
    recruiter_readability: number;
    project_quality: number;
    overall: number;
  };
  missing_keywords: string[];
  weak_bullets: string[];
  formatting_issues: string[];
  measurable_impact_rating: string;
  improvement_suggestions: string[];
}

export interface JDMatchResults {
  match_percentage: number;
  confidence_score: number;
  matched_skills: string[];
  missing_skills: string[];
  transferable_skills: string[];
  experience_alignment: string;
  skill_gap_analysis: string;
  recommended_improvements: string[];
  likely_interview_topics: string[];
}

export interface InterviewQuestion {
  id: number;
  question: string;
  type: "behavioral" | "technical";
  difficulty: "easy" | "medium" | "hard";
  hint: string;
}

export interface AnswerEvaluation {
  score: number;
  confidence: number;
  strengths: string[];
  improvements: string[];
  starRephrase: string;
  verdict: "Strong" | "Average" | "Needs Work";
}

export interface ChatMessage {
  role: "user" | "ai";
  content: string;
}

export function useSyntrix() {
  const [activeMode, setActiveMode] = useState<"parser" | "matcher" | "interview">("parser");
  
  // Core Data States
  const [file, setFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [jdText, setJdText] = useState("");
  
  // Scans & Analysis Results
  const [atsResults, setAtsResults] = useState<ATSResults | null>(null);
  const [matchResults, setMatchResults] = useState<JDMatchResults | null>(null);
  
  // Chat (RAG) States
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatting, setIsChatting] = useState(false);
  
  // Interview Simulator States
  const [interviewQuestions, setInterviewQuestions] = useState<InterviewQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [interviewAnswers, setInterviewAnswers] = useState<Record<number, string>>({});
  const [interviewEvaluations, setInterviewEvaluations] = useState<Record<number, AnswerEvaluation>>({});
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [isEvaluatingAnswer, setIsEvaluatingAnswer] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [incompleteSessionId, setIncompleteSessionId] = useState<string | null>(null);

  // active stream lock to prevent duplicate appends on component re-renders (Audit 2 requirement)
  const activeStreamRef = useRef<boolean>(false);

  // Check and recover pending incomplete interview sessions from localStorage (Fix 3)
  useEffect(() => {
    const savedSessId = localStorage.getItem("syntrix_interview_session_id");
    if (savedSessId) {
      API.get(`/interview/session/${savedSessId}`)
        .then((res) => {
          const session = res.data?.data;
          if (session && !session.isComplete) {
            setIncompleteSessionId(savedSessId);
          } else {
            // Silently clear localStorage if session is complete or invalid (Audit 5.3 requirement)
            localStorage.removeItem("syntrix_interview_session_id");
          }
        })
        .catch((err) => {
          // If session ID in localStorage no longer exists on server: silently clear localStorage and start fresh (no crash) - Audit 5.3
          console.warn("Recover session error - clearing invalid cached ID:", err.message);
          localStorage.removeItem("syntrix_interview_session_id");
        });
    }
  }, []);

  // App-wide loading & error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Vector retrieval status (Fix 5)
  const [retrievalMode, setRetrievalMode] = useState<"chromadb" | "memory-fallback" | null>(null);

  /**
   * Handle File Scans (Mode 1: ATS Parser)
   */
  const scanResume = async (selectedFile: File) => {
    setIsLoading(true);
    setError(null);
    setAtsResults(null);
    setResumeText("");
    setMatchResults(null);
    setChatHistory([]);
    setInterviewQuestions([]);

    const formData = new FormData();
    formData.append("resume", selectedFile);

    const url = `${API.defaults.baseURL}/resume/upload`;
    console.log("[Upload] Calling:", url);

    try {
      const res = await API.post("/resume/upload", formData);
      
      const payload = res.data?.data;
      if (payload && payload.extractedText) {
        setResumeText(payload.extractedText);
        setAtsResults(payload.atsAnalysis);
      } else {
        throw new Error("Invalid server payload returned.");
      }
    } catch (err: any) {
      console.error(err);
      setFile(null); // Reset dropzone to initial state so user can retry (Audit 5.1 requirement)
      setError(err?.response?.data?.error?.message || err.message || "Failed to analyze resume.");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Compare Resume with JD (Mode 2: Job Matcher)
   */
  const matchJob = async (selectedFile: File, pastedJD: string) => {
    setIsLoading(true);
    setError(null);
    setMatchResults(null);
    setResumeText("");
    setAtsResults(null);
    setChatHistory([]);
    setInterviewQuestions([]);

    const formData = new FormData();
    formData.append("resume", selectedFile);

    const uploadUrl = `${API.defaults.baseURL}/resume/upload`;
    console.log("[Upload] Calling:", uploadUrl);

    try {
      // 1. Upload & parse text
      const uploadRes = await API.post("/resume/upload", formData);
      const parsedText = uploadRes.data?.data?.extractedText;
      
      if (!parsedText) {
        throw new Error("Could not extract resume text.");
      }

      setResumeText(parsedText);
      setJdText(pastedJD);

      // 2. Perform comparison matching
      const matchRes = await API.post("/resume/match-jd", {
        resumeText: parsedText,
        jdText: pastedJD,
      });

      const payload = matchRes.data?.data?.matchResults;
      if (payload) {
        setMatchResults(payload);
        
        // Seed initial chatbot message in RAG Advisor
        setChatHistory([
          {
            role: "ai",
            content: `👋 Ready to optimize! I've loaded your resume and role requirements into the vector database. We computed an overall **${payload.match_percentage}% JD alignment**. Ask me anything, or try the quick buttons!`,
          },
        ]);
      } else {
        throw new Error("Invalid match payload returned.");
      }
    } catch (err: any) {
      console.error(err);
      setFile(null); // Reset dropzone to initial state so user can retry (Audit 5.1 requirement)
      setError(err?.response?.data?.error?.message || err.message || "Failed to match job description.");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Ask Conversational RAG Question with Real OpenAI Token Streaming (SSE)
   */
  const askQuestion = async (questionText: string) => {
    if (!questionText.trim()) return;
    if (activeStreamRef.current) return; // Prevent duplicate message append mid-stream (Audit 2 requirement)
    
    activeStreamRef.current = true;

    // 1. Append user's question to view
    const currentHist = [...chatHistory, { role: "user" as const, content: questionText }];
    setChatHistory(currentHist);
    setIsChatting(true);
    setError(null);

    // 2. Insert blank placeholder AI message to receive stream tokens
    setChatHistory((prev) => [...prev, { role: "ai" as const, content: "" }]);

    try {
      // Fetch NextAuth signed token entirely server-side (Audit 1 requirement)
      let apiToken = "";
      try {
        const tokenRes = await fetch("/api/auth/token");
        if (tokenRes.ok) {
          const tokenJson = await tokenRes.json();
          apiToken = tokenJson?.apiToken || "";
        }
      } catch (tokenErr) {
        console.warn("Could not retrieve bearer token server-side:", tokenErr);
      }

      const chatUrl = `${API.defaults.baseURL || "http://localhost:5000/api"}/resume/chat`;
      console.log("[Chat RAG] Calling SSE Stream at:", chatUrl);

      const response = await fetch(chatUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiToken ? { "Authorization": `Bearer ${apiToken}` } : {}),
        },
        body: JSON.stringify({
          question: questionText,
          resumeText,
          jdText,
          history: chatHistory,
        }),
      });

      if (!response.ok) {
        let errText = "Failed to communicate with RAG streaming endpoint.";
        try {
          const errJson = await response.json();
          errText = errJson?.error?.message || errText;
        } catch (_) {}
        throw new Error(errText);
      }

      if (!response.body) {
        throw new Error("ReadableStream is not supported by backend response.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let finished = false;
      let accumulatedText = "";
      let sawDone = false; // SSE complete status tracker (Audit 2 requirement)

      while (!finished) {
        const { value, done } = await reader.read();
        if (done) {
          finished = true;
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        
        // Split chunks on double newlines as Server-Sent Events structure
        const lines = chunk.split("\n");
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          
          if (trimmed === "data: [DONE]") {
            sawDone = true;
            finished = true;
            break;
          }

          if (trimmed.startsWith("data: ")) {
            const dataStr = trimmed.slice(6);
            try {
              const dataObj = JSON.parse(dataStr);
              
              if (dataObj.meta && dataObj.meta.retrievalMode) {
                setRetrievalMode(dataObj.meta.retrievalMode);
              } else if (dataObj.token) {
                accumulatedText += dataObj.token;
                
                // Keep appending tokens in real-time
                setChatHistory((prev) => {
                  const copy = [...prev];
                  if (copy.length > 0) {
                    copy[copy.length - 1] = {
                      role: "ai",
                      content: accumulatedText,
                    };
                  }
                  return copy;
                });
              } else if (dataObj.error) {
                throw new Error(dataObj.error);
              }
            } catch (jsonErr) {
              console.debug("Partial chunk parsing bypassed:", jsonErr);
            }
          }
        }
      }

      // If stream closes without [DONE]: show error toast + append "[Response incomplete]" (Audit 2 requirement)
      if (!sawDone) {
        toast.error("RAG stream response interrupted unexpectedly.");
        setChatHistory((prev) => {
          const copy = [...prev];
          if (copy.length > 0) {
            copy[copy.length - 1] = {
              role: "ai",
              content: copy[copy.length - 1].content + " [Response incomplete]",
            };
          }
          return copy;
        });
      }
    } catch (err: any) {
      console.error("Streaming chat RAG failed:", err);
      // Fetch threw / network loss handler (Audit 2 requirement)
      toast.error("Connection lost — please retry", { id: "network-error-toast" });

      setChatHistory((prev) => {
        const copy = [...prev];
        if (copy.length > 0) {
          copy[copy.length - 1] = {
            role: "ai",
            content: copy[copy.length - 1].content || `⚠️ Connection lost — please retry.`,
          };
        }
        return copy;
      });
      setError(err.message || "Streaming RAG error.");
    } finally {
      setIsChatting(false);
      activeStreamRef.current = false; // Always clear active stream lock (Audit 2 requirement)
    }
  };

  /**
   * Restore a pending incomplete session from database (Fix 3)
   */
  const restoreSession = async (sessId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await API.get(`/interview/session/${sessId}`);
      const session = res.data?.data;
      if (session) {
        setInterviewQuestions(session.questions);
        setInterviewAnswers(session.answers);
        setInterviewEvaluations(session.evaluations);
        setCurrentQuestionIndex(session.currentQuestionIndex);
        setActiveSessionId(session.id);
        setIncompleteSessionId(null);
        setActiveMode("interview");
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to restore pending interview session.");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Start Interview Simulation (Generates set of questions and initializes server session)
   */
  const startInterview = async (type: string = "Technical", role: string = "Software Engineer") => {
    if (!resumeText) {
      setError("Please scan a resume or perform a job match first to seed the interviewer context.");
      return;
    }

    setIsGeneratingQuestions(true);
    setError(null);
    setCurrentQuestionIndex(0);
    setInterviewAnswers({});
    setInterviewEvaluations({});
    
    localStorage.removeItem("syntrix_interview_session_id");
    setIncompleteSessionId(null);
    setActiveSessionId(null);

    try {
      const res = await API.post("/interview/session", {
        resumeText,
        jdText,
        type,
        role,
      });

      const payload = res.data?.data;
      if (payload && payload.sessionId) {
        setInterviewQuestions(payload.questions);
        setActiveSessionId(payload.sessionId);
        localStorage.setItem("syntrix_interview_session_id", payload.sessionId);
      } else {
        throw new Error("No interview questions session generated by AI.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error?.message || err.message || "Failed to generate interview simulator.");
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  /**
   * Submit and evaluate candidate answer for current interview question inside active session
   */
  const submitAnswer = async (answerText: string) => {
    if (!answerText.trim() || interviewQuestions.length === 0 || !activeSessionId) return;

    const currentQuestion = interviewQuestions[currentQuestionIndex];
    
    // Save answer locally
    setInterviewAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: answerText,
    }));

    setIsEvaluatingAnswer(true);

    try {
      const res = await API.post(`/interview/session/${activeSessionId}/answer`, {
        questionId: currentQuestion.id,
        answerText,
        question: currentQuestion.question,
      });

      const payload = res.data?.data;
      if (payload && payload.evaluation) {
        setInterviewEvaluations((prev) => ({
          ...prev,
          [currentQuestion.id]: payload.evaluation,
        }));
        
        // Progress index or clear localStorage if session is complete (Fix 3 requirement)
        if (payload.isComplete) {
          localStorage.removeItem("syntrix_interview_session_id");
          setIncompleteSessionId(null);
        } else {
          setCurrentQuestionIndex(payload.currentQuestionIndex);
        }
      } else {
        throw new Error("Failed to parse response evaluation.");
      }
    } catch (err: any) {
      console.error(err);
      setError("Error grading response: " + err.message);
    } finally {
      setIsEvaluatingAnswer(false);
    }
  };

  return {
    activeMode,
    setActiveMode,
    file,
    setFile,
    resumeText,
    jdText,
    atsResults,
    matchResults,
    chatHistory,
    isChatting,
    interviewQuestions,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    interviewAnswers,
    interviewEvaluations,
    isGeneratingQuestions,
    isEvaluatingAnswer,
    activeSessionId,
    incompleteSessionId,
    setIncompleteSessionId,
    restoreSession,
    isLoading,
    error,
    setError,
    retrievalMode,
    setRetrievalMode,
    scanResume,
    matchJob,
    askQuestion,
    startInterview,
    submitAnswer,
  };
}
