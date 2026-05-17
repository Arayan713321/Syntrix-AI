import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Premium SEO Metadata (SEO Guidelines requirement)
export const metadata: Metadata = {
  title: "Syntrix AI — Advanced Candidate Telemetry & RAG Career Advisor Suite",
  description: "Boost your professional alignment. Scan ATS scores, match job description embeddings, query vector RAG advisors, and prep via tailored AI interview panels.",
  viewport: "width=device-width, initial-scale=1, maximum-scale=5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-zinc-950 text-zinc-100 flex flex-col font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
