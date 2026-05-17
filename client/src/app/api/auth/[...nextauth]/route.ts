import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import jwt from "jsonwebtoken";

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "syntrix-ai-super-secret-key-2026";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "mock-google-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "mock-google-client-secret",
    }),
    CredentialsProvider({
      name: "Email Magic Link",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "recruiter@company.com" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        
        // Simulates custom magic-link/passwordless email authorization for local development & MVP evaluation
        return {
          id: credentials.email.replace(/[^a-zA-Z0-9]/g, "-"),
          email: credentials.email,
          name: credentials.email.split("@")[0],
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  secret: NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        
        // Securely sign a standard JWT token for decoding in Express backend (Fix 2 & 6 Scoping requirement)
        token.apiToken = jwt.sign(
          { id: user.id, email: user.email, name: user.name },
          NEXTAUTH_SECRET,
          { expiresIn: "7d" }
        );
      }
      return token;
    },
    async session({ session, token }: any) {
      if (token && session.user) {
        // Exclude raw token from browser-facing session properties (Audit 1 requirement)
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth",
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
