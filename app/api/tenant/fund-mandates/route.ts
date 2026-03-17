import { NextRequest, NextResponse } from "next/server";
import {
  requireSession,
  requireUserRole,
  requireTenant,
  requireRBACPermission,
  jsonError,
  AuthzHttpError,
  hasPermission,
  FUND_MANDATE_MANAGE,
  RBAC_PERMISSIONS,
} from "@/lib/authz";
import { getAuthzContext } from "@/lib/authz";
import { listFundMandates as listMockFundMandates, createFundMandate } from "@/lib/mock/fundMandates";
import { listFundMandates as listBlobFundMandates } from "@/lib/storage/azure";
import { listFundMandateBlobsByFundId } from "@/lib/storage/azureBlob";
import { logAudit } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    requireUserRole(session, ["tenant_admin", "saas_admin"]);
    const tenantId = requireTenant(session);
    const ctx = await getAuthzContext();

    const source = request.nextUrl.searchParams.get("source");
    const fundId = request.nextUrl.searchParams.get("fundId");
    const mandateKey = request.nextUrl.searchParams.get("mandateKey");

    if (source === "blob") {
      requireRBACPermission(session, RBAC_PERMISSIONS.FUND_MANDATE_READ);

      if (fundId) {
        const blobs = await listFundMandateBlobsByFundId(tenantId, fundId);
        const files = blobs.map((b) => ({
          name: b.name,
          blobName: b.blobPath,
          uploadedAt: b.uploadedAt,
          size: b.size,
          contentType: b.contentType,
          fundId: b.fundId,
        }));
        return NextResponse.json({
          ok: true,
          data: { files },
        });
      }

      const blobs = await listBlobFundMandates({
        tenantId,
        mandateKey: mandateKey || undefined,
      });

      return NextResponse.json({
        ok: true,
        data: { files: blobs },
      });
    }

    if (!hasPermission(ctx, FUND_MANDATE_MANAGE)) {
      throw new AuthzHttpError(403, "Permission denied");
    }

    if (!ctx.entitlements?.fundMandatesEnabled) {
      throw new AuthzHttpError(
        403,
        "Fund Mandates not enabled for this tenant"
      );
    }

    const mandates = listMockFundMandates(tenantId);

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
