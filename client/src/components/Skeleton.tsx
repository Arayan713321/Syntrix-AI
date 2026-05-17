"use client";

import React from "react";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-zinc-900/60 border border-zinc-800/40 relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-zinc-800/10 before:to-transparent ${className}`}
    />
  );
}

export function ScoreRingSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl border border-zinc-900 bg-zinc-900/10 backdrop-blur-sm animate-pulse">
      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-zinc-900 border-4 border-zinc-800 flex items-center justify-center" />
      <div className="flex-1 flex flex-col gap-2.5 w-full">
        <div className="h-4 w-1/3 bg-zinc-800 rounded" />
        <div className="h-6 w-2/3 bg-zinc-800 rounded" />
        <div className="h-3 w-full bg-zinc-800 rounded" />
        <div className="h-3 w-5/6 bg-zinc-850 rounded" />
      </div>
    </div>
  );
}

export function ListSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-3 w-full animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="flex gap-3 items-center">
          <div className="w-5 h-5 rounded bg-zinc-800 flex-shrink-0" />
          <div className="h-4 bg-zinc-800 rounded w-full" style={{ width: `${100 - i * 12}%` }} />
        </div>
      ))}
    </div>
  );
}
