import { NextRequest, NextResponse } from "next/server";
import {
  requireSession,
  requireUserRole,
  requireTenant,
  jsonError,
  AuthzHttpError,
} from "@/lib/authz";
import { getQueueById, updateQueue, deleteQueue } from "@/lib/mock/queues";
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

    return NextResponse.json({
      ok: true,
      data: {
        queue: {
          id: queue.id,
          name: queue.name,
          description: queue.description,
          isActive: queue.isActive,
          createdAt: queue.createdAt,
        },
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

interface UpdateQueueBody {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireSession();
    requireUserRole(user, ["tenant_admin", "saas_admin"]);
    const tenantId = requireTenant(user);
    const { id: queueId } = await context.params;

    const queue = getQueueById(queueId);
    if (!queue || queue.tenantId !== tenantId) {
      throw new AuthzHttpError(404, "Queue not found");
    }

    let body: UpdateQueueBody;
    try {
      body = await request.json();
    } catch {
      throw new AuthzHttpError(400, "Invalid JSON body");
    }

    const result = updateQueue({
      queueId,
      tenantId,
      name: body.name,
      description: body.description,
      isActive: body.isActive,
    });

    if (!result.ok) {
      throw new AuthzHttpError(400, result.error || "Failed to update queue");
    }

    logAudit({
      action: "queue.update",
      actorUserId: user.userId || "",
      actorEmail: user.email,
      tenantId,
      resourceType: "queue",
      resourceId: queueId,
      details: { name: body.name, description: body.description, isActive: body.isActive },
    });

    return NextResponse.json({
      ok: true,
      data: {
        queue: {
          id: result.data!.id,
          name: result.data!.name,
          description: result.data!.description,
          isActive: result.data!.isActive,
          createdAt: result.data!.createdAt,
        },
      },
    });
  } catch (error) {
    return jsonError(error);
  }
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

    const result = deleteQueue({ queueId, tenantId });

    if (!result.ok) {
      throw new AuthzHttpError(400, result.error || "Failed to delete queue");
    }

    logAudit({
      action: "queue.delete",
      actorUserId: user.userId || "",
      actorEmail: user.email,
      tenantId,
      resourceType: "queue",
      resourceId: queueId,
      details: { queueName: queue.name },
    });

    return NextResponse.json({
      ok: true,
      data: { deleted: true },
    });
  } catch (error) {
    return jsonError(error);
  }
}
