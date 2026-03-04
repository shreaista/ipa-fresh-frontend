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
import { getFundMandateById, getFileByVersion } from "@/lib/mock/fundMandates";
import { readFundMandateFile } from "@/lib/storage/fundMandateFiles";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireSession();
    const tenantId = requireTenant(user);
    const ctx = await getAuthzContext();
    const { id: templateId } = await context.params;

    if (!hasPermission(ctx, FUND_MANDATE_MANAGE)) {
      throw new AuthzHttpError(403, "Permission denied");
    }

    if (!ctx.entitlements?.fundMandatesEnabled) {
      throw new AuthzHttpError(
        403,
        "Fund Mandates not enabled for this tenant"
      );
    }

    const mandate = getFundMandateById(tenantId, templateId);
    if (!mandate) {
      throw new AuthzHttpError(404, "Fund mandate not found");
    }

    const versionParam = request.nextUrl.searchParams.get("version");
    let version: number | "latest" = "latest";

    if (versionParam && versionParam !== "latest") {
      const parsed = parseInt(versionParam, 10);
      if (isNaN(parsed) || parsed < 1) {
        throw new AuthzHttpError(400, "Invalid version number");
      }
      version = parsed;
    }

    const fileRecord = getFileByVersion(tenantId, templateId, version);
    if (!fileRecord) {
      throw new AuthzHttpError(404, "File not found");
    }

    const storedFile = readFundMandateFile(fileRecord.storageKey);
    if (!storedFile) {
      throw new AuthzHttpError(404, "File data not found in storage");
    }

    const headers = new Headers();
    headers.set("Content-Type", storedFile.contentType);
    headers.set(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(storedFile.fileName)}"`
    );
    headers.set("Content-Length", storedFile.buffer.length.toString());

    return new NextResponse(new Uint8Array(storedFile.buffer), {
      status: 200,
      headers,
    });
  } catch (error) {
    return jsonError(error);
  }
}
