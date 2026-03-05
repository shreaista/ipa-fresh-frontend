// API route to list Proposal Evaluations
// GET /api/proposals/[id]/evaluations

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
import {
  listEvaluations,
  downloadEvaluation,
} from "@/lib/evaluation/proposalEvaluator";

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

    // Tenant isolation
    const tenantId = ctx.tenantId ?? ctx.user.id;
    if (!tenantId) {
      throw new AuthzHttpError(400, "Tenant context required");
    }
    requireTenantAccess(ctx, tenantId);

    // Permission check: llm:use OR report:generate
    requireAnyPermission(ctx, [LLM_USE, REPORT_GENERATE]);

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

    // List all evaluations with full data (fitScore, confidence, model, engineType, inputs)
    const evaluations = await listEvaluations(tenantId, id, true);

    // Optionally include the latest full evaluation report
    const includeLatest = request.nextUrl.searchParams.get("includeLatest") === "true";
    let latestReport = null;

    if (includeLatest && evaluations.length > 0) {
      latestReport = await downloadEvaluation(
        tenantId,
        id,
        evaluations[0].blobPath
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        evaluations,
        count: evaluations.length,
        latestReport,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
