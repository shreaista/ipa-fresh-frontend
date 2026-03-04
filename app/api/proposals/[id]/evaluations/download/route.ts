// NEW: API route to download Proposal Evaluation
// GET /api/proposals/[id]/evaluations/download?blobPath=...

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
  downloadEvaluation,
  validateEvaluationBlobPath,
} from "@/lib/evaluation/proposalEvaluator";

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
    if (!validateEvaluationBlobPath(blobPath, tenantId, id)) {
      throw new AuthzHttpError(403, "Invalid blob path for this proposal");
    }

    const report = await downloadEvaluation(tenantId, id, blobPath);

    if (!report) {
      throw new AuthzHttpError(404, "Evaluation not found");
    }

    // NEW: Return as JSON file download (convert to Uint8Array for NextResponse)
    const jsonContent = JSON.stringify(report, null, 2);
    const buffer = Buffer.from(jsonContent, "utf-8");
    const body = new Uint8Array(buffer);
    const filename = `evaluation-${report.evaluationId}.json`;

    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
