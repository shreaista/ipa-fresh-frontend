// NEW: API routes for Proposal Document management
// POST - Upload document
// GET - List documents
// DELETE - Delete document

import { NextRequest, NextResponse } from "next/server";
import {
  requireSession,
  requireTenant,
  requireRBACPermission,
  jsonError,
  AuthzHttpError,
  RBAC_PERMISSIONS,
} from "@/lib/authz";
import { getProposalForUser } from "@/lib/mock/proposals";
import {
  uploadProposalDocument,
  listProposalDocuments,
  deleteProposalDocument,
  validateBlobPath,
  ALLOWED_CONTENT_TYPES,
  MAX_FILE_SIZE,
} from "@/lib/storage/proposalDocuments";
import { logAudit } from "@/lib/audit";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// NEW: Helper to validate proposal access
async function validateProposalAccess(
  tenantId: string,
  userId: string,
  role: string,
  proposalId: string
) {
  const result = getProposalForUser({
    tenantId,
    userId,
    role,
    proposalId,
  });

  if (result.accessDenied) {
    throw new AuthzHttpError(403, "You do not have access to this proposal");
  }

  if (!result.proposal) {
    throw new AuthzHttpError(404, "Proposal not found");
  }

  return result.proposal;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST - Upload Document
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireSession();
    requireRBACPermission(session, RBAC_PERMISSIONS.PROPOSAL_DOCUMENT_UPLOAD);
    const tenantId = requireTenant(session);
    const { id } = await context.params;

    // NEW: Validate proposal access
    await validateProposalAccess(tenantId, session.userId || "", session.role, id);

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      throw new AuthzHttpError(400, "file is required");
    }

    // NEW: Validate file type
    if (!ALLOWED_CONTENT_TYPES.includes(file.type)) {
      throw new AuthzHttpError(
        400,
        "Invalid file type. Allowed: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, images, TXT, CSV."
      );
    }

    // NEW: Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new AuthzHttpError(400, "File size exceeds 25MB limit");
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await uploadProposalDocument({
      tenantId,
      proposalId: id,
      filename: file.name,
      contentType: file.type,
      buffer,
      uploadedByUserId: session.userId || "",
      uploadedByEmail: session.email || "",
    });

    // NEW: Audit log
    logAudit({
      action: "proposal_document.upload",
      actorUserId: session.userId || "",
      actorEmail: session.email,
      tenantId,
      resourceType: "proposal_document",
      resourceId: id,
      details: {
        blobPath: result.blobPath,
        filename: result.filename,
        size: result.size,
        contentType: file.type,
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        blobPath: result.blobPath,
        filename: result.filename,
        size: result.size,
        uploadedAt: result.uploadedAt,
        uploadedBy: result.uploadedBy,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET - List Documents
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireSession();
    requireRBACPermission(session, RBAC_PERMISSIONS.PROPOSAL_DOCUMENT_READ);
    const tenantId = requireTenant(session);
    const { id } = await context.params;

    // NEW: Validate proposal access
    await validateProposalAccess(tenantId, session.userId || "", session.role, id);

    const result = await listProposalDocuments(tenantId, id);

    return NextResponse.json({
      ok: true,
      data: {
        grouped: result.grouped,
        flat: result.flat,
        count: result.flat.length,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE - Delete Document
// ─────────────────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireSession();
    requireRBACPermission(session, RBAC_PERMISSIONS.PROPOSAL_DOCUMENT_DELETE);
    const tenantId = requireTenant(session);
    const { id } = await context.params;

    // NEW: Validate proposal access
    await validateProposalAccess(tenantId, session.userId || "", session.role, id);

    const { searchParams } = new URL(request.url);
    const blobPath = searchParams.get("blobPath");

    if (!blobPath) {
      throw new AuthzHttpError(400, "blobPath query parameter is required");
    }

    // NEW: Validate blob path belongs to this tenant/proposal
    if (!validateBlobPath(blobPath, tenantId, id)) {
      throw new AuthzHttpError(403, "Invalid blob path for this proposal");
    }

    const deleted = await deleteProposalDocument(tenantId, id, blobPath);

    if (!deleted) {
      throw new AuthzHttpError(404, "Document not found or already deleted");
    }

    // NEW: Audit log
    logAudit({
      action: "proposal_document.delete",
      actorUserId: session.userId || "",
      actorEmail: session.email,
      tenantId,
      resourceType: "proposal_document",
      resourceId: id,
      details: {
        blobPath,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    return jsonError(error);
  }
}
