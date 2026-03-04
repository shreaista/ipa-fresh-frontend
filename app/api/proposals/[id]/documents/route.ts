// API routes for Proposal Document management
// POST - Upload document
// GET - List documents
// DELETE - Delete document

import { NextRequest, NextResponse } from "next/server";
import {
  getAuthzContext,
  requireTenantAccess,
  requireAnyPermission,
  canAccessProposal,
  jsonError,
  AuthzHttpError,
  UPLOAD_CREATE,
  PROPOSAL_READ,
  type Proposal,
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

// Helper to get proposal with tenant/access validation
async function getProposalWithAccess(
  tenantId: string,
  userId: string,
  role: string,
  proposalId: string
): Promise<Proposal & { name?: string; fund?: string }> {
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

  return result.proposal as Proposal & { name?: string; fund?: string };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST - Upload Document
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const ctx = await getAuthzContext();

    if (!ctx.user) {
      return NextResponse.json(
        { ok: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Tenant isolation
    const tenantId = ctx.tenantId ?? ctx.user.id;
    if (!tenantId) {
      throw new AuthzHttpError(400, "Tenant context required");
    }
    requireTenantAccess(ctx, tenantId);

    // Permission check: upload:create OR proposal:read
    requireAnyPermission(ctx, [UPLOAD_CREATE, PROPOSAL_READ]);

    const { id } = await context.params;

    // Get proposal and validate access
    const proposal = await getProposalWithAccess(
      tenantId,
      ctx.user.id || "",
      ctx.role,
      id
    );

    // If role is assessor, must also pass canAccessProposal
    if (ctx.role === "assessor" && !canAccessProposal(ctx, proposal)) {
      throw new AuthzHttpError(403, "Access denied to this proposal");
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      throw new AuthzHttpError(400, "file is required");
    }

    if (!ALLOWED_CONTENT_TYPES.includes(file.type)) {
      throw new AuthzHttpError(
        400,
        "Invalid file type. Allowed: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, images, TXT, CSV."
      );
    }

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
      uploadedByUserId: ctx.user.id || "",
      uploadedByEmail: ctx.user.email || "",
    });

    // Audit log for document upload
    logAudit({
      action: "proposal_document.upload",
      actorUserId: ctx.user.id || "",
      actorEmail: ctx.user.email,
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
    const ctx = await getAuthzContext();

    if (!ctx.user) {
      return NextResponse.json(
        { ok: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Tenant isolation
    const tenantId = ctx.tenantId ?? ctx.user.id;
    if (!tenantId) {
      throw new AuthzHttpError(400, "Tenant context required");
    }
    requireTenantAccess(ctx, tenantId);

    // Permission check: upload:create OR proposal:read
    requireAnyPermission(ctx, [UPLOAD_CREATE, PROPOSAL_READ]);

    const { id } = await context.params;

    // Get proposal and validate access
    const proposal = await getProposalWithAccess(
      tenantId,
      ctx.user.id || "",
      ctx.role,
      id
    );

    // If role is assessor, must also pass canAccessProposal
    if (ctx.role === "assessor" && !canAccessProposal(ctx, proposal)) {
      throw new AuthzHttpError(403, "Access denied to this proposal");
    }

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
    const ctx = await getAuthzContext();

    if (!ctx.user) {
      return NextResponse.json(
        { ok: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Tenant isolation
    const tenantId = ctx.tenantId ?? ctx.user.id;
    if (!tenantId) {
      throw new AuthzHttpError(400, "Tenant context required");
    }
    requireTenantAccess(ctx, tenantId);

    // Permission check: upload:create OR proposal:read
    requireAnyPermission(ctx, [UPLOAD_CREATE, PROPOSAL_READ]);

    const { id } = await context.params;

    // Get proposal and validate access
    const proposal = await getProposalWithAccess(
      tenantId,
      ctx.user.id || "",
      ctx.role,
      id
    );

    // If role is assessor, must also pass canAccessProposal
    if (ctx.role === "assessor" && !canAccessProposal(ctx, proposal)) {
      throw new AuthzHttpError(403, "Access denied to this proposal");
    }

    const { searchParams } = new URL(request.url);
    const blobPath = searchParams.get("blobPath");

    if (!blobPath) {
      throw new AuthzHttpError(400, "blobPath query parameter is required");
    }

    if (!validateBlobPath(blobPath, tenantId, id)) {
      throw new AuthzHttpError(403, "Invalid blob path for this proposal");
    }

    const deleted = await deleteProposalDocument(tenantId, id, blobPath);

    if (!deleted) {
      throw new AuthzHttpError(404, "Document not found or already deleted");
    }

    logAudit({
      action: "proposal_document.delete",
      actorUserId: ctx.user.id || "",
      actorEmail: ctx.user.email,
      tenantId,
      resourceType: "proposal_document",
      resourceId: id,
      details: {
        blobPath,
      },
    });

    return NextResponse.json({
      ok: true,
      data: { message: "Document deleted successfully" },
    });
  } catch (error) {
    return jsonError(error);
  }
}
