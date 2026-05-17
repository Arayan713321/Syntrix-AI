"use client";

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-20 pb-12 flex flex-col items-center justify-center text-center px-6">
      {/* Background Decorative Glowing Elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none -z-10 animate-pulse" />

      {/* Trust / Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/5 text-purple-300 text-xs font-semibold mb-6 shadow-[0_0_15px_rgba(168,85,247,0.15)] animate-fade-in">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
        <span>Syntrix AI Engine v1.0.0 is Live</span>
      </div>

      {/* Main Copy */}
      <h1 className="max-w-4xl text-4xl sm:text-6xl font-black tracking-tight text-white mb-6 leading-[1.1]">
        Optimize Your Resume with{" "}
        <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent drop-shadow-sm">
          Next-Gen AI Analysis
        </span>
      </h1>

      <p className="max-w-2xl text-base sm:text-lg text-zinc-400 font-medium mb-10 leading-relaxed">
        Upload your resume to extract, parse, and structure your professional experience in seconds. Align your background with top ATS standards and beat the system.
      </p>

      {/* Trust Metrics */}
      <div className="grid grid-cols-3 gap-8 sm:gap-16 pt-4 border-t border-zinc-900 w-full max-w-xl justify-center text-center">
        <div className="flex flex-col gap-1">
          <span className="text-2xl font-bold text-white">100%</span>
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">PDF Parsing Accuracy</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-2xl font-bold text-white">&lt; 2s</span>
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Processing Time</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-2xl font-bold text-white">Secure</span>
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Encrypted Uploads</span>
        </div>
      </div>
    </section>
  );
}
