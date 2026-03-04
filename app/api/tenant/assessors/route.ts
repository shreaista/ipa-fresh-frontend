import { NextResponse } from "next/server";
import {
  requireSession,
  requireUserRole,
  requireTenant,
  jsonError,
} from "@/lib/authz";
import { listAssessorsForTenant } from "@/lib/mock/proposalsStore";

export async function GET() {
  try {
    const user = await requireSession();
    requireUserRole(user, ["tenant_admin", "saas_admin"]);
    const tenantId = requireTenant(user);

    const assessors = listAssessorsForTenant(tenantId);

    return NextResponse.json({
      ok: true,
      data: {
        assessors: assessors.map((a) => ({
          id: a.id,
          name: a.name,
          email: a.email,
        })),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
