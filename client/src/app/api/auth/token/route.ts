import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "syntrix-ai-super-secret-key-2026";

export async function GET(req: NextRequest) {
  try {
    // Derive NextAuth signed token entirely server-side (Audit 1 requirement)
    const token = await getToken({ req, secret: NEXTAUTH_SECRET });
    
    if (!token?.apiToken) {
      return NextResponse.json({ error: "Unauthorized session or missing credentials token." }, { status: 401 });
    }

    return NextResponse.json({ apiToken: token.apiToken });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to resolve session token server-side: " + error.message }, { status: 500 });
  }
}
