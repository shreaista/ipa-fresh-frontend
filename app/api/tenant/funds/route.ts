import { NextRequest, NextResponse } from "next/server";
import { getAuthzContext, jsonError, AuthzHttpError } from "@/lib/authz";
import { requireActiveTenantId } from "@/lib/tenantContext";
import { listFunds, createFund, type CreateFundInput } from "@/lib/mock/fundsStore";

export async function GET() {
  try {
    const ctx = await getAuthzContext();

    if (!ctx.user) {
      return NextResponse.json(
        { ok: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const tenantId = await requireActiveTenantId();

    if (ctx.role !== "tenant_admin" && ctx.role !== "saas_admin") {
      throw new AuthzHttpError(403, "Only administrators can manage funds");
    }

    const funds = listFunds(tenantId);

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
    const ctx = await getAuthzContext();

    if (!ctx.user) {
      return NextResponse.json(
        { ok: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const tenantId = await requireActiveTenantId();

    if (ctx.role !== "tenant_admin" && ctx.role !== "saas_admin") {
      throw new AuthzHttpError(403, "Only administrators can create funds");
    }

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
