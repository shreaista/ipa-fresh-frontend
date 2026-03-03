import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, logAudit } from "@/lib/rbac";

export async function POST(request: NextRequest) {
  const ctx = await getAuthContext();
  const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined;

  if (ctx) {
    await logAudit(ctx, "auth.logout", { ipAddress });
  }

  const response = NextResponse.json({ ok: true });

  response.cookies.set("ipa_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
