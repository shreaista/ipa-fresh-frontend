// GET /api/dashboard/fund-manager
// Aggregates proposals with latest evaluation data for Fund Manager Dashboard

import { NextResponse } from "next/server";
import {
  getAuthzContext,
  requireTenantAccess,
  jsonError,
  AuthzHttpError,
} from "@/lib/authz";
import { listProposalsWithAssignmentForUser } from "@/lib/mock/proposals";
import { listEvaluations } from "@/lib/evaluation/proposalEvaluator";
import { listProposalDocuments } from "@/lib/storage/proposalDocuments";

export interface FundManagerProposal {
  id: string;
  name: string;
  applicant: string;
  fund: string;
  fundId?: string;
  amount: number;
  status: string;
  priority: string;
  fitScore: number | null;
  validationScore: number | null;
  risks: string[];
  documentCount: number;
  hasMissingData: boolean;
  riskLevel: "low" | "medium" | "high";
}

export async function GET() {
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

    const allowedRoles = ["tenant_admin", "saas_admin", "fund_manager", "viewer"];
    if (!allowedRoles.includes(ctx.role)) {
      throw new AuthzHttpError(403, "Fund Manager Dashboard requires tenant_admin, saas_admin, fund_manager, or viewer");
    }

    const proposals = listProposalsWithAssignmentForUser({
      tenantId,
      userId: ctx.user.id || "",
      role: ctx.role,
    });

    const enriched: FundManagerProposal[] = [];

    for (const p of proposals) {
      let fitScore: number | null = null;
      let validationScore: number | null = null;
      let risks: string[] = [];

      const evals = await listEvaluations(tenantId, p.id, true);
      if (evals.length > 0) {
        const latest = evals[0];
        fitScore = latest.fitScore;
        validationScore = latest.validationScore ?? null;
        risks = latest.risks ?? [];
      }

      const docsResult = await listProposalDocuments(tenantId, p.id);
      const docs = docsResult.flat.filter((d) => !d.blobPath.includes("/evaluations/"));
      const documentCount = docs.length;
      const hasMissingData = documentCount === 0;

      let riskLevel: "low" | "medium" | "high" = "low";
      if (
        (fitScore !== null && fitScore < 50) ||
        (validationScore !== null && validationScore < 50) ||
        risks.length >= 4
      ) {
        riskLevel = "high";
      } else if (
        (fitScore !== null && fitScore < 70) ||
        (validationScore !== null && validationScore < 70) ||
        risks.length >= 2 ||
        hasMissingData
      ) {
        riskLevel = "medium";
      }

      enriched.push({
        id: p.id,
        name: p.name,
        applicant: p.applicant,
        fund: p.fund,
        fundId: p.fundId,
        amount: p.amount,
        status: p.status,
        priority: p.priority,
        fitScore,
        validationScore,
        risks,
        documentCount,
        hasMissingData,
        riskLevel,
      });
    }

    // Aggregate for AI Summary
    const allRisks = enriched.flatMap((e) => e.risks);
    const riskCounts = allRisks.reduce(
      (acc, r) => {
        acc[r] = (acc[r] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    const topRisks = Object.entries(riskCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([risk]) => risk);

    const commonIssues = [
      ...(enriched.filter((e) => e.hasMissingData).length > 0 ? ["Missing proposal documents"] : []),
      ...(enriched.filter((e) => (e.validationScore ?? 100) < 70).length > 0 ? ["Low validation scores"] : []),
      ...(enriched.filter((e) => (e.fitScore ?? 100) < 60).length > 0 ? ["Poor mandate fit"] : []),
    ];

    return NextResponse.json({
      ok: true,
      data: {
        proposals: enriched,
        summary: {
          topRisks,
          commonIssues,
          totalProposals: enriched.length,
          readyForReview: enriched.filter(
            (e) => e.fitScore !== null && (e.status === "In Review" || e.status === "Assigned")
          ).length,
          needsAttention: enriched.filter(
            (e) =>
              e.riskLevel === "high" ||
              e.hasMissingData ||
              (e.validationScore !== null && e.validationScore < 50)
          ).length,
        },
      },
    });
  } catch (error) {
    console.error("[fund-manager] Error:", error);
    if (error instanceof AuthzHttpError) {
      return jsonError(error);
    }
    return NextResponse.json(
      { ok: false, error: "Failed to load fund manager data" },
      { status: 500 }
    );
  }
}
