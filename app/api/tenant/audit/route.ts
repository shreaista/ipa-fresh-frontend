// GET /api/tenant/audit - List audit log with filters

import { NextResponse } from "next/server";
import { requireRoleWithTenantContext } from "@/lib/authz";
import { queryAuditLog, seedDemoAuditLog } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const { tenantId } = await requireRoleWithTenantContext(["tenant_admin", "saas_admin"]);

    // Seed demo data when empty (dev only)
    seedDemoAuditLog(tenantId);

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate") ?? undefined;
    const endDate = searchParams.get("endDate") ?? undefined;
    const userId = searchParams.get("userId") ?? undefined;
    const action = searchParams.get("action") ?? undefined;
    const proposalId = searchParams.get("proposalId") ?? undefined;
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    const { entries, total } = queryAuditLog({
      tenantId,
      startDate,
      endDate,
      userId,
      action,
      proposalId,
      limit: limit ? parseInt(limit, 10) : 100,
      offset: offset ? parseInt(offset, 10) : 0,
    });

    const { entries: allForUsers } = queryAuditLog({ tenantId, limit: 500 });
    const usersMap = new Map<string, string>();
    allForUsers.forEach((e) => {
      if (e.actorUserId && (e.actorEmail || e.actorUserId)) {
        usersMap.set(e.actorUserId, e.actorEmail ?? e.actorUserId);
      }
    });
    const users = Array.from(usersMap.entries()).map(([id, email]) => ({ id, email }));

    return NextResponse.json({
      ok: true,
      data: { entries, total, users },
    });
  } catch (e) {
    console.error("[audit] GET error:", e);
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
}
