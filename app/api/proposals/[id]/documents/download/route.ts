// Download route for Proposal Documents

import { NextRequest, NextResponse } from "next/server";
import {
  getAuthzContext,
  requirePermission,
  canAccessProposal,
  jsonError,
  AuthzHttpError,
  PROPOSAL_READ,
  type Proposal,
} from "@/lib/authz";
import { requireActiveTenantId } from "@/lib/tenantContext";
import { getProposalForUser } from "@/lib/mock/proposals";
import {
  downloadProposalDocument,
  validateBlobPath,
} from "@/lib/storage/proposalDocuments";
import { logAudit } from "@/lib/audit";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
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

    // Permission check: proposal:read for downloads
    requirePermission(ctx, PROPOSAL_READ);

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

    const proposal = proposalResult.proposal as Proposal;

    // If role is assessor, must also pass canAccessProposal
    if (ctx.role === "assessor" && !canAccessProposal(ctx, proposal)) {
      throw new AuthzHttpError(403, "Access denied to this proposal");
    }

    const { searchParams } = new URL(request.url);
    const blobPath = searchParams.get("key");

    if (!blobPath) {
      throw new AuthzHttpError(400, "key query parameter is required");
    }

    if (!validateBlobPath(blobPath, tenantId, id)) {
      throw new AuthzHttpError(403, "Invalid blob path for this proposal");
    }

    const result = await downloadProposalDocument(tenantId, id, blobPath);

    if (!result) {
      throw new AuthzHttpError(404, "Document not found");
    }

    // Audit log for document download
    logAudit({
      action: "proposal_document.download",
      actorUserId: ctx.user.id || "",
      actorEmail: ctx.user.email,
      tenantId,
      resourceType: "proposal_document",
      resourceId: id,
      details: {
        blobPath,
        filename: result.filename,
      },
    });

    const body = new Uint8Array(result.buffer);
    return new NextResponse(body, {
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(result.filename)}"`,
        "Content-Length": result.buffer.length.toString(),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
