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
import {
  getFundMandateById,
  updateFundMandate,
  setFundMandateStatus,
  type FundMandateStatus,
} from "@/lib/mock/fundMandates";
import { logAudit } from "@/lib/audit";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireSession();
    const tenantId = requireTenant(user);
    const ctx = await getAuthzContext();
    const { id } = await context.params;

    if (!hasPermission(ctx, FUND_MANDATE_MANAGE)) {
      throw new AuthzHttpError(403, "Permission denied");
    }

    if (!ctx.entitlements?.fundMandatesEnabled) {
      throw new AuthzHttpError(
        403,
        "Fund Mandates not enabled for this tenant"
      );
    }

    const mandate = getFundMandateById(tenantId, id);

    if (!mandate) {
      throw new AuthzHttpError(404, "Fund mandate not found");
    }

    return NextResponse.json({
      ok: true,
      data: { mandate },
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireSession();
    const tenantId = requireTenant(user);
    const ctx = await getAuthzContext();
    const { id } = await context.params;

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
      status?: FundMandateStatus;
    };

    try {
      body = await request.json();
    } catch {
      throw new AuthzHttpError(400, "Invalid JSON body");
    }

    const existingMandate = getFundMandateById(tenantId, id);
    if (!existingMandate) {
      throw new AuthzHttpError(404, "Fund mandate not found");
    }

    if (body.status !== undefined) {
      const validStatuses: FundMandateStatus[] = ["draft", "active", "inactive"];
      if (!validStatuses.includes(body.status)) {
        throw new AuthzHttpError(400, "Invalid status value");
      }

      const result = setFundMandateStatus(
        tenantId,
        id,
        body.status,
        user.userId || ""
      );

      if (!result.ok) {
        throw new AuthzHttpError(400, result.error || "Failed to update status");
      }

      logAudit({
        action: "fund_mandate.status_change",
        actorUserId: user.userId || "",
        actorEmail: user.email,
        tenantId,
        resourceType: "fund_mandate",
        resourceId: id,
        details: { newStatus: body.status },
      });

      return NextResponse.json({
        ok: true,
        data: { mandate: result.mandate },
      });
    }

    const result = updateFundMandate(
      tenantId,
      id,
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
      throw new AuthzHttpError(400, result.error || "Failed to update mandate");
    }

    logAudit({
      action: "fund_mandate.update",
      actorUserId: user.userId || "",
      actorEmail: user.email,
      tenantId,
      resourceType: "fund_mandate",
      resourceId: id,
      details: { updates: body },
    });

    return NextResponse.json({
      ok: true,
      data: { mandate: result.mandate },
    });
  } catch (error) {
    return jsonError(error);
  }
}
