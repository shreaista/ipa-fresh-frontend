import { NextRequest, NextResponse } from "next/server";
import {
  requireSession,
  requireUserRole,
  requireTenant,
  jsonError,
  AuthzHttpError,
} from "@/lib/authz";
import { getProposalForUser } from "@/lib/mock/proposals";
import { canUserAccessProposal } from "@/lib/mock/proposalsStore";
import { logAssessorAction } from "@/lib/rbac/audit";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireSession();
    requireUserRole(user, ["assessor"]);
    const tenantId = requireTenant(user);
    const { id } = await context.params;

    // Get proposal using the unified access check
    const result = getProposalForUser({
      tenantId,
      userId: user.userId || "",
      role: user.role,
      proposalId: id,
    });

    if (!result.proposal) {
      throw new AuthzHttpError(404, "Proposal not found");
    }

    if (result.accessDenied) {
      throw new AuthzHttpError(403, "Access denied to this proposal");
    }

    // Additional access check using the store
    const hasAccess = canUserAccessProposal({
      userId: user.userId || "",
      tenantId,
      role: user.role,
      proposalId: id,
      proposalTenantId: result.proposal.tenantId,
      proposalAssignedUserId: result.proposal.assignedToUserId,
    });

    if (!hasAccess) {
      throw new AuthzHttpError(403, "Access denied to this proposal");
    }

    await logAssessorAction(
      {
        userId: user.userId || "",
        email: user.email || "",
        name: user.name || "",
        role: user.role,
        tenantId,
        permissions: [],
      },
      "proposal.view",
      "proposal",
      result.proposal.id,
      { proposalName: result.proposal.name }
    );

    return NextResponse.json({
      ok: true,
      data: { proposal: result.proposal },
    });
  } catch (error) {
    return jsonError(error);
  }
}
