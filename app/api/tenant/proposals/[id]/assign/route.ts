import { NextRequest, NextResponse } from "next/server";
import {
  requireSession,
  requireUserRole,
  requireTenant,
  jsonError,
  AuthzHttpError,
} from "@/lib/authz";
import { assignProposal, getProposalById } from "@/lib/mock/proposals";
import { getQueueById } from "@/lib/mock/queues";
import {
  isUserInTenant,
  isQueueInTenant,
  getUserById,
  setAssignment,
} from "@/lib/mock/proposalsStore";
import { logAudit } from "@/lib/audit";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface AssignRequestBody {
  assignedUserId?: string;
  queueId?: string;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireSession();
    requireUserRole(user, ["tenant_admin", "saas_admin"]);
    const tenantId = requireTenant(user);
    const { id: proposalId } = await context.params;

    const proposal = getProposalById(proposalId);
    if (!proposal) {
      throw new AuthzHttpError(404, "Proposal not found");
    }

    if (proposal.tenantId !== tenantId) {
      throw new AuthzHttpError(403, "Proposal not in your tenant");
    }

    let body: AssignRequestBody;
    try {
      body = await request.json();
    } catch {
      throw new AuthzHttpError(400, "Invalid JSON body");
    }

    const { assignedUserId, queueId } = body;

    if (assignedUserId && queueId) {
      throw new AuthzHttpError(400, "Cannot assign to both user and queue");
    }

    if (!assignedUserId && !queueId) {
      throw new AuthzHttpError(400, "Must assign to user or queue");
    }

    let assigneeName: string | undefined;

    // Validate assignee belongs to same tenant
    if (assignedUserId) {
      if (!isUserInTenant(assignedUserId, tenantId)) {
        throw new AuthzHttpError(400, "Assignee does not belong to this tenant");
      }
      const assignee = getUserById(assignedUserId);
      assigneeName = assignee?.name;
    }

    // Validate queue belongs to same tenant
    if (queueId) {
      if (!isQueueInTenant(queueId, tenantId)) {
        throw new AuthzHttpError(400, "Queue not found in tenant");
      }
      const queue = getQueueById(queueId);
      if (!queue) {
        throw new AuthzHttpError(400, "Queue not found");
      }
    }

    // Update proposal assignment
    const result = assignProposal({
      tenantId,
      proposalId,
      assignToUserId: assignedUserId,
      assignToUserName: assigneeName,
      assignToQueueId: queueId,
    });

    if (!result.ok) {
      throw new AuthzHttpError(400, result.error || "Assignment failed");
    }

    // Update the store assignment tracking
    setAssignment(
      proposalId,
      assignedUserId || null,
      queueId || null,
      user.userId || ""
    );

    // Audit log
    logAudit({
      action: "proposal.assign",
      actorUserId: user.userId || "",
      actorEmail: user.email,
      tenantId,
      resourceType: "proposal",
      resourceId: proposalId,
      details: {
        assignedToUserId: result.assignedToUserId,
        assignedQueueId: result.assignedQueueId,
        assigneeName,
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        assignedToUserId: result.assignedToUserId,
        assignedQueueId: result.assignedQueueId,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
