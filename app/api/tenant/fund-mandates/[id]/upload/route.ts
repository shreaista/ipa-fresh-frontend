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
import { getFundMandateById, addFileToMandate } from "@/lib/mock/fundMandates";
import { saveFundMandateFile } from "@/lib/storage/fundMandateFiles";
import { logAudit } from "@/lib/audit";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const ALLOWED_CONTENT_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest, context: RouteContext) {
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

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      throw new AuthzHttpError(400, "No file provided");
    }

    if (!ALLOWED_CONTENT_TYPES.includes(file.type)) {
      throw new AuthzHttpError(
        400,
        "Invalid file type. Only PDF and DOCX files are allowed."
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new AuthzHttpError(400, "File size exceeds 10MB limit");
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { storageKey, sizeBytes } = saveFundMandateFile({
      tenantId,
      templateId,
      fileName: file.name,
      contentType: file.type,
      buffer,
    });

    const result = addFileToMandate(
      tenantId,
      templateId,
      {
        fileName: file.name,
        contentType: file.type,
        sizeBytes,
        storageKey,
      },
      user.userId || ""
    );

    if (!result.ok) {
      throw new AuthzHttpError(500, result.error || "Failed to save file");
    }

    logAudit({
      action: "fund_mandate.upload",
      actorUserId: user.userId || "",
      actorEmail: user.email,
      tenantId,
      resourceType: "fund_mandate",
      resourceId: templateId,
      details: {
        version: result.fileVersion,
        fileName: file.name,
        sizeBytes,
        contentType: file.type,
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        templateId,
        version: result.fileVersion,
        fileName: file.name,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
