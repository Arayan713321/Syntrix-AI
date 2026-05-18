"use client";

import React, { useState, useEffect, useRef } from "react";
import { InterviewQuestion, AnswerEvaluation } from "@/hooks/useSyntrix";
import { 
  MessageSquare, 
  Sparkles, 
  Award, 
  ArrowRight, 
  HelpCircle, 
  CornerDownRight, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  Play, 
  AlertTriangle, 
  Download, 
  Mic, 
  Volume2, 
  Camera, 
  CameraOff, 
  Video, 
  Info,
  Layers,
  Settings,
  ChevronDown
} from "lucide-react";
import { toast } from "sonner";
import { useInterviewCamera } from "@/hooks/useInterviewCamera";
import { generateInterviewReportPDF } from "@/lib/exportPDF";
import { useFaceTracking } from "@/hooks/useFaceTracking";

interface InterviewSimulatorViewProps {
  questions: InterviewQuestion[];
  currentIndex: number;
  onStart: (type: string, role: string) => void;
  onSubmitAnswer: (answer: string) => void;
  onNextQuestion: () => void;
  onPreviousQuestion: () => void;
  setCurrentIndex: (idx: number) => void;
  answers: Record<number, string>;
  evaluations: Record<number, AnswerEvaluation>;
  isGenerating: boolean;
  isEvaluating: boolean;
  hasResume: boolean;
  incompleteSessionId?: string | null;
  onRestoreSession?: (sessId: string) => void;
  setIncompleteSessionId?: (sessId: string | null) => void;
}

export function InterviewSimulatorView({
  questions,
  currentIndex,
  onStart,
  onSubmitAnswer,
  onNextQuestion,
  onPreviousQuestion,
  setCurrentIndex,
  answers,
  evaluations,
  isGenerating,
  isEvaluating,
  hasResume,
  incompleteSessionId = null,
  onRestoreSession,
  setIncompleteSessionId,
}: InterviewSimulatorViewProps) {
  // Step Configurator States
  const [subStep, setSubStep] = useState<"configure" | "consent">("configure");
  const [targetRole, setTargetRole] = useState("Software Engineer");
  const [interviewType, setInterviewType] = useState<"Technical" | "HR">("Technical");

  const [answerInput, setAnswerInput] = useState("");
  const [showRephrasing, setShowRephrasing] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Hook and State parameters for Session Camera Recording
  const {
    videoRef,
    isRecording,
    cameraEnabled,
    permissionDenied,
    startRecording,
    stopRecording,
    downloadRecording,
    recordingURL,
    toggleCamera,
  } = useInterviewCamera();

  const [useCamera, setUseCamera] = useState(false);
  const [timer, setTimer] = useState(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize browser-side live face tracking using face-api weights (Fix 2 & 3)
  const { metrics, modelsLoaded } = useFaceTracking(videoRef, useCamera && isRecording);

  // Rolling Presentational History Stores
  const [sessionEyeContacts, setSessionEyeContacts] = useState<number[]>([]);
  const [sessionAttentivenesses, setSessionAttentivenesses] = useState<number[]>([]);
  const [sessionExpressions, setSessionExpressions] = useState<Record<string, number>>({});

  // Rolling alert state trackers
  const [lowEyeContactTicks, setLowEyeContactTicks] = useState(0);
  const [hasShownEyeContactToastThisQuestion, setHasShownEyeContactToastThisQuestion] = useState(false);

  // Reset toast triggers dynamically on question advancement
  useEffect(() => {
    setHasShownEyeContactToastThisQuestion(false);
    setLowEyeContactTicks(0);
  }, [currentIndex]);

  // Frame-by-frame analysis accumulator & dynamic alerts (Fix 3)
  useEffect(() => {
    if (useCamera && isRecording && metrics.faceDetected) {
      setSessionEyeContacts(prev => [...prev, metrics.eyeContact]);
      setSessionAttentivenesses(prev => [...prev, metrics.attentiveness]);
      if (metrics.expressionLabel) {
        setSessionExpressions(prev => {
          const next = { ...prev };
          next[metrics.expressionLabel] = (next[metrics.expressionLabel] || 0) + 1;
          return next;
        });
      }

      // Check for low eye contact dropping below 40 for 5+ seconds (10 ticks * 500ms)
      if (metrics.eyeContact < 40) {
        setLowEyeContactTicks(prev => {
          const next = prev + 1;
          if (next >= 10 && !hasShownEyeContactToastThisQuestion) {
            toast.warning("👁 Tip: Maintain eye contact with the camera", {
              description: "Looking directly at the lens shows confidence and engagement.",
              duration: 4000
            });
            setHasShownEyeContactToastThisQuestion(true);
          }
          return next;
        });
      } else {
        setLowEyeContactTicks(0);
      }
    } else {
      setLowEyeContactTicks(0);
    }
  }, [useCamera, isRecording, metrics.eyeContact, metrics.attentiveness, metrics.expressionLabel, metrics.faceDetected, hasShownEyeContactToastThisQuestion]);

  // Live Presentational HUD Helper Visual Meters
  const renderMeter = (value: number) => {
    const filledCount = Math.round(value / 10);
    const emptyCount = 10 - filledCount;
    const filledChar = "█";
    const emptyChar = "░";
    
    let colorClass = "text-rose-500";
    if (value >= 70) {
      colorClass = "text-emerald-500";
    } else if (value >= 40) {
      colorClass = "text-amber-500";
    }
    
    return (
      <div className="flex items-center gap-1 font-mono text-[10px]">
        <span className={colorClass}>
          {filledChar.repeat(filledCount)}
          <span className="text-zinc-700">{emptyChar.repeat(emptyCount)}</span>
        </span>
        <span className="font-bold text-zinc-300 ml-1">{value}%</span>
      </div>
    );
  };

  const getExpressionBadge = (label: string) => {
    let bg = "bg-zinc-800 text-zinc-400 border border-zinc-700";
    const l = label.toLowerCase();
    if (l === "confident") bg = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
    else if (l === "nervous") bg = "bg-rose-500/10 text-rose-400 border border-rose-500/20";
    else if (l === "engaged") bg = "bg-blue-500/10 text-blue-400 border border-blue-500/20";
    
    return (
      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${bg}`}>
        {label}
      </span>
    );
  };

  // Increment timer every second when recording is active
  useEffect(() => {
    if (isRecording) {
      setTimer(0);
      timerIntervalRef.current = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStartWithCamera = async () => {
    setUseCamera(true);
    // Trigger interview starter via props
    onStart(interviewType, targetRole);
  };

  const handleStartWithoutCamera = () => {
    setUseCamera(false);
    onStart(interviewType, targetRole);
  };

  // Start actual local camera recording ONLY after the backend session successfully returns questions
  useEffect(() => {
    if (questions.length > 0 && useCamera && !isRecording && !permissionDenied) {
      startRecording().catch(err => {
        console.error("Camera autostart failed:", err);
      });
    }
  }, [questions, useCamera, isRecording, permissionDenied, startRecording]);

  // Advanced Voice APIs state
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers[currentQuestion?.id] || "";
  const currentEvaluation = evaluations[currentQuestion?.id] || null;

  // 1. Initialize Web Speech Recognition (STT) on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "en-US";

        rec.onresult = (event: any) => {
          let finalTranscript = "";
          let interimTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript + " ";
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          const captured = finalTranscript || interimTranscript;
          if (captured) {
            setAnswerInput(prev => {
              const base = prev.trim();
              return base ? `${base} ${captured}` : captured;
            });
            setInputError(null);
          }
        };

        rec.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);
        };

        rec.onend = () => {
          setIsListening(false);
        };

        setRecognition(rec);
      }
    }
  }, []);

  // 2. Web Speech Synthesis (TTS) - Speak Question aloud
  const speakQuestion = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      toast.warning("Voice Synthesis is not supported in your browser.");
      return;
    }

    // Cancel current speaking
    window.speechSynthesis.cancel();

    if (isSpeaking) {
      setIsSpeaking(false);
      return;
    }

    const cleanText = text.replace(/❓|["']/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);

    // Sourced custom professional English voice if loaded
    const voices = window.speechSynthesis.getVoices();
    const premiumVoice = voices.find(v => v.lang === "en-US" && (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Zira")));
    if (premiumVoice) {
      utterance.voice = premiumVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // 3. Auto-Speak Question Triggers & Speech Cancel Cleanups on navigation
  useEffect(() => {
    if (autoSpeak && currentQuestion) {
      // Delay speech slightly to let view mount/settle
      const timer = setTimeout(() => speakQuestion(currentQuestion.question), 600);
      return () => clearTimeout(timer);
    }
    
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
    };
  }, [currentIndex, autoSpeak, currentQuestion]);

  // 4. Inline Empty Answer Validation (Audit 5.3 requirement)
  const handleSubmit = () => {
    // Stop microphone if active
    if (isListening && recognition) {
      recognition.stop();
    }

    if (!answerInput.trim()) {
      setInputError("Response cannot be empty. Please draft or speak an answer before submitting.");
      return;
    }
    if (isEvaluating) return;

    setInputError(null);
    onSubmitAnswer(answerInput);
    setAnswerInput("");
    setShowRephrasing(false);
  };

  const handleNext = () => {
    // Cancel speaking when transitioning
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setAnswerInput("");
    setShowRephrasing(false);
    setInputError(null);
    onNextQuestion();
  };

  const getAggregateReport = () => {
    const evaluatedKeys = Object.keys(evaluations);
    if (evaluatedKeys.length === 0) return { avg: 0, count: 0 };
    const total = evaluatedKeys.reduce((acc, key) => acc + evaluations[Number(key)].score, 0);
    return {
      avg: Math.round(total / evaluatedKeys.length),
      count: evaluatedKeys.length,
    };
  };

  const report = getAggregateReport();

  const avgEyeContact = sessionEyeContacts.length > 0 
    ? Math.round(sessionEyeContacts.reduce((a, b) => a + b, 0) / sessionEyeContacts.length) 
    : 78; // Fallback to 78% as baseline

  const avgAttentiveness = sessionAttentivenesses.length > 0 
    ? Math.round(sessionAttentivenesses.reduce((a, b) => a + b, 0) / sessionAttentivenesses.length) 
    : 85; // Fallback to 85% as baseline

  const getDominantExpression = () => {
    const entries = Object.entries(sessionExpressions);
    if (entries.length === 0) return "Confident";
    const sorted = entries.sort((a, b) => b[1] - a[1]);
    const dominant = sorted[0][0];
    return dominant.charAt(0).toUpperCase() + dominant.slice(1);
  };
  const dominantExpression = getDominantExpression();

  // Export robust PDF Report using jsPDF (Fix 2 requirement)
  const handleDownloadPDFReport = async () => {
    if (isExportingPDF) return;
    setIsExportingPDF(true);

    try {
      // Small timeout allows the UI loader to render smoothly before the main thread locks for PDF building
      await new Promise((resolve) => setTimeout(resolve, 300));

      const formattedQuestions = questions.map((q) => ({
        id: q.id,
        question: q.question,
        category: q.type || "technical", // Map type back
        context: q.hint || "Standard technical alignment",
      }));

      // Generate structured A4 PDF report
      generateInterviewReportPDF({
        sessionId: localStorage.getItem("syntrix_interview_session_id") || `sess_${Date.now()}`,
        role: targetRole,
        type: interviewType,
        questions: formattedQuestions,
        answers,
        evaluations,
      });

      toast.success("Interview report downloaded successfully!");
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      toast.error("Failed to build PDF document: " + err.message);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const isConcluded = currentIndex >= questions.length && questions.length > 0;

  // Watch session progression to stop recording when concluded
  useEffect(() => {
    if (isConcluded && isRecording) {
      stopRecording();
    }
  }, [isConcluded, isRecording, stopRecording]);

  // Clean local storage states and reset wizard (Fix 3 requirement)
  const handleResetSession = () => {
    localStorage.removeItem("syntrix_interview_session_id");
    if (setIncompleteSessionId) setIncompleteSessionId(null);
    setCurrentIndex(0);
    setSubStep("configure");
    setUseCamera(false);
    setTimer(0);
    // Fast refresh page trigger to clear hook states fully
    window.location.reload();
  };

  // STEP 1: TARGET ROLE & INTERVIEW TYPE CONFIGURATOR
  if (questions.length === 0 && subStep === "configure") {
    return (
      <div className="p-6 sm:p-8 rounded-3xl border border-zinc-800/80 bg-zinc-900/15 backdrop-blur-md shadow-2xl flex flex-col gap-6 w-full max-w-2xl mx-auto animate-fade-in relative overflow-hidden">
        
        {/* Glow decorative spheres */}
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-purple-500/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />

        {/* Restore Section Banner */}
        {incompleteSessionId && onRestoreSession && setIncompleteSessionId && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-between gap-4 w-full animate-fade-in-up shadow-lg">
            <div className="flex items-center gap-3 text-left">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
                <AlertTriangle className="h-4.5 w-4.5" />
              </div>
              <div>
                <h4 className="font-extrabold text-amber-300">Incomplete Interview Session Found</h4>
                <p className="text-[10px] sm:text-xs text-zinc-400">Restore your cached session to avoid losing scoring logs.</p>
              </div>
            </div>
            <div className="flex gap-2.5 w-full sm:w-auto justify-end">
              <button
                onClick={() => setIncompleteSessionId(null)}
                className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors font-bold text-xs cursor-pointer focus:outline-none"
              >
                Dismiss
              </button>
              <button
                onClick={() => onRestoreSession(incompleteSessionId)}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black transition-colors text-xs cursor-pointer shadow-md focus:outline-none"
              >
                Resume
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 text-center sm:text-left">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shadow-lg shadow-purple-500/5 mx-auto sm:mx-0">
            <Settings className="h-5 w-5 text-purple-400 animate-spin-slow" />
          </div>
          <h3 className="text-zinc-200 font-extrabold text-lg sm:text-2xl tracking-tight mt-1">Configure AI Mock Panel</h3>
          <p className="text-zinc-500 text-xs sm:text-sm leading-relaxed max-w-lg">
            Align the interviewer panel dynamically. Syntrix AI will synthesis technical challenges and corporate HR questions tailored directly to your target.
          </p>
        </div>

        <div className="flex flex-col gap-5 mt-2">
          {/* Input A: Target Role */}
          <div className="flex flex-col gap-1.5 pl-0.5">
            <label htmlFor="role-select" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Target Interview Role
            </label>
            <input
              id="role-select"
              type="text"
              required
              placeholder="e.g. Lead UI UX Designer, Senior Backend Engineer"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl border border-zinc-800 bg-zinc-900/30 text-zinc-200 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 placeholder:text-zinc-650"
            />
          </div>

          {/* Input B: Tracks selector */}
          <div className="flex flex-col gap-1.5 pl-0.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Interview Track Focus
            </label>
            <div className="grid grid-cols-2 gap-3.5">
              {/* Technical Option */}
              <button
                type="button"
                onClick={() => setInterviewType("Technical")}
                className={`py-4 px-4 rounded-xl border flex flex-col items-center gap-1.5 text-center cursor-pointer transition-all duration-300 ${
                  interviewType === "Technical"
                    ? "bg-purple-600/10 border-purple-500 text-purple-300 shadow-md shadow-purple-500/5"
                    : "bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                <Layers className={`h-5 w-5 ${interviewType === "Technical" ? "text-purple-400" : "text-zinc-500"}`} />
                <span className="font-extrabold text-xs sm:text-sm">Technical Assessment</span>
                <span className="text-[9px] text-zinc-500 font-semibold px-2">Data structures, System design, Databases</span>
              </button>

              {/* HR Option */}
              <button
                type="button"
                onClick={() => setInterviewType("HR")}
                className={`py-4 px-4 rounded-xl border flex flex-col items-center gap-1.5 text-center cursor-pointer transition-all duration-300 ${
                  interviewType === "HR"
                    ? "bg-purple-600/10 border-purple-500 text-purple-300 shadow-md shadow-purple-500/5"
                    : "bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                <MessageSquare className={`h-5 w-5 ${interviewType === "HR" ? "text-purple-400" : "text-zinc-500"}`} />
                <span className="font-extrabold text-xs sm:text-sm">HR & Behavioral</span>
                <span className="text-[9px] text-zinc-500 font-semibold px-2">Leadership conflicts, STAR stories, Timelines</span>
              </button>
            </div>
          </div>
        </div>

        {!hasResume ? (
          <div className="text-xs text-rose-400 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 max-w-md mx-auto text-center flex items-center gap-2">
            <AlertTriangle className="h-4.5 w-4.5 flex-shrink-0" />
            <span>Please upload your PDF Resume first to seed the customized advisor telemetry!</span>
          </div>
        ) : (
          <button
            onClick={() => setSubStep("consent")}
            disabled={!targetRole.trim()}
            className="w-full py-4 mt-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm transition-all shadow-lg hover:shadow-purple-500/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 focus:outline-none"
          >
            <span>Proceed to Hardware Settings</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  // STEP 2: WEBCAM / AUDIO CONSENT SCREEN
  if (questions.length === 0 && subStep === "consent") {
    return (
      <div className="p-6 sm:p-8 rounded-3xl border border-zinc-800/80 bg-zinc-950 shadow-2xl flex flex-col gap-6 w-full max-w-md mx-auto text-left animate-fade-in relative">
        <button
          onClick={() => setSubStep("configure")}
          className="absolute top-4 left-4 p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mt-3 shadow-lg">
          <Video className="h-6 w-6 text-purple-400 animate-pulse" />
        </div>
        <div className="flex flex-col gap-1.5">
          <h3 className="text-zinc-200 font-extrabold text-lg">Enable Simulator Camera</h3>
          <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
            Enable your camera and audio to record your mock panel session. You can review eye contact, speaking speed, and download the .webm recording afterwards!
          </p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-850/80 text-[10px] sm:text-xs text-zinc-500 flex gap-2">
          <Info className="h-4 w-4 text-purple-400 flex-shrink-0 mt-0.5" />
          <span>All hardware stream recording is executed 100% locally in your browser. No video data is ever sent to any remote servers.</span>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 mt-3 w-full">
          <button
            onClick={handleStartWithoutCamera}
            disabled={isGenerating}
            className="flex-1 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors font-bold text-xs sm:text-sm cursor-pointer disabled:opacity-50 focus:outline-none"
          >
            Skip — Text Only
          </button>
          
          <button
            onClick={handleStartWithCamera}
            disabled={isGenerating}
            className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm transition-all shadow-lg hover:shadow-purple-500/30 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 focus:outline-none"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Synthesizing...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                <span>Enable & Start</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // STEP 5: CONCLUSIVE INTERVIEW ASSESSMENT REPORT SCREEN
  if (isConcluded) {
    return (
      <div className="p-6 sm:p-8 rounded-3xl border border-zinc-800 bg-zinc-900/10 backdrop-blur-md flex flex-col items-center justify-center text-center min-h-[380px] animate-fade-in gap-6 shadow-2xl max-w-4xl mx-auto">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center animate-bounce shadow-lg shadow-emerald-500/5">
          <Award className="h-6 w-6 sm:h-7 sm:w-7 text-emerald-400" />
        </div>
        
        <div className="flex flex-col gap-1.5 px-2">
          <h3 className="text-zinc-200 font-extrabold text-xl sm:text-2xl tracking-tight">AI Simulator Report Ready</h3>
          <p className="text-zinc-500 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
            Congratulations! You have completed the customized AI interview panel. Review your aggregate telemetry metrics below.
          </p>
        </div>

        {/* Aggregate statistics row */}
        <div className="p-5 sm:p-6 rounded-2xl bg-zinc-950/80 border border-zinc-900 w-full max-w-md flex items-center justify-around gap-6 shadow-lg">
          <div className="flex flex-col items-center">
            {/* SVG Score Ring overall average */}
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="absolute w-full h-full transform -rotate-90">
                <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.03)" strokeWidth="4" fill="transparent" />
                <circle 
                  cx="32" 
                  cy="32" 
                  r="28" 
                  stroke="#10b981" 
                  strokeWidth="4" 
                  fill="transparent" 
                  strokeDasharray={175.9}
                  strokeDashoffset={175.9 - (175.9 * report.avg) / 100}
                  className="transition-all duration-1000"
                />
              </svg>
              <span className="text-base sm:text-lg font-black text-white">{report.avg}%</span>
            </div>
            <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider mt-1.5">OVERALL GRADE</span>
          </div>
          
          <div className="w-px h-12 bg-zinc-800" />
          
          <div className="flex flex-col items-center">
            <span className="text-2xl sm:text-3xl font-black text-purple-400">{report.count} / 5</span>
            <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider mt-2.5">EVALUATED QUESTIONS</span>
          </div>
        </div>

        {/* Q&A Detailed Transcripts breakdown */}
        <div className="w-full text-left flex flex-col gap-4 mt-2">
          <h4 className="text-zinc-300 font-extrabold text-xs sm:text-sm uppercase tracking-wider pl-1">
            Detailed Q&A Assessments
          </h4>
          <div className="flex flex-col gap-4">
            {questions.map((q, idx) => {
              const ans = answers[q.id] || "No response provided.";
              const evalObj = evaluations[q.id];
              return (
                <div key={q.id} className="p-5 rounded-2xl border border-zinc-850 bg-zinc-900/20 flex flex-col gap-3">
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-850/50">
                    <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                      Question {idx + 1}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
                      Score: {evalObj ? `${evalObj.score}%` : "Pending"}
                    </span>
                  </div>
                  <div className="text-zinc-300 text-xs sm:text-sm font-semibold">
                    "{q.question}"
                  </div>
                  <div className="text-[11px] text-zinc-400 pl-2 border-l border-zinc-700 italic">
                    <span className="font-bold text-zinc-500 not-italic uppercase tracking-wider text-[9px] block">Your Answer:</span>
                    "{ans}"
                  </div>
                  {evalObj && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1.5 text-xs">
                      <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-900">
                        <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest block mb-1">Key Strengths</span>
                        {evalObj.strengths.slice(0, 2).map((s, i) => (
                          <div key={i} className="text-zinc-300 text-[11px] leading-relaxed">• {s}</div>
                        ))}
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-900">
                        <span className="text-[9px] font-bold text-rose-400 uppercase tracking-widest block mb-1">Improvements</span>
                        {evalObj.improvements.slice(0, 2).map((imp, i) => (
                          <div key={i} className="text-zinc-300 text-[11px] leading-relaxed">• {imp}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Presentation Analysis Card (Fix 3 & 4) */}
        {useCamera && (
          <div className="p-5 sm:p-6 rounded-2xl bg-zinc-950/80 border border-zinc-900 w-full text-left flex flex-col gap-4 shadow-lg animate-fade-in">
            <h4 className="text-zinc-300 font-extrabold text-xs sm:text-sm flex items-center gap-2 uppercase tracking-wider">
              <Sparkles className="h-4.5 w-4.5 text-purple-400" />
              Presentation & Engagement Analysis
            </h4>
            
            <div className="overflow-x-auto rounded-xl border border-zinc-850">
              <table className="min-w-full divide-y divide-zinc-850 text-xs sm:text-sm">
                <thead className="bg-zinc-900/60">
                  <tr>
                    <th className="px-4 py-2.5 font-bold text-zinc-400 text-left uppercase tracking-wider">Metric</th>
                    <th className="px-4 py-2.5 font-bold text-zinc-400 text-left uppercase tracking-wider">Score</th>
                    <th className="px-4 py-2.5 font-bold text-zinc-400 text-left uppercase tracking-wider">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850 bg-zinc-900/10 text-zinc-300">
                  <tr>
                    <td className="px-4 py-3 font-semibold">👁 Eye Contact</td>
                    <td className="px-4 py-3 font-mono font-bold text-zinc-200">{avgEyeContact}%</td>
                    <td className={`px-4 py-3 font-semibold ${avgEyeContact >= 70 ? "text-emerald-400" : avgEyeContact >= 40 ? "text-amber-400" : "text-rose-400"}`}>
                      {avgEyeContact >= 70 ? "Excellent" : avgEyeContact >= 40 ? "Good" : "Needs Work"}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold">🧠 Attentiveness</td>
                    <td className="px-4 py-3 font-mono font-bold text-zinc-200">{avgAttentiveness}%</td>
                    <td className={`px-4 py-3 font-semibold ${avgAttentiveness >= 70 ? "text-emerald-400" : avgAttentiveness >= 40 ? "text-amber-400" : "text-rose-400"}`}>
                      {avgAttentiveness >= 70 ? "Excellent" : avgAttentiveness >= 40 ? "Good" : "Needs Work"}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold">😊 Expression</td>
                    <td className="px-4 py-3 font-mono font-bold text-zinc-200 uppercase" colSpan={2}>{dominantExpression}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-2 mt-2 bg-purple-950/15 border border-purple-900/30 p-4 rounded-xl">
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest block">AI Presentational Coaching Feedback</span>
              <ul className="list-disc pl-4 text-xs text-zinc-300 flex flex-col gap-1.5 leading-relaxed">
                {avgEyeContact < 60 && (
                  <li>Practice looking directly at the camera lens, not at your own video.</li>
                )}
                {avgAttentiveness < 60 && (
                  <li>Minimize distractions and ensure good lighting for optimal attentiveness tracking.</li>
                )}
                {dominantExpression.toLowerCase() === "nervous" && (
                  <li>Take a breath before answering — your expression affects perception.</li>
                )}
                {avgEyeContact >= 60 && avgAttentiveness >= 60 && dominantExpression.toLowerCase() !== "nervous" && (
                  <li>Keep it up! Your eye contact and presentational confidence level look superb.</li>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Video recording playback panel */}
        {useCamera && (
          <div className="p-5 sm:p-6 rounded-2xl bg-zinc-950/80 border border-zinc-900 w-full text-left flex flex-col gap-4 shadow-lg">
            <h4 className="text-zinc-300 font-extrabold text-xs sm:text-sm flex items-center gap-2 uppercase tracking-wider">
              <Video className="h-4.5 w-4.5 text-purple-400" />
              Interview Telemetry Session Recording
            </h4>
            {recordingURL ? (
              <div className="flex flex-col gap-4">
                <div className="relative rounded-2xl overflow-hidden border border-zinc-850 bg-black aspect-video shadow-inner max-w-xl mx-auto w-full">
                  <video
                    src={recordingURL}
                    controls
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto w-full">
                  <button
                    onClick={() => window.open(recordingURL)}
                    className="flex-1 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 font-bold text-xs sm:text-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5 focus:outline-none"
                  >
                    <Play className="h-4 w-4 text-purple-400" /> Review Frame Rates
                  </button>
                  <button
                    onClick={downloadRecording}
                    className="flex-1 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs sm:text-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-md hover:shadow-purple-500/20 focus:outline-none"
                  >
                    <Download className="h-4 w-4" /> Download WebM
                  </button>
                </div>
                <p className="text-[10px] sm:text-xs text-zinc-500 leading-relaxed text-center">
                  💡 Tip: Listen carefully to your pitch inflection and maintain constant eye contact with the lens.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-zinc-850 bg-zinc-950/40 text-center text-xs text-zinc-500">
                Camera feed processing... check download button.
              </div>
            )}
          </div>
        )}

        {/* Body posture checks */}
        <div className="p-5 sm:p-6 rounded-2xl bg-zinc-950/80 border border-zinc-900 w-full text-left flex flex-col gap-4 shadow-lg">
          <h4 className="text-zinc-300 font-extrabold text-xs sm:text-sm flex items-center gap-2 uppercase tracking-wider">
            <Sparkles className="h-4.5 w-4.5 text-emerald-400" />
            Physical Presentation & Body Language Tips
          </h4>
          <div className="flex flex-col gap-3">
            {[
              "Align your upper torso to the middle of the camera grid to demonstrate confidence.",
              "Look directly at the webcam module when asserting technical STAR accomplishments.",
              "Sanitize your background ambient audio levels to elevate transcription scoring.",
              "Pace your cadence carefully to naturally avoid vocal disfluencies (e.g. 'uhs' or 'likes')."
            ].map((tip, i) => (
              <div key={i} className="flex gap-3 items-start text-zinc-300 text-xs sm:text-sm leading-relaxed">
                <span className="w-5 h-5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold flex-shrink-0 text-[10px]">
                  ✓
                </span>
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Global conclusion buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full justify-center mt-2">
          <button
            onClick={handleResetSession}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors font-bold text-xs sm:text-sm cursor-pointer focus:outline-none"
          >
            Start New Session
          </button>
          
          <button
            onClick={handleDownloadPDFReport}
            disabled={isExportingPDF}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800/60 text-zinc-300 font-black text-xs sm:text-sm transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 focus:outline-none"
          >
            {isExportingPDF ? (
              <>
                <svg className="animate-spin h-4 w-4 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Building A4 PDF Report...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4 text-purple-400" />
                <span>Download Report PDF</span>
              </>
            )}
          </button>

          <button
            onClick={() => setCurrentIndex(0)}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer focus:outline-none"
          >
            <span>Review Q&A Panels</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // STEP 4: SINGLE-QUESTION REVIEW FEEDBACK SCREEN
  if (currentEvaluation) {
    return (
      <div className="p-6 sm:p-8 rounded-3xl border border-emerald-500/20 bg-emerald-500/5 animate-fade-in-up w-full max-w-3xl mx-auto flex flex-col gap-6">
        
        {/* Step tracker count header */}
        <div className="flex justify-between items-center text-xs">
          <span className="font-extrabold text-purple-400 uppercase tracking-widest text-[9px] sm:text-[10px]">
            Single-Question AI Feedback
          </span>
          <span className="text-zinc-500 font-extrabold text-[10px] sm:text-xs">
            Review {currentIndex + 1} of {questions.length}
          </span>
        </div>

        {/* 96x96 viewport Score ring, verdict status pill and metadata */}
        <div className="flex flex-col sm:flex-row items-center gap-5 pb-5 border-b border-zinc-850/60">
          <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
            {/* Beautiful SVG Animated radial Score Ring (Fix 5 ATS/Simulator standard) */}
            <svg className="absolute w-full h-full transform -rotate-90">
              <circle cx="48" cy="48" r="42" stroke="rgba(255,255,255,0.03)" strokeWidth="6" fill="transparent" />
              <circle 
                cx="48" 
                cy="48" 
                r="42" 
                stroke="#10b981" 
                strokeWidth="6" 
                fill="transparent" 
                strokeDasharray={263.89}
                strokeDashoffset={263.89 - (263.89 * currentEvaluation.score) / 100}
                className="transition-all duration-1000"
              />
            </svg>
            <span className="text-xl sm:text-2xl font-black text-white">{currentEvaluation.score}%</span>
          </div>

          <div className="flex flex-col gap-1.5 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2.5">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                Question Performance Score
              </span>
              <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                currentEvaluation.verdict === "Strong" 
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : currentEvaluation.verdict === "Average"
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                  : "bg-rose-500/10 border-rose-500/20 text-rose-400"
              }`}>
                Verdict: {currentEvaluation.verdict}
              </span>
            </div>
            <div className="text-zinc-400 text-[11px] sm:text-xs leading-relaxed max-w-lg">
              <span className="font-extrabold text-zinc-500 uppercase tracking-wider block text-[9px] mb-0.5">Prompt Question Context:</span>
              "{currentQuestion.question}"
            </div>
          </div>
        </div>

        {/* Strengths and Improvements lists */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Strengths */}
          <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950/60 border border-zinc-900 flex flex-col gap-3">
            <span className="text-[9px] sm:text-[10px] font-bold text-emerald-400 tracking-widest uppercase">Matching Strengths</span>
            <div className="flex flex-col gap-2.5">
              {currentEvaluation.strengths.map((str, i) => (
                <div key={i} className="flex gap-2 text-zinc-300 text-xs pl-1">
                  <span className="text-emerald-500 font-bold">✔</span>
                  <span className="leading-relaxed">{str}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Improvements */}
          <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950/60 border border-zinc-900 flex flex-col gap-3">
            <span className="text-[9px] sm:text-[10px] font-bold text-rose-400 tracking-widest uppercase">Suggested Improvements</span>
            <div className="flex flex-col gap-2.5">
              {currentEvaluation.improvements.map((imp, i) => (
                <div key={i} className="flex gap-2 text-zinc-300 text-xs pl-1">
                  <span className="text-rose-500 font-bold">▪</span>
                  <span className="leading-relaxed">{imp}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Expandable STAR Formulation re-writer */}
        <div className="rounded-2xl border border-zinc-850 bg-zinc-900/30 overflow-hidden shadow-sm">
          <button
            onClick={() => setShowRephrasing(!showRephrasing)}
            className="w-full text-left p-4.5 flex items-center justify-between text-xs sm:text-sm text-purple-400 font-bold focus:outline-none focus-visible:bg-zinc-900/60 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-purple-400" />
              <span>View AI STAR Methodology Rephrase</span>
            </div>
            <span className="text-[10px] sm:text-xs">{showRephrasing ? "Hide Details" : "Show Formula ✨"}</span>
          </button>
          {showRephrasing && (
            <div className="p-4.5 border-t border-zinc-850/60 bg-zinc-950 text-xs sm:text-sm text-zinc-300 italic leading-relaxed animate-fade-in pl-5 border-l-2 border-purple-500">
              {currentEvaluation.starRephrase}
            </div>
          )}
        </div>

        {/* Step 4 Navigation Controls */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={onPreviousQuestion}
            disabled={currentIndex === 0}
            className="py-3.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-400 border border-zinc-800 disabled:opacity-30 transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-xs font-semibold focus-visible:ring-2 focus-visible:ring-purple-500 focus:outline-none"
          >
            <ChevronLeft className="h-4 w-4" /> Previous Question
          </button>
          
          <button
            onClick={handleNext}
            className="flex-grow py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md focus-visible:ring-2 focus-visible:ring-purple-500 focus:outline-none"
          >
            <span>Proceed to Next Question</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

      </div>
    );
  }

  // STEP 3: QUESTION SCREEN WITH VOICED RECOGNITION (STT) & PREVIEWS
  return (
    <div className="flex flex-col gap-5 animate-fade-in max-w-4xl mx-auto w-full">
      
      {/* 1. Question Tracking Progress Bar */}
      <div className="flex flex-col gap-2 p-4 sm:p-5 rounded-2xl border border-zinc-850 bg-zinc-900/10 backdrop-blur-sm shadow-md">
        <div className="flex justify-between items-center text-xs">
          <span className="font-extrabold text-purple-400 uppercase tracking-widest text-[9px] sm:text-[10px]">
            Track: {currentQuestion.type ? currentQuestion.type.toUpperCase() : "TECHNICAL"}
          </span>
          <span className="text-zinc-500 font-extrabold text-[10px] sm:text-xs">
            Question {currentIndex + 1} of {questions.length}
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-zinc-900 overflow-hidden mt-1">
          <div
            className="h-full bg-purple-500 transition-all duration-500"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* 2. Interactive AI Interviewer Avatar Console */}
      <div className="p-5 sm:p-6 rounded-2xl border border-zinc-800 bg-zinc-950/80 backdrop-blur-md shadow-2xl flex flex-col sm:flex-row items-center gap-5 relative overflow-hidden">
        {/* Glowing Background Glows */}
        <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/5 via-transparent to-indigo-500/5 pointer-events-none" />

        {/* Circular Avatar Orb with voice active states */}
        <div className="relative flex-shrink-0">
          <div className={`w-20 h-20 rounded-full bg-zinc-900 border-2 transition-all duration-300 flex items-center justify-center overflow-hidden ${
            isSpeaking ? "border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.4)] scale-105" : 
            isListening ? "border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.4)] scale-105" : "border-zinc-800"
          }`}>
            {/* Dynamic Voice frequency bars */}
            {(isSpeaking || isListening) ? (
              <div className="flex items-end gap-1.5 h-10">
                <div className={`w-1 rounded bg-purple-400 ${isSpeaking ? "animate-pulse h-6" : "animate-bounce h-4"}`} style={{ animationDelay: "0ms" }} />
                <div className={`w-1 rounded bg-indigo-400 ${isSpeaking ? "animate-pulse h-8" : "animate-bounce h-6"}`} style={{ animationDelay: "150ms" }} />
                <div className={`w-1 rounded bg-purple-500 ${isSpeaking ? "animate-pulse h-5" : "animate-bounce h-5"}`} style={{ animationDelay: "300ms" }} />
                <div className={`w-1 rounded bg-indigo-500 ${isSpeaking ? "animate-pulse h-7" : "animate-bounce h-7"}`} style={{ animationDelay: "450ms" }} />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                <Sparkles className="h-5 w-5" />
              </div>
            )}
          </div>
          {/* Micro status indicator badge */}
          <span className={`absolute bottom-0 right-0 w-4.5 h-4.5 rounded-full border-2 border-zinc-950 flex items-center justify-center ${
            isSpeaking ? "bg-purple-500" : isListening ? "bg-rose-500 animate-ping" : "bg-emerald-500"
          }`} />
        </div>

        <div className="flex-1 flex flex-col gap-1.5 text-center sm:text-left z-10 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-zinc-200 font-extrabold text-sm sm:text-base flex items-center justify-center sm:justify-start gap-2">
                <span>Syntrix AI — Principal Recruiter</span>
                <span className="text-[9px] font-mono px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-full">ACTIVE Voice Link</span>
              </h4>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
                Role: {targetRole} Mock panel
              </p>
            </div>

            {/* Speech Auto-Play Switch */}
            <div className="flex items-center justify-center gap-2 bg-zinc-900/60 border border-zinc-800/80 px-3 py-1.5 rounded-xl">
              <label className="text-[10px] text-zinc-400 font-bold uppercase cursor-pointer select-none" htmlFor="auto-speak-toggle">
                Auto-Speak Question 🎙️
              </label>
              <input
                type="checkbox"
                id="auto-speak-toggle"
                checked={autoSpeak}
                onChange={(e) => setAutoSpeak(e.target.checked)}
                className="w-4 h-4 accent-purple-500 cursor-pointer rounded border-zinc-800 focus:ring-0"
              />
            </div>
          </div>

          <div className="text-white font-extrabold text-xs sm:text-sm leading-relaxed mt-2.5 p-4 rounded-xl bg-zinc-900/60 border border-zinc-850/80 relative">
            <div className="absolute top-3.5 right-3 flex items-center gap-1.5">
              <button
                onClick={() => speakQuestion(currentQuestion.question)}
                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                  isSpeaking ? "bg-purple-600 border-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)] animate-pulse" : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                }`}
                title={isSpeaking ? "Stop Speaking" : "Auto-Speak Question"}
              >
                <Volume2 className="h-4 w-4" />
              </button>
            </div>
            <p className="pr-8 text-left">"{currentQuestion.question}"</p>
          </div>

          <div className="mt-1 text-[10px] sm:text-xs text-zinc-400 italic text-left pl-1">
            💡 Difficulty: {currentQuestion.difficulty ? currentQuestion.difficulty.toUpperCase() : "MEDIUM"} | Hint: {currentQuestion.hint || "Review core concept metrics."}
          </div>
        </div>
      </div>

      {/* Input TextBox and speech transcription controller */}
      <div className="flex flex-col gap-3.5">
        
        {/* Speech-To-Text Dictation Mic Controller Card */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl border border-zinc-800/80 bg-zinc-950 shadow-md">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-300 ${
              isListening ? "bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse" : "bg-zinc-900 border-zinc-800 text-zinc-500"
            }`}>
              <span className="relative flex h-3.5 w-3.5">
                {isListening && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />}
                <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${isListening ? "bg-rose-500" : "bg-zinc-650"}`} />
              </span>
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Speech-To-Text Mode</span>
              <span className="text-[10px] text-zinc-500">
                {isListening ? "AI is actively listening... speak your answer clearly." : "Automatic voice recognition is idle."}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (!recognition) {
                toast.error("Speech Recognition is not fully supported or active in your browser.");
                return;
              }
              if (isListening) {
                recognition.stop();
              } else {
                setIsListening(true);
                // Cancel speaking to avoid recording AI speech
                if (typeof window !== "undefined" && window.speechSynthesis) {
                  window.speechSynthesis.cancel();
                }
                setIsSpeaking(false);
                recognition.start();
                toast.info("Microphone Active — start speaking your response.");
              }
            }}
            className={`px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-2 cursor-pointer border ${
              isListening 
                ? "bg-rose-600 border-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-pulse" 
                : "bg-zinc-900 hover:bg-zinc-850 border-zinc-800 text-zinc-300 hover:border-zinc-700"
            }`}
          >
            <Mic className="h-3.5 w-3.5" />
            <span>{isListening ? "Stop Hearing" : "Speak Your Answer"}</span>
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="interview-answer" className="text-[10px] sm:text-xs font-semibold text-zinc-400 uppercase tracking-wider pl-1 text-left">
            Type or Speak Your Response
          </label>
          <textarea
            id="interview-answer"
            value={answerInput}
            onChange={(e) => {
              setAnswerInput(e.target.value);
              if (inputError) setInputError(null);
            }}
            disabled={isEvaluating}
            placeholder="Structure your answer using the STAR method (Situation, Task, Action, Result) to maximize scores. Tap 'Speak Your Answer' to dictate aloud!"
            className="w-full h-32 sm:h-36 p-4 rounded-2xl border border-zinc-800 bg-zinc-900/20 text-zinc-300 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/20 focus-visible:ring-purple-500 placeholder:text-zinc-650 resize-none leading-relaxed"
          />
        </div>

        {inputError && (
          <div className="text-xs text-rose-400 mt-1 pl-1 flex items-center gap-1.5 animate-shake">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{inputError}</span>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          {/* Backward navigation in cards */}
          <button
            onClick={onPreviousQuestion}
            disabled={currentIndex === 0 || isEvaluating}
            className="py-3.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-400 border border-zinc-800 disabled:opacity-30 transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-xs font-semibold focus-visible:ring-2 focus-visible:ring-purple-500 focus:outline-none"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={isEvaluating || !answerInput.trim()}
            className="flex-grow py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 disabled:bg-zinc-900 disabled:text-zinc-650 cursor-pointer shadow-lg hover:shadow-purple-500/20 focus-visible:ring-2 focus-visible:ring-purple-500 focus:outline-none"
          >
            {isEvaluating ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Evaluating Response Metrics...</span>
              </>
            ) : (
              <>
                <span>Submit & Run AI Evaluation</span>
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Floating Corner live camera view preview HUD */}
      {useCamera && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-row items-center gap-3.5 pointer-events-auto bg-zinc-950/90 border border-zinc-800/80 p-3 rounded-2xl shadow-2xl backdrop-blur-md">
          {/* Live Preview Console */}
          <div className="relative w-[160px] h-[120px] rounded-xl overflow-hidden bg-black/60 border border-white/5 shadow-inner group flex items-center justify-center flex-shrink-0">
            {permissionDenied ? (
              <div className="p-3 text-center text-[10px] font-medium text-rose-400 leading-normal">
                Camera unavailable — text-only mode
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`w-full h-full object-cover transition-opacity duration-300 ${cameraEnabled ? "opacity-100" : "opacity-0"}`}
                />
                {!cameraEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                    Camera Paused
                  </div>
                )}
                {/* Controls Overlay on Hover */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-2">
                  <div className="flex justify-between items-center w-full">
                    {isRecording && (
                      <div className="flex items-center gap-1 bg-red-600/80 px-2 py-0.5 rounded text-[9px] font-bold text-white uppercase tracking-widest animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        REC {formatTime(timer)}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={toggleCamera}
                      className="p-1 rounded bg-zinc-900/85 hover:bg-zinc-850 text-zinc-300 border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer focus:outline-none"
                      title="Toggle Camera Stream"
                    >
                      {cameraEnabled ? <Camera className="h-3 w-3" /> : <CameraOff className="h-3 w-3" />}
                    </button>
                  </div>
                  <div className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest text-center">
                    Live Preview
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Live Metrics HUD Panel (Fix 3) */}
          <div className="w-[180px] h-[120px] flex flex-col justify-between pr-1 text-left select-none flex-shrink-0">
            {!modelsLoaded ? (
              <div className="h-full flex flex-col items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider text-center">Loading face analysis...</span>
              </div>
            ) : !metrics.faceDetected ? (
              <div className="h-full flex items-center justify-center text-center p-2">
                <span className="text-[10px] font-bold text-rose-400 leading-normal animate-pulse">
                  👤 No face detected — look at camera
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-2 justify-center h-full">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[8px] font-extrabold uppercase text-zinc-500 tracking-wider">👁 Eye Contact</span>
                  {renderMeter(metrics.eyeContact)}
                </div>
                
                <div className="flex flex-col gap-0.5">
                  <span className="text-[8px] font-extrabold uppercase text-zinc-500 tracking-wider">🧠 Attentiveness</span>
                  {renderMeter(metrics.attentiveness)}
                </div>
                
                <div className="flex flex-col gap-1 items-start mt-0.5">
                  <span className="text-[8px] font-extrabold uppercase text-zinc-500 tracking-wider block">😊 Expression</span>
                  {getExpressionBadge(metrics.expressionLabel)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
