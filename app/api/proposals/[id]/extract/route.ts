// GET /api/proposals/[id]/extract
// Returns extracted/parsed text from proposal documents for preview

import { NextResponse } from "next/server";
import {
  getAuthzContext,
  requireTenantAccess,
  canAccessProposal,
  jsonError,
  AuthzHttpError,
  type Proposal,
} from "@/lib/authz";
import { getProposalForUser } from "@/lib/mock/proposals";
import { listProposalDocuments } from "@/lib/storage/proposalDocuments";
import { extractTextFromBlobs } from "@/lib/evaluation/textExtraction";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
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

    const docsResult = await listProposalDocuments(tenantId, id);
    const docs = docsResult.flat.filter(
      (d) => !d.blobPath.includes("/evaluations/")
    );

    if (docs.length === 0) {
      return NextResponse.json({
        ok: true,
        data: {
          documents: [],
          combinedText: "",
        },
      });
    }

    const proposalBlobs = docs.map((d) => ({
      blobPath: d.blobPath,
      contentType: d.contentType,
      filename: d.filename,
      uploadedAt: d.uploadedAt,
    }));

    const { results } = await extractTextFromBlobs(proposalBlobs);

    return NextResponse.json({
      ok: true,
      data: {
        documents: results.map((r) => ({
          filename: r.filename,
          text: r.text,
          isPlaceholder: r.isPlaceholder,
          warning: r.warning,
        })),
        combinedText: results.map((r) => r.text).join("\n\n"),
      },
    });
  } catch (error) {
    console.error("[extract.route] Error extracting proposal", id, error);
    if (error instanceof AuthzHttpError) {
      return jsonError(error);
    }
    return NextResponse.json(
      { ok: false, error: "Failed to extract proposal content" },
      { status: 500 }
    );
  }
}
