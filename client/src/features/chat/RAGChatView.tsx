"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChatMessage } from "@/hooks/useSyntrix";
import { MessageSquare, Send, Sparkles, User, HelpCircle, AlertTriangle, X, Database } from "lucide-react";
import { toast } from "sonner";

interface RAGChatViewProps {
  chatHistory: ChatMessage[];
  isChatting: boolean;
  onAskQuestion: (question: string) => void;
  retrievalMode: "chromadb" | "memory-fallback" | null;
}

// Sub-component to manage clean chat bubbles with markdown formatting and real-time streaming cursor
function ChatBubble({ content, role, isStreaming }: { content: string; role: "user" | "ai"; isStreaming: boolean }) {
  
  // Custom markdown parser
  const formatMarkdown = (text: string) => {
    if (!text && isStreaming) return <p className="text-zinc-500 italic text-xs animate-pulse">Consulting vector store...</p>;
    
    return text.split("\n").map((line, index) => {
      const cleanLine = line.trim();
      if (!cleanLine) return <div key={index} className="h-2" />;

      if (cleanLine.startsWith("###") || cleanLine.match(/^\d+\.\s/)) {
        return (
          <h4 key={index} className="text-sm sm:text-base font-bold text-purple-300 mt-3 mb-1.5 flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-purple-500" />
            {cleanLine.replace(/^###\s*|^\d+\.\s*/, "")}
          </h4>
        );
      }

      if (cleanLine.startsWith("-") || cleanLine.startsWith("*")) {
        return (
          <li key={index} className="ml-4 list-disc text-zinc-300 my-0.5 leading-relaxed text-xs sm:text-sm pl-1">
            {cleanLine.substring(1).trim().replace(/\*\*(.*?)\*\*/g, "$1")}
          </li>
        );
      }

      // Inline strong tags replacing **text**
      const parts = cleanLine.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={index} className="text-zinc-300 leading-relaxed my-1 text-xs sm:text-sm inline">
          {parts.map((part, partIdx) => 
            partIdx % 2 === 1 ? <strong key={partIdx} className="text-purple-200 font-bold">{part}</strong> : part
          )}
        </p>
      );
    });
  };

  return (
    <div className={`flex flex-col max-w-[85%] ${role === "user" ? "ml-auto items-end animate-fade-in-up" : "mr-auto items-start"}`}>
      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1">
        {role === "user" ? (
          <>
            <User className="h-2.5 w-2.5" /> YOU
          </>
        ) : (
          <>
            <Sparkles className="h-2.5 w-2.5 text-purple-400" /> SYNTRIX AI ADVISOR
          </>
        )}
      </span>
      <div
        className={`p-4 rounded-2xl leading-relaxed relative ${
          role === "user"
            ? "bg-purple-600 text-white rounded-tr-none shadow-[0_4px_12px_rgba(124,58,237,0.25)]"
            : "bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-tl-none shadow-md"
        }`}
      >
        {formatMarkdown(content)}
        {isStreaming && (
          <span className="inline-block w-1.5 h-3.5 bg-purple-400 ml-1 rounded-sm animate-pulse align-middle" />
        )}
      </div>
    </div>
  );
}

export function RAGChatView({ chatHistory, isChatting, onAskQuestion, retrievalMode }: RAGChatViewProps) {
  const [question, setQuestion] = useState("");
  const [warningDismissed, setWarningDismissed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll as stream elements accumulate
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isChatting]);

  const handleSend = () => {
    if (!question.trim() || isChatting) return;
    onAskQuestion(question);
    setQuestion("");
  };

  const handlePromptChipClick = (prompt: string) => {
    if (isChatting) return;
    onAskQuestion(prompt);
  };

  const promptChips = [
    "Am I suitable for this role?",
    "Which skills should I improve?",
    "Predict 3 likely interview questions",
  ];

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950 p-5 flex flex-col gap-5 shadow-2xl min-h-[460px] animate-fade-in">
      
      {/* 1. Terminal Header with DB Status Indicator pills */}
      <div className="flex items-center justify-between pb-3.5 border-b border-zinc-900">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
          <span className="text-xs sm:text-sm font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-purple-400" />
            Vector Context-Aware Advisor Console
          </span>
        </div>
        
        {retrievalMode === "chromadb" ? (
          <span className="text-[9px] text-emerald-400 font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1">
            <Database className="h-2.5 w-2.5" /> SECURE VECTOR DB
          </span>
        ) : retrievalMode === "memory-fallback" ? (
          <span className="text-[9px] text-amber-400 font-mono px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center gap-1">
            <AlertTriangle className="h-2.5 w-2.5" /> FALLBACK INDEX
          </span>
        ) : (
          <span className="text-[9px] text-zinc-500 font-mono px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800">
            CONNECTING...
          </span>
        )}
      </div>

      {/* 2. Chat History Viewport */}
      <div className="flex-1 flex flex-col gap-4 overflow-y-auto max-h-[300px] p-2 pr-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        {chatHistory.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center my-auto p-4 gap-2">
            <HelpCircle className="h-8 w-8 text-zinc-700 animate-bounce" />
            <p className="text-zinc-500 text-xs sm:text-sm max-w-md leading-relaxed">
              Syntrix Vector DB chat has indexed your profile. Type a question or click one of the automated prompt chips below!
            </p>
          </div>
        )}
        
        {chatHistory.map((msg, i) => {
          const isLastMessage = i === chatHistory.length - 1;
          const isAIStream = isLastMessage && msg.role === "ai" && isChatting;
          
          return (
            <ChatBubble
              key={i}
              content={msg.content}
              role={msg.role}
              isStreaming={isAIStream}
            />
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. Predefined prompt chips */}
      <div className="flex flex-wrap gap-2 pt-3 border-t border-zinc-900/60">
        {promptChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handlePromptChipClick(chip)}
            disabled={isChatting}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="h-3 w-3 text-purple-400" />
            {chip}
          </button>
        ))}
      </div>

      {/* 4. Sleek Fallback Mode Info Banner */}
      {retrievalMode === "memory-fallback" && !warningDismissed && (
        <div className="p-3 rounded-xl bg-zinc-900/50 backdrop-blur-md border border-zinc-800/80 text-zinc-400 text-[11px] sm:text-xs flex items-center justify-between gap-3 animate-fade-in-up">
          <div className="flex items-center gap-2.5">
            <Database className="h-4 w-4 text-purple-400 flex-shrink-0 animate-pulse" />
            <span>Syntrix is running on high-speed local memory vector fallback. 100% search and indexing features remain fully active.</span>
          </div>
          <button
            onClick={() => setWarningDismissed(true)}
            className="text-zinc-500 hover:text-zinc-300 p-1 rounded cursor-pointer transition-colors"
            title="Dismiss status banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 5. Entry text field */}
      <div className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={isChatting ? "Streaming AI response..." : "Ask anything about your alignment, interview preparation, or skill paths..."}
          disabled={isChatting}
          aria-label="Ask a career intelligence question"
          className="flex-1 px-4.5 py-3 rounded-xl border border-zinc-800 bg-zinc-900/40 text-zinc-300 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/20 focus-visible:ring-purple-500 placeholder:text-zinc-600 disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={isChatting || !question.trim()}
          aria-label="Send message"
          className="px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs sm:text-sm transition-colors flex items-center justify-center disabled:bg-zinc-900 disabled:text-zinc-650 cursor-pointer focus-visible:ring-2 focus-visible:ring-purple-500"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

    </div>
  );
}
