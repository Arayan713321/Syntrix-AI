import axios from "axios";
import { getSession, signOut } from "next-auth/react";
import { toast } from "sonner";

console.log("[API] Base URL:", process.env.NEXT_PUBLIC_API_URL);

const API = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api`,
});

// 1. Request Interceptor: Automatically inject signed NextAuth token into headers
API.interceptors.request.use(
  async (config) => {
    try {
      const response = await fetch("/api/auth/token");
      const data = await response.json();
      if (data.token) {
        config.headers.Authorization = `Bearer ${data.token}`;
      }
    } catch (error) {
      console.error("[API] Token fetch failed:", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 2. Response Interceptor: Capture rate-limiting (429) & unauthorized (401) errors globally
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 429) {
      const serverMsg = error.response.data?.error?.message;
      const displayMsg = serverMsg || "Slow down — you have hit our API rate limits. Please try again in a few minutes.";
      
      toast.error(displayMsg, {
        id: "syntrix-rate-limit-toast", // Deduplicates toasts
        duration: 5000,
      });
    }

    if (error.response?.status === 401) {
      // Session expired — clear credentials and return user to Auth screen (Audit 5.4 requirement)
      if (typeof window !== "undefined") {
        toast.error("Session expired — please sign in again", { id: "session-expiry-toast" });
        setTimeout(() => {
          signOut({ callbackUrl: "/auth" });
        }, 1500);
      }
    }

    return Promise.reject(error);
  }
);

export default API;
