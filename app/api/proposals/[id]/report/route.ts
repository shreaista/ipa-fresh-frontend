// GET /api/proposals/[id]/report
// Returns the latest generated report (for AI Memo tab display when no evaluation exists)

import { NextRequest, NextResponse } from "next/server";
import {
  getAuthzContext,
  requireTenantAccess,
  canAccessProposal,
  jsonError,
  AuthzHttpError,
  type Proposal,
} from "@/lib/authz";
import { getProposalForUser } from "@/lib/mock/proposals";
import { getLatestReport } from "@/lib/evaluation/reportGenerator";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const ctx = await getAuthzContext();

    if (!ctx.user) {
      return NextResponse.json(
        { ok: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const tenantId = ctx.tenantId ?? ctx.user.id;
    if (!tenantId) {
      throw new AuthzHttpError(400, "Tenant context required");
    }
    requireTenantAccess(ctx, tenantId);

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

    if (ctx.role === "assessor" && !canAccessProposal(ctx, proposal)) {
      throw new AuthzHttpError(403, "Access denied to this proposal");
    }

    const report = await getLatestReport(tenantId, id);

    return NextResponse.json({
      ok: true,
      data: {
        report: report ?? null,
      },
    });
  } catch (error) {
    console.error("[report.route] Error for proposal", id, error);
    if (error instanceof AuthzHttpError) {
      return jsonError(error);
    }
    return NextResponse.json(
      { ok: false, error: "Failed to get report" },
      { status: 500 }
    );
  }
}
