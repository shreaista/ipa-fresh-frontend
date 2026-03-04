import { NextRequest, NextResponse } from "next/server";
import {
  requireSession,
  requireUserRole,
  requireTenant,
  jsonError,
  AuthzHttpError,
  requireRBACPermission,
  RBAC_PERMISSIONS,
} from "@/lib/authz";
import { getTenantEntitlements } from "@/lib/entitlements/demoEntitlements";
import {
  uploadBlob,
  listBlobs,
  buildFundMandatePath,
  getFundMandatesPrefix,
  getDefaultContainer,
  type BlobMetadata,
} from "@/lib/storage/azureBlob";
import { logAudit } from "@/lib/audit";

interface RouteContext {
  params: Promise<{ fundId: string }>;
}

const ALLOWED_CONTENT_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tenant/funds/:fundId/mandates - List mandate files
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireSession();
    requireUserRole(session, ["tenant_admin", "saas_admin"]);
    requireRBACPermission(session, RBAC_PERMISSIONS.FUND_MANDATE_READ);
    const tenantId = requireTenant(session);
    const { fundId } = await context.params;

    const entitlements = getTenantEntitlements(tenantId);
    if (!entitlements.canManageFundMandates) {
      throw new AuthzHttpError(
        403,
        "Fund mandate management not enabled for this tenant"
      );
    }

    const container = getDefaultContainer();
    const prefix = getFundMandatesPrefix(tenantId, fundId);

    const blobs = await listBlobs({ container, prefix });

    const mandates: BlobMetadata[] = blobs.map((blob) => ({
      path: blob.path,
      lastModified: blob.lastModified,
      size: blob.size,
      contentType: blob.contentType,
      fileName: blob.fileName,
    }));

    return NextResponse.json({
      ok: true,
      data: {
        fundId,
        mandates,
        count: mandates.length,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/tenant/funds/:fundId/mandates - Upload mandate file
// ─────────────────────────────────────────────────────────────────────────────

interface Base64UploadBody {
  filename: string;
  contentBase64: string;
  contentType: string;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireSession();
    requireUserRole(session, ["tenant_admin", "saas_admin"]);
    requireRBACPermission(session, RBAC_PERMISSIONS.FUND_MANDATE_UPLOAD);
    const tenantId = requireTenant(session);
    const { fundId } = await context.params;

    const entitlements = getTenantEntitlements(tenantId);
    if (!entitlements.canManageFundMandates) {
      throw new AuthzHttpError(
        403,
        "Fund mandate management not enabled for this tenant"
      );
    }

    const contentTypeHeader = request.headers.get("content-type") || "";

    let fileName: string;
    let contentType: string;
    let buffer: Buffer;

    if (contentTypeHeader.includes("multipart/form-data")) {
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

      fileName = file.name;
      contentType = file.type;
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      let body: Base64UploadBody;
      try {
        body = await request.json();
      } catch {
        throw new AuthzHttpError(400, "Invalid JSON body");
      }

      if (!body.filename || !body.contentBase64 || !body.contentType) {
        throw new AuthzHttpError(
          400,
          "Missing required fields: filename, contentBase64, contentType"
        );
      }

      if (!ALLOWED_CONTENT_TYPES.includes(body.contentType)) {
        throw new AuthzHttpError(
          400,
          "Invalid file type. Only PDF and DOCX files are allowed."
        );
      }

      fileName = body.filename;
      contentType = body.contentType;
      buffer = Buffer.from(body.contentBase64, "base64");

      if (buffer.length > MAX_FILE_SIZE) {
        throw new AuthzHttpError(400, "File size exceeds 10MB limit");
      }
    }

    const container = getDefaultContainer();
    const blobPath = buildFundMandatePath(tenantId, fundId, fileName);

    const result = await uploadBlob({
      container,
      path: blobPath,
      contentType,
      buffer,
    });

    logAudit({
      action: "fund_mandate.upload",
      actorUserId: session.userId || "",
      actorEmail: session.email,
      tenantId,
      resourceType: "fund_mandate",
      resourceId: fundId,
      details: {
        path: result.path,
        fileName,
        sizeBytes: result.sizeBytes,
        contentType,
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        fundId,
        path: result.path,
        fileName,
        sizeBytes: result.sizeBytes,
        uploadedAt: result.uploadedAt,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
