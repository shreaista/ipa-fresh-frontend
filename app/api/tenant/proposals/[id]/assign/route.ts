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
  assessorId?: string;
  queueId?: string;
  dueDate?: string | null;
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

    const { assessorId, queueId, dueDate } = body;

    if (!assessorId) {
      throw new AuthzHttpError(400, "Assessor is required");
    }

    if (!queueId) {
      throw new AuthzHttpError(400, "Queue is required");
    }

    // Validate assessor belongs to same tenant
    if (!isUserInTenant(assessorId, tenantId)) {
      throw new AuthzHttpError(400, "Assessor does not belong to this tenant");
    }
    const assignee = getUserById(assessorId);
    const assigneeName = assignee?.name;

    // Validate queue belongs to same tenant and is active
    if (!isQueueInTenant(queueId, tenantId)) {
      throw new AuthzHttpError(400, "Queue not found in tenant");
    }
    const queue = getQueueById(queueId);
    if (!queue) {
      throw new AuthzHttpError(400, "Queue not found");
    }
    if (!queue.isActive) {
      throw new AuthzHttpError(400, "Cannot assign to inactive queue");
    }

    // Update proposal assignment
    const result = assignProposal({
      tenantId,
      proposalId,
      assignToUserId: assessorId,
      assignToUserName: assigneeName,
      assignToQueueId: queueId,
      dueDate,
    });

    if (!result.ok) {
      throw new AuthzHttpError(400, result.error || "Assignment failed");
    }

    // Update the store assignment tracking
    setAssignment(
      proposalId,
      assessorId,
      queueId,
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
        assessorId: result.assignedToUserId,
        queueId: result.assignedQueueId,
        assessorName: assigneeName,
        queueName: queue.name,
        dueDate: result.dueDate,
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        proposalId,
        assessorId: result.assignedToUserId,
        queueId: result.assignedQueueId,
        dueDate: result.dueDate,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
