"use client";

import React, { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useSyntrix } from "@/hooks/useSyntrix";
import { DragDropZone } from "@/features/upload/DragDropZone";
const ATSAnalysisView = React.lazy(() => import("@/features/ats/ATSAnalysisView").then(module => ({ default: module.ATSAnalysisView })));
const JDMatchView = React.lazy(() => import("@/features/ats/JDMatchView").then(module => ({ default: module.JDMatchView })));
const RAGChatView = React.lazy(() => import("@/features/chat/RAGChatView").then(module => ({ default: module.RAGChatView })));
const InterviewSimulatorView = React.lazy(() => import("@/features/interview/InterviewSimulatorView").then(module => ({ default: module.InterviewSimulatorView })));
import { ScoreRingSkeleton, ListSkeleton } from "@/components/Skeleton";
import { Toaster, toast } from "sonner";
import { Award, Compass, MessageSquare, Play, HelpCircle, Activity, Sparkles, RefreshCw, LogOut, User } from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  const { data: session } = useSession();
  
  const {
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
    scanResume,
    matchJob,
    askQuestion,
    startInterview,
    submitAnswer,
  } = useSyntrix();

  const [pastedJD, setPastedJD] = useState("");
  const [activeTab, setActiveTab] = useState<"analysis" | "chat" | "interview">("analysis");

  // Handle file uploads
  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    toast.success(`Loaded file: ${selectedFile.name}`);
  };

  // Run AI processing
  const handleProcess = async () => {
    if (!file) {
      toast.error("Please drag or select a PDF resume first.");
      return;
    }

    if (activeMode === "parser") {
      toast.info("Synthesizing ATS scanner scores...");
      await scanResume(file);
      toast.success("ATS Analysis completed!");
    } else if (activeMode === "matcher") {
      if (!pastedJD.trim()) {
        toast.error("Job Description is required for matching mode.");
        return;
      }
      toast.info("Calculating JD embedding alignment...");
      await matchJob(file, pastedJD);
      toast.success("Job Match completed!");
      setActiveTab("analysis");
    }
  };

  // Reset active session
  const handleReset = () => {
    setFile(null);
    setPastedJD("");
    setError(null);
    toast.info("Active session reset successfully.");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col pb-12">
      <Toaster theme="dark" position="top-right" closeButton />
      
      {/* 1. Glassmorphic Sticky Header */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="text-xl font-black bg-gradient-to-r from-purple-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent tracking-tight">
                SYNTRIX AI
              </span>
            </Link>
            <span className="hidden sm:inline-block text-[9px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
              SaaS Suite
            </span>
          </div>

          <div className="flex items-center gap-3.5">
            {/* Authenticated User Identity pill (Fix 2 requirement) */}
            {session?.user && (
              <div className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-800 p-1 pl-2.5 pr-3 rounded-full shadow-inner select-none animate-fade-in text-left">
                <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-[9px] font-black text-white shadow-md">
                  {session.user.name ? session.user.name[0].toUpperCase() : session.user.email?.[0].toUpperCase() || "U"}
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-extrabold text-zinc-300 tracking-tight leading-none">
                    {session.user.name || session.user.email?.split("@")[0]}
                  </span>
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest leading-none mt-0.5">
                    Candidate
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={() => signOut({ callbackUrl: "/auth" })}
              className="px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors text-xs font-semibold cursor-pointer flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-purple-500"
              aria-label="Sign out session"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Page Sub-Header Metrics Bar */}
      <section className="border-b border-zinc-900 bg-zinc-950/30 py-4.5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-white tracking-tight">Executive Assessment Center</h1>
            <p className="text-xs text-zinc-500">Real-time vector indexing and technical skill gap analysis.</p>
          </div>

          {/* Active Session Stats Tracker */}
          <div className="flex items-center gap-6 p-2 px-4 rounded-xl bg-zinc-900/40 border border-zinc-900/80 text-xs sm:text-sm">
            <div className="flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-purple-400" />
              <span className="text-zinc-500 font-medium">Vector DB:</span>
              <span className={`font-semibold ${resumeText ? "text-emerald-400" : "text-zinc-500"}`}>
                {resumeText ? "INDEXED" : "EMPTY"}
              </span>
            </div>
            <div className="w-px h-4 bg-zinc-850" />
            <div className="flex items-center gap-1.5">
              <Award className="h-4 w-4 text-emerald-400" />
              <span className="text-zinc-500 font-medium">Alignment Score:</span>
              <span className="font-bold text-white">
                {matchResults ? `${matchResults.match_percentage}%` : atsResults ? `${atsResults.scores.overall}%` : "—"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Main Dashboard Double Panel Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
        
        {/* LEFT COLUMN: Input controls and file zones (Span 5) */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Mode Switch Cards */}
          <div className="p-5 rounded-2xl border border-zinc-900 bg-zinc-900/20 backdrop-blur-sm flex flex-col gap-3">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest pl-0.5">
              SELECT SUITE CAPABILITY
            </h3>
            
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => { setActiveMode("parser"); setError(null); }}
                className={`py-3 px-1 rounded-xl text-center font-bold text-[11px] sm:text-xs transition-all duration-300 flex flex-col items-center gap-1.5 border ${
                  activeMode === "parser"
                    ? "bg-purple-600/10 border-purple-500 text-purple-300 shadow-md"
                    : "bg-zinc-950/40 border-zinc-900 text-zinc-500 hover:text-zinc-300 hover:border-zinc-800"
                }`}
              >
                <Award className="h-4.5 w-4.5" />
                <span>ATS Scanner</span>
              </button>
              
              <button
                onClick={() => { setActiveMode("matcher"); setError(null); }}
                className={`py-3 px-1 rounded-xl text-center font-bold text-[11px] sm:text-xs transition-all duration-300 flex flex-col items-center gap-1.5 border ${
                  activeMode === "matcher"
                    ? "bg-purple-600/10 border-purple-500 text-purple-300 shadow-md"
                    : "bg-zinc-950/40 border-zinc-900 text-zinc-500 hover:text-zinc-300 hover:border-zinc-800"
                }`}
              >
                <Compass className="h-4.5 w-4.5" />
                <span>JD Matcher</span>
              </button>

              <button
                onClick={() => { setActiveMode("interview"); setError(null); }}
                className={`py-3 px-1 rounded-xl text-center font-bold text-[11px] sm:text-xs transition-all duration-300 flex flex-col items-center gap-1.5 border ${
                  activeMode === "interview"
                    ? "bg-purple-600/10 border-purple-500 text-purple-300 shadow-md"
                    : "bg-zinc-950/40 border-zinc-900 text-zinc-500 hover:text-zinc-300 hover:border-zinc-800"
                }`}
              >
                <MessageSquare className="h-4.5 w-4.5" />
                <span>Mock Panel</span>
              </button>
            </div>
          </div>

          {/* Job Description Pasting Drawer */}
          {activeMode === "matcher" && (
            <div className="flex flex-col gap-2.5 animate-fade-in">
              <label className="text-[11px] font-bold text-zinc-400 tracking-wider uppercase pl-0.5">
                Target Role Specifications
              </label>
              <textarea
                value={pastedJD}
                onChange={(e) => setPastedJD(e.target.value)}
                placeholder="Paste requirements, tech stack, and qualifications requested for the job description comparison..."
                className="w-full h-36 p-4 rounded-xl border border-zinc-900 bg-zinc-900/20 text-zinc-300 focus:outline-none focus:ring-1 focus:ring-purple-500/20 text-xs sm:text-sm resize-none placeholder:text-zinc-650 leading-relaxed scrollbar-thin"
              />
            </div>
          )}

          {/* File Upload Zone */}
          {activeMode !== "interview" && (
            <DragDropZone
              onFileSelect={handleFileSelect}
              selectedFile={file}
              isLoading={isLoading}
            />
          )}

          {/* Error notifications */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs sm:text-sm animate-shake">
              <span>⚠️ {error}</span>
            </div>
          )}

          {/* Execution Button */}
          {activeMode !== "interview" && (
            <div className="flex gap-2">
              {file && (
                <button
                  onClick={handleReset}
                  className="p-4 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors flex items-center justify-center cursor-pointer"
                >
                  <RefreshCw className="h-4.5 w-4.5" />
                </button>
              )}
              <button
                onClick={handleProcess}
                disabled={isLoading || !file || (activeMode === "matcher" && !pastedJD.trim())}
                className={`flex-1 py-4 px-6 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
                  isLoading
                    ? "bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed"
                    : file
                    ? "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/15"
                    : "bg-zinc-900 text-zinc-650 border border-zinc-900 cursor-not-allowed"
                }`}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4.5 w-4.5 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Processing Embeddings...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4.5 w-4.5" />
                    <span>
                      {activeMode === "parser" ? "Execute ATS Scanner" : "Execute Alignment & RAG"}
                    </span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Quick Guidance Card */}
          <div className="p-5 rounded-2xl border border-zinc-900 bg-zinc-950/40 text-zinc-500 text-xs leading-relaxed">
            📝 <strong className="text-zinc-400 font-semibold">Usage Tips:</strong> Upload a PDF resume in Scanner mode to get overall performance breakdowns. Select Matcher mode to evaluate alignment overlays and unlock the Vector RAG career advisor chatbot. Set to Mock mode to rehearse panel questions!
          </div>

        </section>

        {/* RIGHT COLUMN: Real-Time Results & Chats (Span 7) */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Active result loader */}
          {isLoading || isGeneratingQuestions ? (
            <div className="flex flex-col gap-6">
              <ScoreRingSkeleton />
              <ListSkeleton lines={5} />
            </div>
          ) : activeMode === "parser" && atsResults ? (
            // Mode 1: ATS scanner results
            <React.Suspense fallback={<div className="flex flex-col gap-6"><ScoreRingSkeleton /><ListSkeleton lines={5} /></div>}>
              <ATSAnalysisView results={atsResults} resumeText={resumeText} />
            </React.Suspense>
          ) : activeMode === "matcher" && matchResults ? (
            // Mode 2: Matcher tabbed panel (results + RAG chat)
            <div className="flex flex-col gap-5">
              <div className="flex border-b border-zinc-900 gap-1 sm:gap-2">
                <button
                  onClick={() => setActiveTab("analysis")}
                  className={`pb-3 px-4 font-bold text-xs sm:text-sm relative transition-all ${
                    activeTab === "analysis"
                      ? "text-purple-400 border-b-2 border-purple-500"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  🎯 Profile Match
                </button>
                <button
                  onClick={() => setActiveTab("chat")}
                  className={`pb-3 px-4 font-bold text-xs sm:text-sm relative transition-all ${
                    activeTab === "chat"
                      ? "text-purple-400 border-b-2 border-purple-500"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  💬 AI Vector Advisor
                </button>
              </div>

              <React.Suspense fallback={<ListSkeleton lines={5} />}>
                {activeTab === "analysis" ? (
                  <JDMatchView results={matchResults} />
                ) : (
                  <RAGChatView
                    chatHistory={chatHistory}
                    isChatting={isChatting}
                    onAskQuestion={askQuestion}
                    retrievalMode={retrievalMode}
                  />
                )}
              </React.Suspense>
            </div>
          ) : activeMode === "interview" ? (
            // Mode 3: Persistent Interview Q&A simulator card panel (Fix 3)
            <React.Suspense fallback={<ListSkeleton lines={5} />}>
              <InterviewSimulatorView
                questions={interviewQuestions}
                currentIndex={currentQuestionIndex}
                onStart={startInterview}
                onSubmitAnswer={submitAnswer}
                onNextQuestion={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                onPreviousQuestion={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                setCurrentIndex={setCurrentQuestionIndex}
                answers={interviewAnswers}
                evaluations={interviewEvaluations}
                isGenerating={isGeneratingQuestions}
                isEvaluating={isEvaluatingAnswer}
                hasResume={!!resumeText}
                incompleteSessionId={incompleteSessionId}
                onRestoreSession={restoreSession}
                setIncompleteSessionId={setIncompleteSessionId}
              />
            </React.Suspense>
          ) : (
            // Default Empty Guidance State
            <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-8 text-center flex flex-col items-center justify-center min-h-[400px] gap-4 shadow-inner relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-indigo-500/5 opacity-40 pointer-events-none" />
              <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-850 flex items-center justify-center text-zinc-500">
                <HelpCircle className="h-6 w-6" />
              </div>
              <div className="flex flex-col gap-1 z-10">
                <h3 className="text-zinc-300 font-bold text-sm sm:text-base">No Active Scan Session</h3>
                <p className="text-zinc-500 text-xs max-w-sm leading-normal">
                  Upload a PDF resume from the control panel and click process to generate structured AI matrices, vector chat indexes, and custom interview simulators.
                </p>
              </div>
            </div>
          )}

        </section>

      </main>

    </div>
  );
}
