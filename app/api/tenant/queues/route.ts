import { NextRequest, NextResponse } from "next/server";
import {
  requireSession,
  requireUserRole,
  requireTenant,
  jsonError,
  AuthzHttpError,
} from "@/lib/authz";
import { listQueuesWithMemberCountForTenant, createQueue } from "@/lib/mock/queues";
import { logAudit } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const user = await requireSession();
    requireUserRole(user, ["tenant_admin", "saas_admin"]);
    const tenantId = requireTenant(user);

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("includeInactive") === "true";

    const queues = listQueuesWithMemberCountForTenant(tenantId, includeInactive);

    return NextResponse.json({
      ok: true,
      data: {
        queues: queues.map((q) => ({
          id: q.id,
          name: q.name,
          description: q.description,
          isActive: q.isActive,
          memberCount: q.memberCount,
          createdAt: q.createdAt,
        })),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

interface CreateQueueBody {
  name?: string;
  description?: string;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSession();
    requireUserRole(user, ["tenant_admin", "saas_admin"]);
    const tenantId = requireTenant(user);

    let body: CreateQueueBody;
    try {
      body = await request.json();
    } catch {
      throw new AuthzHttpError(400, "Invalid JSON body");
    }

    const { name, description } = body;
    if (!name || typeof name !== "string") {
      throw new AuthzHttpError(400, "Queue name is required");
    }

    const result = createQueue({ tenantId, name, description });

    if (!result.ok) {
      throw new AuthzHttpError(400, result.error || "Failed to create queue");
    }

    logAudit({
      action: "queue.create",
      actorUserId: user.userId || "",
      actorEmail: user.email,
      tenantId,
      resourceType: "queue",
      resourceId: result.data!.id,
      details: { queueName: name, description },
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
          memberCount: 0,
        },
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
