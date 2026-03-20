// POST /api/proposals/[id]/generate-report
// Combines proposal extracted text + fund mandate, calls OpenAI, stores report, generates PDF

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
import { generateReport } from "@/lib/evaluation/reportGenerator";
import { checkRateLimit } from "@/lib/evaluation/rateLimiter";
import { logAudit } from "@/lib/audit";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
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

    requireAnyPermission(ctx, [LLM_USE, REPORT_GENERATE]);

    const rateLimitResult = checkRateLimit(tenantId);
    if (!rateLimitResult.allowed) {
      throw new AuthzHttpError(429, rateLimitResult.message || "Rate limit exceeded");
    }

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

    const proposal = proposalResult.proposal as Proposal & {
      fund: string;
      fundId?: string;
      applicant?: string;
      name?: string;
      amount?: number;
    };

    if (ctx.role === "assessor" && !canAccessProposal(ctx, proposal)) {
      throw new AuthzHttpError(403, "Access denied to this proposal");
    }

    const result = await generateReport({
      tenantId,
      proposalId: id,
      proposalName: proposal.name,
      applicant: proposal.applicant,
      fundName: proposal.fund,
      fundId: proposal.fundId || null,
      amount: proposal.amount,
      generatedByUserId: ctx.user.id || "",
      generatedByEmail: ctx.user.email || "",
    });

    logAudit({
      action: "proposal.report_generated",
      actorUserId: ctx.user.id || "",
      actorEmail: ctx.user.email,
      tenantId,
      resourceType: "proposal_report",
      resourceId: id,
      details: {
        reportId: result.reportId,
        memoBlobPath: result.memoBlobPath,
        fitScore: result.report.fitScore,
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        reportId: result.reportId,
        report: result.report,
        memoBlobPath: result.memoBlobPath,
        memoId: result.memoId,
        generatedAt: result.generatedAt,
      },
      rateLimit: {
        remaining: rateLimitResult.remaining,
      },
    });
  } catch (error) {
    console.error("[generate-report.route] Error for proposal", id, error);
    if (error instanceof AuthzHttpError) {
      return jsonError(error);
    }
    const message = error instanceof Error ? error.message : "Failed to generate report";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
