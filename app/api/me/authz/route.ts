import { NextResponse } from "next/server";
import { getAuthzContext, isAuthzError } from "@/lib/authz";

export async function GET() {
  try {
    const ctx = await getAuthzContext();

    return NextResponse.json({
      ok: true,
      data: {
        role: ctx.role,
        tenantId: ctx.tenantId,
        activeTenantId: ctx.tenantId,
        permissions: ctx.permissions,
        entitlements: ctx.entitlements,
      },
    });
  } catch (error) {
    if (isAuthzError(error)) {
      return NextResponse.json(
        { ok: false, error: "unauthenticated" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}
