import { NextRequest, NextResponse } from "next/server";
import {
  requireSession,
  requireTenant,
  jsonError,
  AuthzHttpError,
  hasPermission,
  FUND_MANDATE_MANAGE,
} from "@/lib/authz";
import { getAuthzContext } from "@/lib/authz";
import { listFundMandates, createFundMandate } from "@/lib/mock/fundMandates";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    const user = await requireSession();
    const tenantId = requireTenant(user);
    const ctx = await getAuthzContext();

    if (!hasPermission(ctx, FUND_MANDATE_MANAGE)) {
      throw new AuthzHttpError(403, "Permission denied");
    }

    if (!ctx.entitlements?.fundMandatesEnabled) {
      throw new AuthzHttpError(
        403,
        "Fund Mandates not enabled for this tenant"
      );
    }

    const mandates = listFundMandates(tenantId);

    return NextResponse.json({
      ok: true,
      data: { mandates },
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSession();
    const tenantId = requireTenant(user);
    const ctx = await getAuthzContext();

    if (!hasPermission(ctx, FUND_MANDATE_MANAGE)) {
      throw new AuthzHttpError(403, "Permission denied");
    }

    if (!ctx.entitlements?.fundMandatesEnabled) {
      throw new AuthzHttpError(
        403,
        "Fund Mandates not enabled for this tenant"
      );
    }

    let body: {
      name?: string;
      strategy?: string;
      geography?: string;
      minTicket?: number;
      maxTicket?: number;
      notes?: string;
    };

    try {
      body = await request.json();
    } catch {
      throw new AuthzHttpError(400, "Invalid JSON body");
    }

    if (!body.name || !body.strategy || !body.geography) {
      throw new AuthzHttpError(400, "Missing required fields: name, strategy, geography");
    }

    if (typeof body.minTicket !== "number" || typeof body.maxTicket !== "number") {
      throw new AuthzHttpError(400, "minTicket and maxTicket must be numbers");
    }

    const result = createFundMandate(
      tenantId,
      {
        name: body.name,
        strategy: body.strategy,
        geography: body.geography,
        minTicket: body.minTicket,
        maxTicket: body.maxTicket,
        notes: body.notes,
      },
      user.userId || ""
    );

    if (!result.ok) {
      throw new AuthzHttpError(400, result.error || "Failed to create mandate");
    }

    logAudit({
      action: "fund_mandate.create",
      actorUserId: user.userId || "",
      actorEmail: user.email,
      tenantId,
      resourceType: "fund_mandate",
      resourceId: result.mandate!.id,
      details: { name: body.name, strategy: body.strategy },
    });

    return NextResponse.json({
      ok: true,
      data: { mandate: result.mandate },
    });
  } catch (error) {
    return jsonError(error);
  }
}
