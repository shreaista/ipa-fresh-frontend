import { NextRequest, NextResponse } from "next/server";
import {
  requireSession,
  requireUserRole,
  requireTenant,
  jsonError,
  AuthzHttpError,
} from "@/lib/authz";
import { listFunds, createFund, type CreateFundInput } from "@/lib/mock/fundsStore";

export async function GET() {
  try {
    const user = await requireSession();
    requireUserRole(user, ["tenant_admin", "saas_admin"]);
    const tenantId = requireTenant(user);

    const funds = listFunds(tenantId);
    console.log("[Funds API] GET funds, tenantId:", tenantId, "count:", funds.length, "ids:", funds.map((f) => f.id));

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
    console.log("[Funds API] Create fund requested:", { name: body.name, code: body.code, tenantId });

    const result = createFund(tenantId, body);

    if (!result.ok) {
      console.error("[Funds API] Create fund failure:", result.error);
      throw new AuthzHttpError(400, result.error || "Failed to create fund");
    }

    console.log("[Funds API] Create fund success:", { id: result.fund?.id, name: result.fund?.name });
    return NextResponse.json({
      ok: true,
      data: { fund: result.fund },
    });
  } catch (error) {
    return jsonError(error);
  }
}
