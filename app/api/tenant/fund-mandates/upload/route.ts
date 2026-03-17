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
import { uploadBlob, buildFundMandatePath, getDefaultContainer } from "@/lib/storage/azureBlob";
import { logAudit } from "@/lib/audit";

const ALLOWED_CONTENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx", ".xls", ".xlsx"];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

const UNSUPPORTED_FILE_ERROR = "Only PDF, DOC, DOCX, XLS, and XLSX files are supported.";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    requireUserRole(session, ["tenant_admin", "saas_admin"]);
    requireRBACPermission(session, RBAC_PERMISSIONS.FUND_MANDATE_UPLOAD);
    const tenantId = requireTenant(session);

    const formData = await request.formData();
    const fundId = formData.get("fundId");
    const file = formData.get("file");

    if (!fundId || typeof fundId !== "string" || !fundId.trim()) {
      throw new AuthzHttpError(400, "fundId is required. Select a fund before uploading.");
    }

    if (!file || !(file instanceof File)) {
      throw new AuthzHttpError(400, "file is required");
    }

    const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    const isValidExtension = ALLOWED_EXTENSIONS.includes(extension);
    const isValidContentType = ALLOWED_CONTENT_TYPES.includes(file.type);

    if (!isValidExtension && !isValidContentType) {
      throw new AuthzHttpError(400, UNSUPPORTED_FILE_ERROR);
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new AuthzHttpError(400, "File size exceeds 25MB limit");
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const blobPath = buildFundMandatePath(tenantId, fundId.trim(), file.name);
    const container = getDefaultContainer();

    await uploadBlob({
      container,
      path: blobPath,
      contentType: file.type,
      buffer,
      metadata: { tenantId, fundId: fundId.trim(), originalFilename: file.name },
    });

    const uploadedAt = new Date().toISOString();

    logAudit({
      action: "fund_mandate.upload",
      actorUserId: session.userId || "",
      actorEmail: session.email,
      tenantId,
      resourceType: "fund_mandate",
      resourceId: fundId,
      details: {
        blobPath,
        filename: file.name,
        size: buffer.length,
        contentType: file.type,
        fundId: fundId.trim(),
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        blobPath,
        blobName: blobPath,
        size: buffer.length,
        uploadedAt,
        filename: file.name,
        fundId: fundId.trim(),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
