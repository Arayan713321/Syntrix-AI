"use client";

import React, { useEffect } from "react";
import { SessionProvider } from "next-auth/react";

/**
 * Global client context provider wrapper wrapping React components inside next-auth states
 * Includes keep-alive health checker to proactively wake and sustain Render backend services
 */
export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Ping backend every 14 minutes to prevent free-tier instances from falling asleep
    const ping = () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      fetch(`${apiUrl}/api/health`)
        .catch(() => {}); // Silent catch to prevent console bloating
    };
    
    ping(); // Initial call to boot server on initial load
    const interval = setInterval(ping, 14 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return <SessionProvider>{children}</SessionProvider>;
}
