import { NextRequest, NextResponse } from "next/server";
import { signSession } from "@/lib/auth";
import { validateCredentials } from "@/lib/users";
import { logAuthEvent } from "@/lib/rbac";

export async function POST(request: NextRequest) {
  const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined;

  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const user = validateCredentials(email, password);

    if (!user) {
      await logAuthEvent("auth.login_failed", email, false, ipAddress, {
        reason: "invalid_credentials",
      });

      return NextResponse.json(
        { ok: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const token = await signSession({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      tenantId: user.tenantId,
    });

    await logAuthEvent("auth.login", user.email, true, ipAddress, {
      userId: user.id,
      role: user.role,
      tenantId: user.tenantId,
    });

    const response = NextResponse.json({
      ok: true,
      role: user.role,
      name: user.name,
    });

    response.cookies.set("ipa_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request" },
      { status: 400 }
    );
  }
}
