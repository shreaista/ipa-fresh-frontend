// GET /api/tenant/prompts/versions?key=...&fundId=...
// Returns version history for a prompt

import { NextResponse } from "next/server";
import { requireRoleWithTenantContext } from "@/lib/authz";
import { getVersions } from "@/lib/prompts/promptStore";

export async function GET(req: Request) {
  try {
    const { tenantId } = await requireRoleWithTenantContext(["tenant_admin", "saas_admin"]);
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    const fundId = searchParams.get("fundId") ?? undefined;

    if (!key) {
      return NextResponse.json({ ok: false, error: "key required" }, { status: 400 });
    }

    const versions = getVersions(tenantId, key, fundId);

    return NextResponse.json({ ok: true, data: { versions } });
  } catch (e) {
    console.error("[prompts/versions] GET error:", e);
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
}
