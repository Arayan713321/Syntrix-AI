"use client";

import React, { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { Mail, Sparkles, AlertTriangle, ArrowRight, Database } from "lucide-react";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGoogle, setHasGoogle] = useState(false);

  // 1. Fetch provider status on page mount to detect missing Google Client IDs
  useEffect(() => {
    fetch("/api/auth/providers-status")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Failed status fetch");
      })
      .then((data) => {
        if (data && typeof data.hasGoogle === "boolean") {
          setHasGoogle(data.hasGoogle);
        }
      })
      .catch((err) => {
        console.warn("[Auth] Skipping provider status check fallback:", err);
        setHasGoogle(false);
      });
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoadingGoogle(true);
    setError(null);
    try {
      // Directs NextAuth to initiate standard Google OAuth flow
      await signIn("google", { callbackUrl: "/dashboard" });
    } catch (err: any) {
      console.error(err);
      setError("Failed to initiate Google sign-in. Please try again.");
      setIsLoadingGoogle(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || isLoadingEmail) return;

    // Validate standard email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsLoadingEmail(true);
    setError(null);

    // 2. Demo fallback pre-caching mechanism (Fix 3 requirement)
    if (!hasGoogle) {
      try {
        console.log(`[Auth] Sandbox mode: Pre-caching demo-session for ${email.trim()}`);
        const demoRes = await fetch("http://localhost:5000/api/auth/demo-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: email.trim().toLowerCase() }),
        });
        if (!demoRes.ok) {
          const errData = await demoRes.json().catch(() => ({}));
          console.warn("[Auth] Express pre-cache responded with non-200:", errData.error);
        }
      } catch (err) {
        console.warn("[Auth] Skipped Express pre-cache lookup:", err);
      }
    }

    try {
      // Triggers credentials passwordless magic link simulation
      const res = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        callbackUrl: "/dashboard",
        redirect: true,
      });
      
      if (res?.error) {
        throw new Error(res.error);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to deliver magic link. Check connection.");
      setIsLoadingEmail(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center relative p-4 overflow-hidden font-sans">
      
      {/* Ambient Background Glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-purple-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-indigo-600/10 blur-[130px] pointer-events-none" />

      {/* Authentication Glass Card Container */}
      <div className="w-full max-w-[420px] rounded-3xl border border-zinc-800/80 bg-zinc-900/15 backdrop-blur-md p-6 sm:p-8 flex flex-col gap-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative z-10 animate-fade-in-up">
        
        {/* Brand Banner */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Sparkles className="h-6 w-6 text-white animate-pulse" />
          </div>
          <div className="flex flex-col mt-1">
            <h2 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-purple-200 via-zinc-100 to-indigo-200 bg-clip-text text-transparent tracking-tight">
              SYNTRIX AI
            </h2>
            <p className="text-zinc-500 text-[10px] sm:text-xs font-semibold uppercase tracking-widest mt-0.5">
              Production-Grade Career Intelligence
            </p>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs sm:text-sm flex items-center gap-2 animate-fade-in-up">
            <AlertTriangle className="h-4.5 w-4.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Amber Notice Banner for Sandbox Mode */}
        {!hasGoogle && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs sm:text-sm flex items-start gap-2.5 animate-fade-in-up">
            <AlertTriangle className="h-4.5 w-4.5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold text-amber-300 block">Demo Mode Active</span>
              <p className="text-[10px] text-zinc-400 leading-normal mt-0.5">
                Enter any email to instantly log in and access the dashboard sandboxed session.
              </p>
            </div>
          </div>
        )}

        {/* Action Section */}
        <div className="flex flex-col gap-4">
          
          {/* Button A: Google OAuth - Hidden if GOOGLE_CLIENT_ID environment variables are absent */}
          {hasGoogle && (
            <>
              <button
                onClick={handleGoogleLogin}
                disabled={isLoadingGoogle || isLoadingEmail}
                className="w-full py-3.5 px-4 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 hover:bg-zinc-900 text-zinc-300 hover:text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-3 transition-all cursor-pointer shadow-md hover:shadow-lg disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                {isLoadingGoogle ? (
                  <svg className="animate-spin h-5 w-5 text-zinc-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  // Styled minimal SVG for Google Logo
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.41 0-6.19-2.78-6.19-6.19s2.78-6.19 6.19-6.19c1.7 0 3.125.69 4.17 1.81l3.226-3.226C19.24 2.81 16.006 1.5 12.24 1.5c-5.79 0-10.5 4.71-10.5 10.5s4.71 10.5 10.5 10.5c5.38 0 9.76-3.8 9.76-9.76 0-.585-.05-1.17-.15-1.74H12.24z"
                    />
                  </svg>
                )}
                <span>Continue with Google</span>
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-2 text-zinc-600 text-[10px] font-bold uppercase tracking-widest">
                <div className="flex-1 h-px bg-zinc-900" />
                <span>or use magic link</span>
                <div className="flex-1 h-px bg-zinc-900" />
              </div>
            </>
          )}

          {/* Form B: Passwordless Email magic link */}
          <form onSubmit={handleEmailLogin} className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5 pl-0.5">
              <label htmlFor="email-input" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Candidate Corporate Email
              </label>
              <div className="relative">
                <input
                  id="email-input"
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoadingGoogle || isLoadingEmail}
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-zinc-800 bg-zinc-900/30 text-zinc-300 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus-visible:ring-purple-500 placeholder:text-zinc-650 disabled:opacity-50"
                />
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-zinc-600" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoadingGoogle || isLoadingEmail || !email.trim()}
              className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:bg-zinc-900 disabled:text-zinc-650 shadow-lg hover:shadow-purple-500/20 focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              {isLoadingEmail ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Scoping Candidate Profile...</span>
                </>
              ) : (
                <>
                  <span>{hasGoogle ? "Send Login Magic Link" : "Access Dashboard Sandbox"}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

        </div>

        {/* Footer Notes */}
        <p className="text-[10px] text-zinc-600 text-center leading-relaxed px-4">
          By signing in, you access an active sandboxed career telemetry session. Syntrix database persists your logs locally.
        </p>

      </div>

      {/* Database pill marker */}
      <div className="absolute bottom-4 z-10 text-[10px] text-zinc-600 font-mono flex items-center gap-1.5 pointer-events-none">
        <Database className="h-3 w-3" /> SECURED FILE STORE ACTIVE
      </div>

    </main>
  );
}
