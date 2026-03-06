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
  type EvaluationMetadata,
} from "@/lib/evaluation/proposalEvaluator";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function safeParseDate(dateStr: string | undefined | null): number {
  if (!dateStr) return 0;
  const parsed = new Date(dateStr).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function sortEvaluationsByDate(evaluations: EvaluationMetadata[]): EvaluationMetadata[] {
  return [...evaluations].sort((a, b) => {
    const dateA = safeParseDate(a.evaluatedAt);
    const dateB = safeParseDate(b.evaluatedAt);
    return dateB - dateA;
  });
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

    // Parse includeLatest safely
    const includeLatest = request.nextUrl.searchParams.get("includeLatest") === "true";

    // Load evaluations safely from blob storage
    let evaluations: EvaluationMetadata[] = [];
    try {
      const rawEvaluations = await listEvaluations(tenantId, id, true);
      evaluations = sortEvaluationsByDate(rawEvaluations);
    } catch (listError) {
      console.error("[proposalEvaluations.list] Failed to list evaluations:", listError);
      return NextResponse.json({
        ok: true,
        data: {
          evaluations: [],
          count: 0,
          latestReport: null,
        },
      });
    }

    // Handle empty evaluations case
    if (evaluations.length === 0) {
      return NextResponse.json({
        ok: true,
        data: {
          evaluations: [],
          count: 0,
          latestReport: null,
        },
      });
    }

    // Optionally include the latest full evaluation report
    let latestReport = null;

    if (includeLatest && evaluations.length > 0) {
      const latest = evaluations[0];
      // Guard optional fields before downloading
      if (latest && latest.blobPath) {
        try {
          latestReport = await downloadEvaluation(tenantId, id, latest.blobPath);
        } catch (downloadError) {
          console.error("[proposalEvaluations.list] Failed to download latest report:", downloadError);
          latestReport = null;
        }
      }
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
    console.error("[proposalEvaluations.list]", error);
    if (error instanceof AuthzHttpError) {
      return jsonError(error);
    }
    return NextResponse.json(
      { ok: false, error: "Failed to load evaluations" },
      { status: 500 }
    );
  }
}
