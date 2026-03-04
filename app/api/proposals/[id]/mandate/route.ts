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
import { getFundForProposal } from "@/lib/mock/funds";
import { getFundMandateById } from "@/lib/mock/fundMandates";
import { listFundMandates } from "@/lib/storage/azure";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function formatTicketAmount(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  return `$${amount}`;
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

    const proposal = proposalResult.proposal as Proposal & { fund: string };

    // If role is assessor, must also pass canAccessProposal
    if (ctx.role === "assessor" && !canAccessProposal(ctx, proposal)) {
      throw new AuthzHttpError(403, "Access denied to this proposal");
    }

    // NEW: Get fund for this proposal (by fund name)
    const fund = getFundForProposal(tenantId, proposal.fund);

    if (!fund) {
      return NextResponse.json({
        ok: true,
        data: {
          mandate: null,
          message: "No fund associated with this proposal",
        },
      });
    }

    if (!fund.mandateTemplateId) {
      return NextResponse.json({
        ok: true,
        data: {
          mandate: null,
          message: "No mandate template assigned to this fund",
        },
      });
    }

    // NEW: Get mandate template details
    const mandate = getFundMandateById(tenantId, fund.mandateTemplateId);

    if (!mandate) {
      return NextResponse.json({
        ok: true,
        data: {
          mandate: null,
          message: "Mandate template not found",
        },
      });
    }

    // NEW: Get template files from Azure blob storage
    let templateFiles: Array<{
      name: string;
      blobPath: string;
      uploadedAt: string;
      size: number;
    }> = [];

    if (fund.mandateKey) {
      try {
        const blobs = await listFundMandates({
          tenantId,
          mandateKey: fund.mandateKey,
        });

        templateFiles = blobs.map((blob) => ({
          name: blob.name,
          blobPath: blob.blobName,
          uploadedAt: blob.uploadedAt,
          size: blob.size,
        }));
      } catch (error) {
        console.error("[proposal/mandate] Error listing mandate files:", error);
      }
    }

    // NEW: Return mandate data
    return NextResponse.json({
      ok: true,
      data: {
        mandate: {
          mandateId: mandate.id,
          mandateName: mandate.name,
          strategy: mandate.strategy,
          geography: mandate.geography,
          ticketRange: `${formatTicketAmount(mandate.minTicket)} - ${formatTicketAmount(mandate.maxTicket)}`,
          minTicket: mandate.minTicket,
          maxTicket: mandate.maxTicket,
          version: mandate.version,
          status: mandate.status,
          notes: mandate.notes,
          templateFiles,
        },
        fund: {
          fundId: fund.id,
          fundName: fund.name,
          mandateKey: fund.mandateKey,
        },
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
