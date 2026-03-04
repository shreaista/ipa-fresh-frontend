// API routes for Proposal Document management
// POST - Upload document (tenant_admin/saas_admin only)
// GET - List documents (all roles with proposal access)

import { NextRequest, NextResponse } from "next/server";
import {
  getAuthzContext,
  requireTenantAccess,
  requirePermission,
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

    // RBAC: Only tenant_admin and saas_admin can upload documents
    if (ctx.role !== "tenant_admin" && ctx.role !== "saas_admin") {
      throw new AuthzHttpError(403, "Only administrators can upload documents");
    }

    // Also require upload:create permission
    requirePermission(ctx, UPLOAD_CREATE);

    const { id } = await context.params;

    // Get proposal and validate access
    await getProposalWithAccess(
      tenantId,
      ctx.user.id || "",
      ctx.role,
      id
    );

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

    // Permission check: proposal:read for listing documents
    requirePermission(ctx, PROPOSAL_READ);

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

