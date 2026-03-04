// NEW: API route to run Proposal Evaluation with LLM
// POST /api/proposals/[id]/evaluate

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
import { getFundForProposal } from "@/lib/mock/funds";
import { runEvaluation } from "@/lib/evaluation/proposalEvaluator";
import { checkRateLimit } from "@/lib/evaluation/rateLimiter";
import { logAudit } from "@/lib/audit";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireSession();
    requireRBACPermission(session, RBAC_PERMISSIONS.PROPOSAL_DOCUMENT_READ);
    const tenantId = requireTenant(session);
    const { id } = await context.params;

    // NEW: Check rate limit before processing
    const rateLimitResult = checkRateLimit(tenantId);
    if (!rateLimitResult.allowed) {
      throw new AuthzHttpError(429, rateLimitResult.message || "Rate limit exceeded");
    }

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

    const proposal = proposalResult.proposal;

    // NEW: Get fund and mandate key for this proposal
    const fund = getFundForProposal(tenantId, proposal.fund);
    const mandateKey = fund?.mandateKey || null;

    // NEW: Run evaluation with LLM
    const result = await runEvaluation({
      tenantId,
      proposalId: id,
      fundName: proposal.fund,
      mandateKey,
      evaluatedByUserId: session.userId || "",
      evaluatedByEmail: session.email || "",
    });

    // NEW: Audit log
    logAudit({
      action: "proposal.evaluate",
      actorUserId: session.userId || "",
      actorEmail: session.email,
      tenantId,
      resourceType: "proposal_evaluation",
      resourceId: id,
      details: {
        evaluationId: result.report.evaluationId,
        blobPath: result.blobPath,
        fitScore: result.report.fitScore,
        engineType: result.report.engineType,
        model: result.report.model,
        proposalDocuments: result.report.inputs.proposalDocuments,
        mandateTemplates: result.report.inputs.mandateTemplates,
      },
    });

    // NEW: Return result with rate limit info
    return NextResponse.json({
      ok: true,
      data: {
        report: result.report,
        blobPath: result.blobPath,
      },
      rateLimit: {
        remaining: rateLimitResult.remaining,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
