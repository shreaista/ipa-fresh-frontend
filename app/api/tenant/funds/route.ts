import { NextRequest, NextResponse } from "next/server";
import {
  requireSession,
  requireUserRole,
  requireTenant,
  jsonError,
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

    const body = await request.json();
    const name = body?.name;
    const code = body?.code;

    console.log("[Funds API] POST create, tenantId:", tenantId, "raw name:", JSON.stringify(name), "raw code:", JSON.stringify(code));

    const result = createFund(tenantId, { name, code } as CreateFundInput);

    if (!result.ok) {
      console.error("[Funds API] POST create failure:", result.error, "debug:", result.debug);
      const isDev = process.env.NODE_ENV !== "production";
      return NextResponse.json(
        {
          ok: false,
          error: result.error || "Failed to create fund",
          ...(isDev && result.debug && { debug: result.debug }),
        },
        { status: 400 }
      );
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
