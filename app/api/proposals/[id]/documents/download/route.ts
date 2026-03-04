// NEW: Download route for Proposal Documents

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
  downloadProposalDocument,
  validateBlobPath,
} from "@/lib/storage/proposalDocuments";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireSession();
    requireRBACPermission(session, RBAC_PERMISSIONS.PROPOSAL_DOCUMENT_READ);
    const tenantId = requireTenant(session);
    const { id } = await context.params;

    // NEW: Validate proposal access
    const proposalResult = getProposalForUser({
      tenantId,
      userId: session.userId || "",
      role: session.role,
      proposalId: id,
    });

    if (proposalResult.accessDenied) {
      throw new AuthzHttpError(403, "You do not have access to this proposal");
    }

    if (!proposalResult.proposal) {
      throw new AuthzHttpError(404, "Proposal not found");
    }

    const { searchParams } = new URL(request.url);
    const blobPath = searchParams.get("blobPath");

    if (!blobPath) {
      throw new AuthzHttpError(400, "blobPath query parameter is required");
    }

    // NEW: Validate blob path belongs to this tenant/proposal
    if (!validateBlobPath(blobPath, tenantId, id)) {
      throw new AuthzHttpError(403, "Invalid blob path for this proposal");
    }

    const result = await downloadProposalDocument(tenantId, id, blobPath);

    if (!result) {
      throw new AuthzHttpError(404, "Document not found");
    }

    // NEW: Return file as attachment (convert Buffer to Uint8Array for NextResponse)
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
