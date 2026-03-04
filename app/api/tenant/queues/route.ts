import { NextResponse } from "next/server";
import {
  requireSession,
  requireUserRole,
  requireTenant,
  jsonError,
} from "@/lib/authz";
import { listQueuesForTenant } from "@/lib/mock/proposalsStore";

export async function GET() {
  try {
    const user = await requireSession();
    requireUserRole(user, ["tenant_admin", "saas_admin"]);
    const tenantId = requireTenant(user);

    const queues = listQueuesForTenant(tenantId);

    return NextResponse.json({
      ok: true,
      data: {
        queues: queues.map((q) => ({
          id: q.id,
          name: q.name,
          description: q.description,
        })),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
