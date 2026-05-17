"use client";

import React, { useState } from "react";
import { JDMatchResults } from "@/hooks/useSyntrix";
import { CheckCircle2, AlertTriangle, Target, Award, BookOpen, Compass, Download } from "lucide-react";
import { toast } from "sonner";
import { generateJDReportPDF } from "@/lib/exportPDF";

interface JDMatchViewProps {
  results: JDMatchResults;
}

export function JDMatchView({ results }: JDMatchViewProps) {
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    if (isExportingPDF) return;
    setIsExportingPDF(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      generateJDReportPDF(results, "Executive Candidate", "Target Professional Role");
      toast.success("Job Description Report downloaded successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to generate PDF: " + err.message);
    } finally {
      setIsExportingPDF(false);
    }
  };
  // Reusable mini radial meter
  const RadialMeter = ({ value, label, color = "purple" }: { value: number; label: string; color?: "purple" | "emerald" }) => {
    const radius = 40;
    const stroke = 5;
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (value / 100) * circumference;

    const strokeColor = color === "emerald" ? "stroke-emerald-500 text-emerald-400" : "stroke-purple-500 text-purple-400";

    return (
      <div className="flex flex-col items-center gap-2 bg-zinc-950/40 p-4 rounded-xl border border-zinc-900/60 flex-1">
        <div className="relative flex items-center justify-center">
          <svg className="transform -rotate-90 w-20 h-20">
            <circle
              className="stroke-zinc-900 fill-transparent"
              strokeWidth={stroke}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
            <circle
              className={`transition-all duration-1000 ease-out fill-transparent ${strokeColor}`}
              strokeWidth={stroke}
              strokeDasharray={circumference + " " + circumference}
              style={{ strokeDashoffset }}
              strokeLinecap="round"
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
          </svg>
          <div className="absolute text-sm font-black text-white">{value}%</div>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      
      {/* 1. Dials Grid */}
      <div className="flex flex-col sm:flex-row gap-4">
        <RadialMeter value={results.match_percentage} label="Role Alignment" />
        <RadialMeter value={results.confidence_score} label="AI Match Confidence" color="emerald" />
      </div>

      {/* 2. Structured Alignment Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Experience alignment */}
        <div className="p-5 rounded-xl bg-zinc-900/10 border border-zinc-850 flex flex-col gap-2">
          <span className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-purple-400" /> EXPERIENCE ALIGNMENT
          </span>
          <p className="text-zinc-200 text-xs sm:text-sm leading-relaxed mt-1">
            {results.experience_alignment}
          </p>
        </div>

        {/* Skill gaps analysis */}
        <div className="p-5 rounded-xl bg-zinc-900/10 border border-zinc-850 flex flex-col gap-2">
          <span className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase flex items-center gap-1.5">
            <Compass className="h-3.5 w-3.5 text-emerald-400" /> KEY GAP SUMMARY
          </span>
          <p className="text-zinc-200 text-xs sm:text-sm leading-relaxed mt-1">
            {results.skill_gap_analysis}
          </p>
        </div>

      </div>

      {/* 3. Skill Overlap Tag Chips */}
      <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/10 backdrop-blur-sm shadow-md flex flex-col gap-5">
        <h3 className="text-zinc-300 font-bold text-sm flex items-center gap-2">
          <Award className="h-4.5 w-4.5 text-indigo-400" />
          TECHNICAL SKILLS ALIGNMENT OVERLAP
        </h3>

        <div className="flex flex-col gap-4">
          
          {/* Matched skills */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest pl-0.5">Matched Capabilities ({results.matched_skills.length})</span>
            <div className="flex flex-wrap gap-2">
              {results.matched_skills.map((skill, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold flex items-center gap-1"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Missing skills */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest pl-0.5">Target Skill Gaps ({results.missing_skills.length})</span>
            <div className="flex flex-wrap gap-2">
              {results.missing_skills.map((skill, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-semibold flex items-center gap-1"
                >
                  <AlertTriangle className="h-3 w-3" />
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Transferable skills */}
          {results.transferable_skills && results.transferable_skills.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest pl-0.5">Transferable / Parallel Strengths</span>
              <div className="flex flex-wrap gap-2">
                {results.transferable_skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-semibold"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* 4. Actionable Improvements & Predicted Interview Topics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Recommended Improvements */}
        <div className="p-5 rounded-xl bg-zinc-900/10 border border-zinc-850 flex flex-col gap-3">
          <span className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase">
            Optimization Steps
          </span>
          <div className="flex flex-col gap-2">
            {results.recommended_improvements.map((rec, i) => (
              <div key={i} className="flex gap-2.5 items-start text-zinc-300 text-xs sm:text-sm leading-relaxed">
                <span className="text-purple-400 font-bold">•</span>
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Likely Interview Topics */}
        <div className="p-5 rounded-xl bg-zinc-900/10 border border-zinc-850 flex flex-col gap-3">
          <span className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-indigo-400" /> PREDICTED INTERVIEW FOCUS
          </span>
          <p className="text-xs text-zinc-500">Prepare for in-depth assessments on these conceptual themes.</p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {results.likely_interview_topics.map((topic, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>

      </div>

      {/* 5. Download Report Export Trigger */}
      <button
        onClick={handleDownloadPDF}
        disabled={isExportingPDF}
        className="w-full py-4.5 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800/60 text-zinc-300 font-bold text-xs sm:text-sm transition-all duration-300 flex items-center justify-center gap-2 tracking-wider uppercase hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] cursor-pointer disabled:opacity-50 mt-2"
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
            <span>Download Job Description Match PDF</span>
          </>
        )}
      </button>

    </div>
  );
}
