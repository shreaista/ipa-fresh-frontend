// POST /api/tenant/proposals/[id]/generate-report
// Full Report Engine - generates AI investment memo

import { NextRequest, NextResponse } from "next/server";
import {
  requireSession,
  requireTenant,
  jsonError,
  AuthzHttpError,
} from "@/lib/authz";
import { getProposalById } from "@/lib/mock/proposals";
import { generateInvestmentReport } from "@/lib/evaluation/reportEngine";
import { logAudit } from "@/lib/audit";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id: proposalId } = await context.params;

  try {
    console.log("[generate-report] Report generation started for proposal", proposalId);

    const user = await requireSession();
    const tenantId = requireTenant(user);

    const proposal = getProposalById(proposalId);
    if (!proposal) {
      throw new AuthzHttpError(404, "Proposal not found");
    }

    if (proposal.tenantId !== tenantId) {
      throw new AuthzHttpError(403, "Proposal not in your tenant");
    }

    console.log("[generate-report] Proposal loaded:", proposalId);

    const report = await generateInvestmentReport({
      tenantId,
      proposalId,
      proposalName: proposal.name,
      applicant: proposal.applicant,
      fundName: proposal.fund,
      fundId: proposal.fundId ?? null,
      amount: proposal.amount,
      generatedByUserId: user.userId || "",
      generatedByEmail: user.email || "",
    });

    logAudit({
      action: "proposal.report_generated",
      actorUserId: user.userId || "",
      actorEmail: user.email,
      tenantId,
      resourceType: "proposal_report",
      resourceId: proposalId,
      details: {
        reportId: report.reportId,
        score: report.score,
        decision: report.decision,
      },
    });

    console.log("[generate-report] Report saved:", report.reportId);

    return NextResponse.json({
      ok: true,
      data: {
        reportId: report.reportId,
        proposalId: report.proposalId,
        title: report.title,
        generatedAt: report.generatedAt,
        score: report.score,
        confidence: report.confidence,
        summary: report.summary,
        investmentThesis: report.investmentThesis,
        strengths: report.strengths,
        risks: report.risks,
        recommendations: report.recommendations,
        validationSummary: report.validationSummary,
        fitSummary: report.fitSummary,
        decision: report.decision,
        warnings: report.warnings,
      },
    });
  } catch (error) {
    console.error("[generate-report] Error for proposal", proposalId, error);
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
