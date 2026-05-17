import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import { Award, Compass, MessageSquare, ArrowRight, ShieldCheck, Zap, Database } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-purple-500/30 selection:text-purple-200 flex flex-col justify-between">
      {/* Sticky Header Navigation */}
      <Navbar />

      <main className="relative z-10 max-w-7xl mx-auto px-6 pb-24 flex flex-col gap-16 w-full">
        {/* Immersive Hero Copy & Glowing Indicators */}
        <Hero />

        {/* Dynamic CTA Launch Button */}
        <div className="flex justify-center -mt-6">
          <Link
            href="/dashboard"
            className="group relative px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-sm sm:text-base tracking-wider uppercase transition-all duration-300 shadow-[0_4px_30px_rgba(124,58,237,0.3)] hover:shadow-[0_0_35px_rgba(124,58,237,0.65)] hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2.5 cursor-pointer"
          >
            <span>Enter Executive Career Suite</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* 3 SaaS Features Display Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          
          {/* Card 1: ATS Scanner */}
          <div className="p-6.5 rounded-2xl border border-zinc-900 bg-zinc-900/10 backdrop-blur-sm shadow-md hover:border-zinc-800 transition-all duration-300 flex flex-col gap-4 group">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Award className="h-5 w-5" />
            </div>
            <h3 className="text-zinc-200 font-bold text-base sm:text-lg">ATS Optimization Engine</h3>
            <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
              Conduct deep structural resume scans covering technical depth, recruiter readability, and missing keywords. Features **interactive inline weak-bullet rewrites** based on the STAR methodology.
            </p>
          </div>

          {/* Card 2: JD Matcher */}
          <div className="p-6.5 rounded-2xl border border-zinc-900 bg-zinc-900/10 backdrop-blur-sm shadow-md hover:border-zinc-800 transition-all duration-300 flex flex-col gap-4 group">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Compass className="h-5 w-5" />
            </div>
            <h3 className="text-zinc-200 font-bold text-base sm:text-lg">Job Description Matcher</h3>
            <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
              Calculate semantic role alignments and overlay technical profiles with target job specifications. Instantly identifies capability gaps, transferable skills, and predicts conceptual interview focuses.
            </p>
          </div>

          {/* Card 3: Vector Chat & Simulator */}
          <div className="p-6.5 rounded-2xl border border-zinc-900 bg-zinc-900/10 backdrop-blur-sm shadow-md hover:border-zinc-800 transition-all duration-300 flex flex-col gap-4 group">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <MessageSquare className="h-5 w-5" />
            </div>
            <h3 className="text-zinc-200 font-bold text-base sm:text-lg">AI Mock Interview Panel</h3>
            <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
              Simulate high-impact technical, HR, and project scenario questions. Graded question-by-question with granular scoring assessments, strength checks, and re-phrased STAR suggestions.
            </p>
          </div>

        </section>

        {/* Feature list benefits */}
        <section className="border-t border-zinc-900 pt-16 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="flex gap-4 items-start">
            <Zap className="h-5 w-5 text-purple-400 mt-1 flex-shrink-0" />
            <div className="flex flex-col">
              <h4 className="text-zinc-300 font-semibold text-sm">Blazing Fast Audits</h4>
              <p className="text-zinc-500 text-xs mt-1">Direct token text parsing unlinks disk files instantly, delivering results in under 2 seconds.</p>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <Database className="h-5 w-5 text-emerald-400 mt-1 flex-shrink-0" />
            <div className="flex flex-col">
              <h4 className="text-zinc-300 font-semibold text-sm">Resilient Vector Store</h4>
              <p className="text-zinc-500 text-xs mt-1">Augmented generation backed by local cosine-similarity caching and ChromaDB fallback connections.</p>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <ShieldCheck className="h-5 w-5 text-indigo-400 mt-1 flex-shrink-0" />
            <div className="flex flex-col">
              <h4 className="text-zinc-300 font-semibold text-sm">Hallucination Mitigation</h4>
              <p className="text-zinc-500 text-xs mt-1">Low-temperature prompts strictly constrain model context, enforcing high accuracy and source citations.</p>
            </div>
          </div>
        </section>

      </main>

      {/* Footer Details */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-8 text-center text-xs text-zinc-600 font-medium">
        <p>© {new Date().getFullYear()} Syntrix AI. Built with Next.js Turbopack & Node.js Express. All rights reserved.</p>
      </footer>
    </div>
  );
}
