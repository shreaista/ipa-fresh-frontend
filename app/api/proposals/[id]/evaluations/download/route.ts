// API route to download Proposal Evaluation
// GET /api/proposals/[id]/evaluations/download?blobPath=...

import { NextRequest, NextResponse } from "next/server";
import {
  getAuthzContext,
  requireTenantAccess,
  requirePermission,
  canAccessProposal,
  jsonError,
  AuthzHttpError,
  PROPOSAL_READ,
  type Proposal,
} from "@/lib/authz";
import { getProposalForUser } from "@/lib/mock/proposals";
import {
  downloadEvaluation,
  validateEvaluationBlobPath,
} from "@/lib/evaluation/proposalEvaluator";
import { logAudit } from "@/lib/audit";

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

    // Permission check: proposal:read for downloads
    requirePermission(ctx, PROPOSAL_READ);

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

    const { searchParams } = new URL(request.url);
    const blobPath = searchParams.get("blobPath");

    if (!blobPath) {
      throw new AuthzHttpError(400, "blobPath query parameter is required");
    }

    if (!validateEvaluationBlobPath(blobPath, tenantId, id)) {
      throw new AuthzHttpError(403, "Invalid blob path for this proposal");
    }

    const report = await downloadEvaluation(tenantId, id, blobPath);

    if (!report) {
      throw new AuthzHttpError(404, "Evaluation not found");
    }

    // Audit log for evaluations download
    logAudit({
      action: "proposal_evaluation.download",
      actorUserId: ctx.user.id || "",
      actorEmail: ctx.user.email,
      tenantId,
      resourceType: "proposal_evaluation",
      resourceId: id,
      details: {
        blobPath,
        evaluationId: report.evaluationId,
      },
    });

    const jsonContent = JSON.stringify(report, null, 2);
    const buffer = Buffer.from(jsonContent, "utf-8");
    const body = new Uint8Array(buffer);
    const filename = `evaluation-${report.evaluationId}.json`;

    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
