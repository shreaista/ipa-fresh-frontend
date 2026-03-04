import { NextResponse } from "next/server";
import { requireSession, jsonError } from "@/lib/authz";
import { getPermissionsForRole } from "@/lib/rbac/permissions";
import { getTenantEntitlements } from "@/lib/entitlements/demoEntitlements";

export async function GET() {
  try {
    const session = await requireSession();

    const permissions = getPermissionsForRole(session.role);
    const entitlements = session.tenantId
      ? getTenantEntitlements(session.tenantId)
      : null;

    return NextResponse.json({
      ok: true,
      data: {
        role: session.role,
        tenantId: session.tenantId,
        activeTenantId: session.tenantId,
        permissions,
        entitlements,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
