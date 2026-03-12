// API route for Investment Committee Memo Generation
// POST /api/proposals/[id]/memo - Generate new memo
// GET /api/proposals/[id]/memo - Get latest memo or list all memos

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
  downloadEvaluation,
  listEvaluations,
} from "@/lib/evaluation/proposalEvaluator";
import {
  generateMemoPDF,
  uploadMemoPDF,
  listMemos,
  downloadMemo,
  type MemoInput,
} from "@/lib/evaluation/memoGenerator";
import { logAudit } from "@/lib/audit";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST: Generate new memo from latest evaluation
export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  console.log("[memo.route] starting POST for proposal", id);

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

    // Permission check: llm:use OR report:generate
    requireAnyPermission(ctx, [LLM_USE, REPORT_GENERATE]);

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

    const proposal = proposalResult.proposal as Proposal & { 
      fund: string;
      applicant?: string;
      name?: string;
      amount?: number;
    };

    // If role is assessor, must also pass canAccessProposal
    if (ctx.role === "assessor" && !canAccessProposal(ctx, proposal)) {
      throw new AuthzHttpError(403, "Access denied to this proposal");
    }

    // Get latest evaluation
    const evaluations = await listEvaluations(tenantId, id, true);
    if (evaluations.length === 0) {
      throw new AuthzHttpError(400, "No evaluation found. Please run an evaluation first.");
    }

    // Load the latest evaluation report
    const latestEvalMeta = evaluations[0];
    const evaluationReport = await downloadEvaluation(tenantId, id, latestEvalMeta.blobPath);
    
    if (!evaluationReport) {
      throw new AuthzHttpError(500, "Failed to load evaluation report");
    }

    // Prepare memo input
    const memoInput: MemoInput = {
      proposalId: id,
      proposalName: proposal.name,
      applicant: proposal.applicant,
      fundName: proposal.fund,
      amount: proposal.amount,
      fitScore: evaluationReport.fitScore,
      proposalSummary: evaluationReport.proposalSummary,
      mandateSummary: evaluationReport.mandateSummary,
      strengths: evaluationReport.strengths,
      risks: evaluationReport.risks,
      recommendations: evaluationReport.recommendations,
      confidence: evaluationReport.confidence,
      structuredScores: evaluationReport.structuredScores,
      evaluatedAt: evaluationReport.evaluatedAt,
      evaluatedByEmail: evaluationReport.evaluatedByEmail,
    };

    // Generate PDF
    console.log("[memo.route] Generating PDF memo for proposal", id);
    const pdfBytes = await generateMemoPDF(memoInput);

    // Upload to Azure Blob
    const { blobPath, memoId } = await uploadMemoPDF(
      tenantId,
      id,
      pdfBytes,
      evaluationReport.fitScore
    );

    // Audit log
    logAudit({
      action: "proposal.memo_generated",
      actorUserId: ctx.user.id || "",
      actorEmail: ctx.user.email,
      tenantId,
      resourceType: "proposal_memo",
      resourceId: id,
      details: {
        memoId,
        blobPath,
        fitScore: evaluationReport.fitScore,
        evaluationId: evaluationReport.evaluationId,
      },
    });

    console.log("[memo.route] Memo generated successfully:", memoId);
    console.log("[memo.route] memo generated");

    return NextResponse.json({
      ok: true,
      data: {
        memoId,
        blobPath,
        fitScore: evaluationReport.fitScore,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[memo.route] Error generating memo for proposal", id, error);
    if (error instanceof AuthzHttpError) {
      return jsonError(error);
    }
    return NextResponse.json(
      { ok: false, error: "Failed to generate memo" },
      { status: 500 }
    );
  }
}

// GET: List memos or download specific memo
export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const searchParams = request.nextUrl.searchParams;
  const blobPath = searchParams.get("blobPath");

  console.log("[memo.route] starting GET for proposal", id, blobPath ? `(download: ${blobPath})` : "(list)");

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

    // If blobPath is provided, download specific memo
    if (blobPath) {
      console.log("[memo.route] memo download requested");
      const result = await downloadMemo(tenantId, id, blobPath);
      
      if (!result) {
        throw new AuthzHttpError(404, "Memo not found");
      }

      // Extract filename from path
      const filename = `investment_memo_${id}.pdf`;

      // Convert Buffer to Uint8Array for NextResponse compatibility
      const uint8Array = new Uint8Array(result.buffer);

      return new NextResponse(uint8Array, {
        status: 200,
        headers: {
          "Content-Type": result.contentType,
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length": result.buffer.length.toString(),
        },
      });
    }

    // Otherwise, list all memos
    const memos = await listMemos(tenantId, id);

    const latest = memos[0] ?? null;
    const latestMemoMetadata = latest
      ? {
          latestMemoFileName: latest.fileName,
          latestMemoGeneratedAt: latest.generatedAt,
          latestMemoBlobPath: latest.blobPath,
        }
      : null;

    console.log("[memo.route] latest memo loaded");
    console.log("[memo.route] memo history count:", memos.length);

    return NextResponse.json({
      ok: true,
      data: {
        memos,
        count: memos.length,
        memoCount: memos.length,
        latestMemoFileName: latestMemoMetadata?.latestMemoFileName ?? null,
        latestMemoGeneratedAt: latestMemoMetadata?.latestMemoGeneratedAt ?? null,
        latestMemoBlobPath: latestMemoMetadata?.latestMemoBlobPath ?? null,
      },
    });
  } catch (error) {
    console.error("[memo.route] Error in GET for proposal", id, error);
    if (error instanceof AuthzHttpError) {
      return jsonError(error);
    }
    return NextResponse.json(
      { ok: false, error: "Failed to get memos" },
      { status: 500 }
    );
  }
}
