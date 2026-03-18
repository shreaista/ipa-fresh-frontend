// PATCH /api/proposals/[id]/status
// Update proposal status (Approve, Reject, Defer)

import { NextRequest, NextResponse } from "next/server";
import {
  getAuthzContext,
  requireTenantAccess,
  jsonError,
  AuthzHttpError,
} from "@/lib/authz";
import { getProposalForUser, updateProposalStatus, type ProposalStatus } from "@/lib/mock/proposals";
import { logAudit } from "@/lib/audit";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const VALID_ACTIONS: ProposalStatus[] = ["Approved", "Declined", "Deferred"];

export async function PATCH(request: NextRequest, context: RouteContext) {
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

    if (ctx.role !== "tenant_admin" && ctx.role !== "saas_admin") {
      throw new AuthzHttpError(403, "Only tenant_admin or saas_admin can update proposal status");
    }

    const { id } = await context.params;
    const body = await request.json();
    const status = body?.status as string | undefined;

    if (!status || !VALID_ACTIONS.includes(status as ProposalStatus)) {
      return NextResponse.json(
        { ok: false, error: "Invalid status. Use Approved, Declined, or Deferred" },
        { status: 400 }
      );
    }

    const proposalResult = getProposalForUser({
      tenantId,
      userId: ctx.user.id || "",
      role: ctx.role,
      proposalId: id,
    });

    if (proposalResult.accessDenied) {
      throw new AuthzHttpError(403, "Access denied to this proposal");
    }

    if (!proposalResult.proposal) {
      throw new AuthzHttpError(404, "Proposal not found");
    }

    const previousStatus = proposalResult.proposal!.status;

    const result = updateProposalStatus({
      proposalId: id,
      tenantId,
      userId: ctx.user.id || "",
      role: ctx.role,
      status: status as ProposalStatus,
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error || "Failed to update status" },
        { status: 400 }
      );
    }

    logAudit({
      action: "proposal.status_update",
      actorUserId: ctx.user.id || "",
      actorEmail: ctx.user.email,
      tenantId,
      resourceType: "proposal",
      resourceId: id,
      details: {
        before: previousStatus,
        after: status,
        proposalName: proposalResult.proposal!.name,
      },
    });

    return NextResponse.json({
      ok: true,
      data: { proposalId: id, status },
    });
  } catch (error) {
    console.error("[proposal.status] Error:", error);
    if (error instanceof AuthzHttpError) {
      return jsonError(error);
    }
    return NextResponse.json(
      { ok: false, error: "Failed to update proposal status" },
      { status: 500 }
    );
  }
}
