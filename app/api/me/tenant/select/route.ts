import { NextRequest, NextResponse } from "next/server";
import { getSessionSafe } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const { user } = await getSessionSafe();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    if (user.role !== "saas_admin") {
      return NextResponse.json(
        { ok: false, error: "Only SaaS Admin can switch tenant context" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { tenantId } = body;

    if (!tenantId || typeof tenantId !== "string") {
      return NextResponse.json(
        { ok: false, error: "tenantId is required" },
        { status: 400 }
      );
    }

    const response = NextResponse.json({ ok: true, tenantId });

    response.cookies.set("ipa_tenant", tenantId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
