// Delete route for Proposal Documents
// DELETE - Remove a document from blob storage
// RBAC: tenant_admin, saas_admin, and assessor

import { NextRequest, NextResponse } from "next/server";
import {
  getAuthzContext,
  requirePermission,
  jsonError,
  AuthzHttpError,
  UPLOAD_CREATE,
} from "@/lib/authz";
import { requireActiveTenantId } from "@/lib/tenantContext";
import { getProposalForUser } from "@/lib/mock/proposals";
import {
  deleteProposalDocument,
  validateBlobPath,
} from "@/lib/storage/proposalDocuments";
import { logAudit } from "@/lib/audit";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const ctx = await getAuthzContext();

    if (!ctx.user) {
      return NextResponse.json(
        { ok: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Require active tenant context
    const tenantId = await requireActiveTenantId();

    // RBAC: tenant_admin, saas_admin, and assessor can delete documents
    if (ctx.role !== "tenant_admin" && ctx.role !== "saas_admin" && ctx.role !== "assessor") {
      throw new AuthzHttpError(403, "Only administrators and assessors can delete documents");
    }

    // Also require upload:create permission
    requirePermission(ctx, UPLOAD_CREATE);

    const { id } = await context.params;

    // Validate proposal access
    const proposalResult = getProposalForUser({
      tenantId,
      userId: ctx.user.id || "",
      role: ctx.role,
      proposalId: id,
    });

    if (proposalResult.accessDenied) {
      throw new AuthzHttpError(403, "You do not have access to this proposal");
    }

    if (!proposalResult.proposal) {
      throw new AuthzHttpError(404, "Proposal not found");
    }

    const { searchParams } = new URL(request.url);
    const blobPath = searchParams.get("key");

    if (!blobPath) {
      throw new AuthzHttpError(400, "key query parameter is required");
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
