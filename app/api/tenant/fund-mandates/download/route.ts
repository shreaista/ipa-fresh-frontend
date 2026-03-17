import { NextRequest, NextResponse } from "next/server";
import {
  requireSession,
  requireUserRole,
  requireTenant,
  requireRBACPermission,
  jsonError,
  AuthzHttpError,
  RBAC_PERMISSIONS,
} from "@/lib/authz";
import { getFundMandateDownload } from "@/lib/storage/azure";
import { downloadBlob, getDefaultContainer } from "@/lib/storage/azureBlob";
import { logAudit } from "@/lib/audit";

function extractFilenameFromPath(path: string): string {
  if (!path) return "download";
  const parts = path.split("/");
  return parts[parts.length - 1] || "download";
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    requireUserRole(session, ["tenant_admin", "saas_admin"]);
    requireRBACPermission(session, RBAC_PERMISSIONS.FUND_MANDATE_READ);
    const tenantId = requireTenant(session);

    const blobName = request.nextUrl.searchParams.get("blobName");

    if (!blobName) {
      throw new AuthzHttpError(400, "blobName is required");
    }

    // fundId-based path: tenants/{tenantId}/funds/{fundId}/mandates/...
    const isFundIdPath = blobName.includes("/funds/") && blobName.includes("/mandates/");
    let result: { buffer: Buffer; contentType: string; filename: string } | null = null;

    if (isFundIdPath && blobName.startsWith(`tenants/${tenantId}/`)) {
      const container = getDefaultContainer();
      const blobResult = await downloadBlob(container, blobName);
      if (blobResult) {
        result = {
          buffer: blobResult.buffer,
          contentType: blobResult.contentType,
          filename: extractFilenameFromPath(blobName),
        };
      }
    }

    if (!result) {
      result = await getFundMandateDownload({
        tenantId,
        blobName,
      });
    }

    if (!result) {
      throw new AuthzHttpError(404, "File not found");
    }

    logAudit({
      action: "fund_mandate.download",
      actorUserId: session.userId || "",
      actorEmail: session.email,
      tenantId,
      resourceType: "fund_mandate",
      resourceId: blobName,
      details: {
        filename: result.filename,
        contentType: result.contentType,
      },
    });

    const headers = new Headers();
    headers.set("Content-Type", result.contentType);
    headers.set(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(result.filename)}"`
    );
    headers.set("Content-Length", result.buffer.length.toString());

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers,
    });
  } catch (error) {
    return jsonError(error);
  }
}
