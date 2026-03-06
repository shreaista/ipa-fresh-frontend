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
import { uploadFundMandate } from "@/lib/storage/azure";
import { logAudit } from "@/lib/audit";

const ALLOWED_CONTENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

const UNSUPPORTED_FILE_ERROR = "Only PDF, DOC, and DOCX files are supported.";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    requireUserRole(session, ["tenant_admin", "saas_admin"]);
    requireRBACPermission(session, RBAC_PERMISSIONS.FUND_MANDATE_UPLOAD);
    const tenantId = requireTenant(session);

    const formData = await request.formData();
    const mandateKey = formData.get("mandateKey");
    const file = formData.get("file");

    if (!mandateKey || typeof mandateKey !== "string") {
      throw new AuthzHttpError(400, "mandateKey is required");
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

    const result = await uploadFundMandate({
      tenantId,
      mandateKey,
      filename: file.name,
      contentType: file.type,
      buffer,
    });

    logAudit({
      action: "fund_mandate.upload",
      actorUserId: session.userId || "",
      actorEmail: session.email,
      tenantId,
      resourceType: "fund_mandate",
      resourceId: mandateKey,
      details: {
        blobName: result.blobName,
        filename: file.name,
        size: result.size,
        contentType: file.type,
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        blobName: result.blobName,
        size: result.size,
        uploadedAt: result.uploadedAt,
        filename: file.name,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
