"use client";

import Link from "next/link";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo / Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(124,58,237,0.3)] group-hover:shadow-[0_0_20px_rgba(124,58,237,0.5)] transition-all duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent group-hover:to-zinc-200 transition-all duration-300">
            Syntrix <span className="text-purple-400">AI</span>
          </span>
        </Link>

        {/* Navigation Menu */}
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors duration-200">
            Home
          </Link>
          <Link href="/dashboard" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors duration-200">
            Dashboard
          </Link>
          <Link href="#" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors duration-200">
            ATS Analyzer
          </Link>
          <Link href="#" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors duration-200">
            AI Interviewer
          </Link>
        </nav>

        {/* Action Button */}
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm font-semibold text-zinc-300 hover:text-white px-4 py-2 transition-colors duration-200"
          >
            Sign In
          </Link>
          <Link
            href="/dashboard"
            className="hidden sm:inline-flex items-center justify-center text-sm font-semibold text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 px-4 py-2 rounded-xl transition-all duration-200 shadow-md"
          >
            Launch App
          </Link>
        </div>
      </div>
    </header>
  );
}
