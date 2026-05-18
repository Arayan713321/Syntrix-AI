import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "syntrix-ai-super-secret-key-2026";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ 
      req, 
      secret: NEXTAUTH_SECRET 
    });
    
    if (!token) {
      return NextResponse.json({ token: null }, { status: 401 });
    }
    
    return NextResponse.json({ 
      token: token.apiToken || token.sub 
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to resolve session token server-side: " + error.message }, { status: 500 });
  }
}
