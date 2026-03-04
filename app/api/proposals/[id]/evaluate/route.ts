// API route to run Proposal Evaluation with LLM
// POST /api/proposals/[id]/evaluate

import { NextRequest, NextResponse } from "next/server";
import {
  getAuthzContext,
  requireTenantAccess,
  requireAnyPermission,
  canAccessProposal,
  jsonError,
  AuthzHttpError,
  LLM_USE,
  REPORT_GENERATE,
  type Proposal,
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

    // Permission check: llm:use OR report:generate
    requireAnyPermission(ctx, [LLM_USE, REPORT_GENERATE]);

    const { id } = await context.params;

    // Check rate limit before processing
    const rateLimitResult = checkRateLimit(tenantId);
    if (!rateLimitResult.allowed) {
      throw new AuthzHttpError(429, rateLimitResult.message || "Rate limit exceeded");
    }

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

    const proposal = proposalResult.proposal as Proposal & { fund: string };

    // If role is assessor, must also pass canAccessProposal
    if (ctx.role === "assessor" && !canAccessProposal(ctx, proposal)) {
      throw new AuthzHttpError(403, "Access denied to this proposal");
    }

    // Get fund and mandate key for this proposal
    const fund = getFundForProposal(tenantId, proposal.fund);
    const mandateKey = fund?.mandateKey || null;

    // Run evaluation with LLM
    const result = await runEvaluation({
      tenantId,
      proposalId: id,
      fundName: proposal.fund,
      mandateKey,
      evaluatedByUserId: ctx.user.id || "",
      evaluatedByEmail: ctx.user.email || "",
    });

    // Audit log for evaluation run
    logAudit({
      action: "proposal.evaluate",
      actorUserId: ctx.user.id || "",
      actorEmail: ctx.user.email,
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
