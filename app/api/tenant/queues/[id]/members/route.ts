import { NextRequest, NextResponse } from "next/server";
import {
  requireSession,
  requireUserRole,
  requireTenant,
  jsonError,
  AuthzHttpError,
} from "@/lib/authz";
import {
  getQueueById,
  getQueueMembersForTenantQueue,
  addQueueMember,
  removeQueueMember,
} from "@/lib/mock/queues";
import { getUserById, isUserInTenant } from "@/lib/mock/proposalsStore";
import { logAudit } from "@/lib/audit";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireSession();
    requireUserRole(user, ["tenant_admin", "saas_admin"]);
    const tenantId = requireTenant(user);
    const { id: queueId } = await context.params;

    const queue = getQueueById(queueId);
    if (!queue || queue.tenantId !== tenantId) {
      throw new AuthzHttpError(404, "Queue not found");
    }

    const members = getQueueMembersForTenantQueue(queueId, tenantId);

    const membersWithDetails = members.map((m) => {
      const memberUser = getUserById(m.userId);
      return {
        userId: m.userId,
        name: memberUser?.name || "Unknown",
        email: memberUser?.email || "",
        addedAt: m.addedAt,
      };
    });

    return NextResponse.json({
      ok: true,
      data: {
        queueId,
        queueName: queue.name,
        members: membersWithDetails,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

interface AddMemberBody {
  userId?: string;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireSession();
    requireUserRole(user, ["tenant_admin", "saas_admin"]);
    const tenantId = requireTenant(user);
    const { id: queueId } = await context.params;

    const queue = getQueueById(queueId);
    if (!queue || queue.tenantId !== tenantId) {
      throw new AuthzHttpError(404, "Queue not found");
    }

    let body: AddMemberBody;
    try {
      body = await request.json();
    } catch {
      throw new AuthzHttpError(400, "Invalid JSON body");
    }

    const { userId } = body;
    if (!userId || typeof userId !== "string") {
      throw new AuthzHttpError(400, "userId is required");
    }

    if (!isUserInTenant(userId, tenantId)) {
      throw new AuthzHttpError(400, "User does not belong to this tenant");
    }

    const memberUser = getUserById(userId);
    if (!memberUser || memberUser.role !== "assessor") {
      throw new AuthzHttpError(400, "Only assessors can be added to queues");
    }

    const result = addQueueMember({ queueId, tenantId, userId });

    if (!result.ok) {
      throw new AuthzHttpError(400, result.error || "Failed to add member");
    }

    logAudit({
      action: "queue.member.add",
      actorUserId: user.userId || "",
      actorEmail: user.email,
      tenantId,
      resourceType: "queue",
      resourceId: queueId,
      details: { memberId: userId, memberName: memberUser.name },
    });

    return NextResponse.json({
      ok: true,
      data: {
        member: {
          userId,
          name: memberUser.name,
          email: memberUser.email,
          addedAt: result.data!.addedAt,
        },
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

interface RemoveMemberBody {
  userId?: string;
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireSession();
    requireUserRole(user, ["tenant_admin", "saas_admin"]);
    const tenantId = requireTenant(user);
    const { id: queueId } = await context.params;

    const queue = getQueueById(queueId);
    if (!queue || queue.tenantId !== tenantId) {
      throw new AuthzHttpError(404, "Queue not found");
    }

    let body: RemoveMemberBody;
    try {
      body = await request.json();
    } catch {
      throw new AuthzHttpError(400, "Invalid JSON body");
    }

    const { userId } = body;
    if (!userId || typeof userId !== "string") {
      throw new AuthzHttpError(400, "userId is required");
    }

    const memberUser = getUserById(userId);
    const result = removeQueueMember({ queueId, tenantId, userId });

    if (!result.ok) {
      throw new AuthzHttpError(400, result.error || "Failed to remove member");
    }

    logAudit({
      action: "queue.member.remove",
      actorUserId: user.userId || "",
      actorEmail: user.email,
      tenantId,
      resourceType: "queue",
      resourceId: queueId,
      details: { memberId: userId, memberName: memberUser?.name || userId },
    });

    return NextResponse.json({
      ok: true,
      data: { removed: true },
    });
  } catch (error) {
    return jsonError(error);
  }
}
