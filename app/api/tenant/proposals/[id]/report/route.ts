// GET /api/tenant/proposals/[id]/report
// Returns latest saved report for proposal

import { NextRequest, NextResponse } from "next/server";
import {
  requireSession,
  requireTenant,
  jsonError,
  AuthzHttpError,
} from "@/lib/authz";
import { getProposalById } from "@/lib/mock/proposals";
import { getLatestReport } from "@/lib/evaluation/reportEngine";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id: proposalId } = await context.params;

  try {
    const user = await requireSession();
    const tenantId = requireTenant(user);

    const proposal = getProposalById(proposalId);
    if (!proposal) {
      throw new AuthzHttpError(404, "Proposal not found");
    }

    if (proposal.tenantId !== tenantId) {
      throw new AuthzHttpError(403, "Proposal not in your tenant");
    }

    const report = await getLatestReport(tenantId, proposalId);

    return NextResponse.json({
      ok: true,
      data: {
        report: report ?? null,
      },
    });
  } catch (error) {
    console.error("[report] Error for proposal", proposalId, error);
    if (error instanceof AuthzHttpError) {
      return jsonError(error);
    }
    return NextResponse.json(
      { ok: false, error: "Failed to get report" },
      { status: 500 }
    );
  }
}
