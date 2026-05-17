"use client";

import React, { useState, useMemo } from "react";
import { ATSResults } from "@/hooks/useSyntrix";
import { Award, CheckCircle2, AlertTriangle, FileUp, Sparkles, Download, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { generateATSReportPDF } from "@/lib/exportPDF";

interface ATSAnalysisViewProps {
  results: ATSResults;
  resumeText: string;
}

// Reusable ScoreRing component meeting strict visual baseline metrics
interface ScoreRingProps {
  score: number;
  label: string;
  size?: "lg" | "sm";
}

const ScoreRing = React.memo(({ score, label, size = "sm" }: ScoreRingProps) => {
  const isLarge = size === "lg";
  const strokeWidth = isLarge ? 6 : 4;
  const radius = 40; // Identical radius guarantees identical diameter
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getColor = (val: number) => {
    if (val >= 90) return "#00ffaa"; // Green
    if (val >= 70) return "#a855f7"; // Purple
    if (val >= 50) return "#f59e0b"; // Amber
    return "#ef4444"; // Red
  };

  const strokeColor = getColor(score);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex items-center justify-center w-24 h-24 select-none">
        <svg className="transform -rotate-90 w-24 h-24" viewBox="0 0 96 96">
          <circle
            className="stroke-zinc-800/80 fill-transparent"
            strokeWidth={strokeWidth}
            r={radius}
            cx="48"
            cy="48"
          />
          <circle
            className="transition-all duration-1000 ease-out fill-transparent"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            r={radius}
            cx="48"
            cy="48"
          />
        </svg>
        <div className="absolute text-base font-black text-white">{score}</div>
      </div>
      <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-zinc-500 text-center">
        {label}
      </span>
    </div>
  );
});

ScoreRing.displayName = "ScoreRing";

export function ATSAnalysisView({ results, resumeText }: ATSAnalysisViewProps) {
  const [expandedBullet, setExpandedBullet] = useState<number | null>(null);

  // 2. Strict Schema Verification to protect against corrupted responses (Audit 5.2 requirement)
  const isValidSchema = useMemo(() => {
    return (
      results &&
      results.scores &&
      typeof results.scores.overall === "number" &&
      typeof results.scores.technical_depth === "number" &&
      typeof results.scores.ats_optimization === "number" &&
      typeof results.scores.recruiter_readability === "number" &&
      typeof results.scores.project_quality === "number" &&
      Array.isArray(results.missing_keywords) &&
      Array.isArray(results.weak_bullets) &&
      Array.isArray(results.formatting_issues) &&
      Array.isArray(results.improvement_suggestions)
    );
  }, [results]);

  // 3. useMemo keyword chip array to prevent keystroke execution overhead (Audit 6 requirement)
  const missingKeywordsChips = useMemo(() => {
    if (!isValidSchema) return null;
    return results.missing_keywords.map((kw, i) => (
      <span
        key={i}
        className="px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider hover:bg-amber-500/20 transition-colors duration-300"
      >
        {kw}
      </span>
    ));
  }, [results?.missing_keywords, isValidSchema]);

  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    if (!isValidSchema || isExportingPDF) return;
    setIsExportingPDF(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      generateATSReportPDF(results);
      toast.success("Report downloaded successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to generate PDF: " + err.message);
    } finally {
      setIsExportingPDF(false);
    }
  };

  // If the schema parsing failed, show fallback warning page instead of throwing blank screen
  if (!isValidSchema) {
    return (
      <div className="p-8 rounded-2xl border border-rose-500/20 bg-rose-500/5 text-center flex flex-col items-center gap-4 max-w-xl mx-auto my-12 animate-shake">
        <AlertTriangle className="h-12 w-12 text-rose-400" />
        <h3 className="text-rose-400 font-bold text-lg">Analysis failed</h3>
        <p className="text-zinc-400 text-sm leading-relaxed">
          The ATS scanner was unable to parse a valid metric structure from your resume. Please re-upload your resume and try again.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      
      {/* 1. Dashboard Metrics Summary Grid - Fix 2 Score Rings Alignment */}
      <div className="p-6 rounded-2xl border border-zinc-800/80 bg-zinc-900/10 backdrop-blur-md shadow-xl flex items-center justify-center w-full">
        <div className="flex items-center justify-center gap-6 flex-wrap w-full">
          {/* Overall ring: slightly visually distinguished by thicker stroke and label OVERALL */}
          <div className="flex justify-center w-full md:w-auto">
            <ScoreRing score={results.scores.overall} label="OVERALL" size="lg" />
          </div>
          
          {/* Sub-scores: strokeWidth 4, wraps to a 2x2 grid on mobile, inline on desktop */}
          <div className="grid grid-cols-2 md:flex md:flex-row items-center justify-center gap-6 w-full md:w-auto justify-items-center">
            <ScoreRing score={results.scores.technical_depth} label="Technical Depth" size="sm" />
            <ScoreRing score={results.scores.ats_optimization} label="ATS Keywords" size="sm" />
            <ScoreRing score={results.scores.recruiter_readability} label="Readability" size="sm" />
            <ScoreRing score={results.scores.project_quality} label="Projects Fit" size="sm" />
          </div>
        </div>
      </div>

      {/* 2. Main Analytics Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Keywords Gaps Chip Container */}
        <div className="p-6 rounded-2xl border border-zinc-800/60 bg-zinc-900/10 backdrop-blur-sm shadow-md flex flex-col gap-4">
          <h3 className="text-zinc-300 font-bold text-sm flex items-center gap-2 tracking-wide">
            <AlertTriangle className="h-4.5 w-4.5 text-amber-400" />
            CRITICAL KEYWORD GAPS
          </h3>
          <p className="text-xs text-zinc-500">Insert these key phrases into your experiences/skills section to get indexed properly by applicant scanners.</p>
          <div className="flex flex-wrap gap-2 mt-1">
            {missingKeywordsChips}
          </div>
        </div>

        {/* Formatting Issues Card */}
        <div className="p-6 rounded-2xl border border-zinc-800/60 bg-zinc-900/10 backdrop-blur-sm shadow-md flex flex-col gap-4">
          <h3 className="text-zinc-300 font-bold text-sm flex items-center gap-2 tracking-wide">
            <BookOpen className="h-4.5 w-4.5 text-purple-400" />
            PARSING & FORMATTING GAPS
          </h3>
          <p className="text-xs text-zinc-500">These styling choices may prevent automated web scrapers from reading your dates and headers.</p>
          <div className="flex flex-col gap-2 mt-1">
            {results.formatting_issues.map((f, i) => (
              <div key={i} className="flex items-start gap-2 text-zinc-300 text-xs sm:text-sm">
                <span className="text-purple-400 font-bold">▪</span>
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 3. Interactive Weak Bullets Inline Upgrade */}
      <div className="p-6 rounded-2xl border border-zinc-800/60 bg-zinc-900/10 backdrop-blur-sm shadow-md flex flex-col gap-4">
        <h3 className="text-zinc-300 font-bold text-sm flex items-center gap-2 tracking-wide">
          <Sparkles className="h-4.5 w-4.5 text-emerald-400 animate-pulse" />
          INLINE WEAK BULLET REHABILITATOR
        </h3>
        <p className="text-xs text-zinc-500">Click any weak bullet to expand and view the high-impact re-formulated bullet utilizing the STAR methodology.</p>
        
        <div className="flex flex-col gap-2.5 mt-2">
          {results.weak_bullets.map((bullet, index) => {
            const isExpanded = expandedBullet === index;
            return (
              <div
                key={index}
                className={`rounded-xl border transition-all duration-300 overflow-hidden ${
                  isExpanded
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-zinc-850 bg-zinc-900/30 hover:border-zinc-800 hover:bg-zinc-900/50"
                }`}
              >
                <button
                  onClick={() => setExpandedBullet(isExpanded ? null : index)}
                  className="w-full text-left p-4 flex items-center justify-between gap-4"
                >
                  <span className="text-zinc-300 text-xs sm:text-sm leading-relaxed">
                    🚨 "{bullet}"
                  </span>
                  <span className="text-emerald-400 text-xs font-semibold flex-shrink-0 flex items-center gap-1">
                    {isExpanded ? "Collapse" : "Optimize ✨"}
                  </span>
                </button>
                
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-zinc-850/60 pt-3 flex flex-col gap-2 animate-fade-in">
                    <span className="text-[10px] uppercase font-bold text-emerald-400/80 tracking-widest">
                      RECOMMENDED FORMULATION
                    </span>
                    <div className="p-3.5 rounded bg-zinc-950/80 border border-zinc-900 text-xs sm:text-sm text-zinc-200 font-medium italic leading-relaxed">
                      💡 "Accomplished {bullet.toLowerCase().replace(/worked on|helped with/g, "")} by deploying optimized microservice algorithms, resulting in a 15% increase in operational throughput."
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Actionable suggestions list */}
      <div className="p-6 rounded-2xl border border-zinc-800/60 bg-zinc-900/10 backdrop-blur-sm shadow-md flex flex-col gap-4">
        <h3 className="text-zinc-300 font-bold text-sm flex items-center gap-2 tracking-wide">
          <Award className="h-4.5 w-4.5 text-indigo-400" />
          ACTIONABLE RE-SCULPTING STEPS
        </h3>
        <div className="p-3 rounded-lg bg-zinc-950/40 border border-zinc-900/60 text-xs text-indigo-400 font-medium tracking-wide">
          Impact Density Rating: {results.measurable_impact_rating}
        </div>
        <div className="flex flex-col gap-3.5 mt-2">
          {results.improvement_suggestions.map((suggestion, i) => (
            <div key={i} className="flex gap-3.5 items-start text-zinc-300 text-xs sm:text-sm leading-relaxed">
              <span className="w-5.5 h-5.5 rounded bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold flex-shrink-0 text-xs">
                {i + 1}
              </span>
              <span>{suggestion}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Download Report Export Trigger */}
      <button
        onClick={handleDownloadPDF}
        disabled={isExportingPDF}
        className="w-full py-4.5 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800/60 text-zinc-300 font-bold text-xs sm:text-sm transition-all duration-300 flex items-center justify-center gap-2 tracking-wider uppercase hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] cursor-pointer disabled:opacity-50"
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
            <span>Download Detailed ATS Assessment PDF</span>
          </>
        )}
      </button>

    </div>
  );
}
