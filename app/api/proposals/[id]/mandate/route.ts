// API route to get Fund Mandate for a Proposal
// GET /api/proposals/[id]/mandate

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
import { listFundMandates } from "@/lib/storage/azure";
import { listFundMandateBlobsByFundId } from "@/lib/storage/azureBlob";

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

    // Permission check: proposal:read for mandate fetch
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

    const proposal = proposalResult.proposal as Proposal & { fund: string; fundId?: string };

    // If role is assessor, must also pass canAccessProposal
    if (ctx.role === "assessor" && !canAccessProposal(ctx, proposal)) {
      throw new AuthzHttpError(403, "Access denied to this proposal");
    }

    const fundId = proposal.fundId;

    if (!fundId) {
      return NextResponse.json({
        ok: true,
        data: {
          mandate: null,
          message: "No fund associated with this proposal",
        },
      });
    }

    // Fetch mandate files from fundId-based storage (tenants/{tenantId}/funds/{fundId}/mandates/)
    let templateFiles: Array<{
      name: string;
      blobPath: string;
      uploadedAt: string;
      size: number;
    }> = [];

    try {
      const blobs = await listFundMandateBlobsByFundId(tenantId, fundId);
      templateFiles = blobs.map((b) => ({
        name: b.name,
        blobPath: b.blobPath,
        uploadedAt: b.uploadedAt,
        size: b.size,
      }));
    } catch (error) {
      console.error("[proposal/mandate] Error listing mandate files for fundId:", fundId, error);
      try {
        const legacyBlobs = await listFundMandates({ tenantId });
        const byFund = legacyBlobs.filter((b) => b.mandateKey === fundId);
        templateFiles = byFund.map((b) => ({
          name: b.name,
          blobPath: b.blobName,
          uploadedAt: b.uploadedAt,
          size: b.size,
        }));
      } catch {
        // ignore
      }
    }

    return NextResponse.json({
      ok: true,
      data: {
        mandate: {
          mandateId: fundId,
          mandateName: proposal.fund,
          strategy: "",
          geography: "",
          ticketRange: "",
          minTicket: 0,
          maxTicket: 0,
          version: 1,
          status: "active",
          notes: undefined,
          templateFiles,
        },
        fund: {
          fundId,
          fundName: proposal.fund,
        },
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
