// NEW: API route to list Proposal Evaluations
// GET /api/proposals/[id]/evaluations

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
  listEvaluations,
  downloadEvaluation,
  type EvaluationMetadata,
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

    // NEW: List all evaluations for this proposal
    const evaluations = await listEvaluations(tenantId, id);

    // NEW: Optionally include the latest evaluation report
    const includeLatest = request.nextUrl.searchParams.get("includeLatest") === "true";
    let latestReport = null;

    if (includeLatest && evaluations.length > 0) {
      latestReport = await downloadEvaluation(
        tenantId,
        id,
        evaluations[0].blobPath
      );

      // Update fitScore in metadata from actual report
      if (latestReport) {
        evaluations[0].fitScore = latestReport.fitScore;
      }
    }

    // NEW: Try to get fitScores for all evaluations (limited to first 5 for performance)
    const evaluationsWithScores: EvaluationMetadata[] = [];
    for (let i = 0; i < Math.min(evaluations.length, 5); i++) {
      const eval_ = evaluations[i];
      if (i === 0 && latestReport) {
        evaluationsWithScores.push({ ...eval_, fitScore: latestReport.fitScore });
      } else {
        const report = await downloadEvaluation(tenantId, id, eval_.blobPath);
        evaluationsWithScores.push({
          ...eval_,
          fitScore: report?.fitScore || 0,
        });
      }
    }

    // Add remaining evaluations without scores
    for (let i = 5; i < evaluations.length; i++) {
      evaluationsWithScores.push(evaluations[i]);
    }

    return NextResponse.json({
      ok: true,
      data: {
        evaluations: evaluationsWithScores,
        count: evaluations.length,
        latestReport,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
