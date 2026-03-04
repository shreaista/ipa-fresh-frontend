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

    // requireRole saas_admin
    if (ctx.role !== "saas_admin") {
      throw new HttpError(403, "Forbidden");
    }

    // requirePermission tenants:update
    if (!ctx.permissions.includes("tenants:update")) {
      throw new HttpError(403, "Forbidden");
    }

    const { id } = await context.params;

    let body: { name?: string; status?: string };
    try {
      body = await request.json();
    } catch {
      throw new HttpError(400, "Invalid JSON body");
    }

    // Audit log
    await logAdminAction(ctx, "tenant.update", "tenant", id, {
      updates: body,
    });

    return jsonSuccess({
      tenant: {
        id,
        name: body.name || "Updated Tenant",
        status: body.status || "active",
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
