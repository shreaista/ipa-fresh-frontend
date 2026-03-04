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

    // requirePermission subscriptions:update (maps to tenant:entitlements:update)
    if (!ctx.permissions.includes("subscriptions:update")) {
      throw new HttpError(403, "Forbidden");
    }

    const { id } = await context.params;

    let body: {
      maxAssessors?: number;
      maxUploadsPerAssessment?: number;
      maxReportsPerMonth?: number;
      plan?: string;
    };
    try {
      body = await request.json();
    } catch {
      throw new HttpError(400, "Invalid JSON body");
    }

    // Audit log
    await logAdminAction(ctx, "subscription.update", "tenant", id, {
      entitlementUpdates: body,
    });

    return jsonSuccess({
      tenantId: id,
      entitlements: {
        maxAssessors: body.maxAssessors ?? 10,
        maxUploadsPerAssessment: body.maxUploadsPerAssessment ?? 5,
        maxReportsPerMonth: body.maxReportsPerMonth ?? 50,
        plan: body.plan ?? "professional",
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
