import { NextRequest } from "next/server";
import {
  getAuthzOrThrow,
  jsonError,
  jsonSuccess,
  HttpError,
  logAdminAction,
} from "@/lib/rbac";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const ctx = await getAuthzOrThrow();

    // requireRole tenant_admin
    if (ctx.role !== "tenant_admin" && ctx.role !== "saas_admin") {
      throw new HttpError(403, "Forbidden");
    }

    // requirePermission users:update
    if (!ctx.permissions.includes("users:update")) {
      throw new HttpError(403, "Forbidden");
    }

    // Require tenant context
    if (!ctx.tenantId) {
      throw new HttpError(400, "Tenant context required");
    }

    const { id } = await context.params;

    let body: { name?: string; role?: string };
    try {
      body = await request.json();
    } catch {
      throw new HttpError(400, "Invalid JSON body");
    }

    // Prevent role escalation to saas_admin
    if (body.role === "saas_admin") {
      throw new HttpError(403, "Cannot assign saas_admin role via this endpoint");
    }

    // Audit log
    await logAdminAction(ctx, "user.update", "user", id, {
      updates: body,
    });

    return jsonSuccess({
      user: {
        id,
        name: body.name || "Updated User",
        role: body.role || "assessor",
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
