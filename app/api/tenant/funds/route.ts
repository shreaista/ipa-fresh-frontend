import { NextRequest, NextResponse } from "next/server";
import {
  requireSession,
  requireUserRole,
  requireTenant,
  jsonError,
  AuthzHttpError,
} from "@/lib/authz";
import { listFunds, createFund, type CreateFundInput } from "@/lib/mock/fundsStore";

const STORAGE_SOURCE = "fundsStore (in-memory array)";

export async function GET(request: NextRequest) {
  try {
    const user = await requireSession();
    requireUserRole(user, ["tenant_admin", "saas_admin"]);
    const tenantId = requireTenant(user);

    const funds = listFunds(tenantId);
    console.log("[Funds API] GET list, tenantId:", tenantId, "source:", STORAGE_SOURCE, "count:", funds.length, "ids:", funds.map((f) => f.id), "names:", funds.map((f) => f.name));

    const debug = request.nextUrl.searchParams.get("debug") === "1";
    if (debug) {
      return NextResponse.json({
        ok: true,
        tenantId,
        source: STORAGE_SOURCE,
        count: funds.length,
        items: funds.map((f) => ({ id: f.id, name: f.name, code: f.code, status: f.status })),
      });
    }

    return NextResponse.json({
      ok: true,
      data: { funds },
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSession();
    requireUserRole(user, ["tenant_admin", "saas_admin"]);
    const tenantId = requireTenant(user);

    const body: CreateFundInput = await request.json();
    const duplicateCheckScope = listFunds(tenantId);
    const matchedNames = duplicateCheckScope.filter((f) => f.name.toLowerCase() === (body.name || "").trim().toLowerCase()).map((f) => f.name);
    console.log("[Funds API] POST create, tenantId:", tenantId, "source:", STORAGE_SOURCE, "duplicate-check scope count:", duplicateCheckScope.length, "matched fund names:", matchedNames, "requested name:", body.name);

    const result = createFund(tenantId, body);

    if (!result.ok) {
      console.error("[Funds API] POST create failure:", result.error);
      throw new AuthzHttpError(400, result.error || "Failed to create fund");
    }

    console.log("[Funds API] POST create success, id:", result.fund?.id, "name:", result.fund?.name);
    return NextResponse.json({
      ok: true,
      data: { fund: result.fund },
    });
  } catch (error) {
    return jsonError(error);
  }
}
