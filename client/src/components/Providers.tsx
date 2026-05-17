"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";

/**
 * Global client context provider wrapper wrapping React components inside next-auth states
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
