import { NextResponse } from "next/server";
import { getSessionSafe } from "@/lib/session";

export async function POST() {
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

    const response = NextResponse.json({ ok: true, tenantId: null });

    response.cookies.set("ipa_tenant", "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
