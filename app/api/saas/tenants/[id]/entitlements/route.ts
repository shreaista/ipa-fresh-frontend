import { NextRequest } from "next/server";
import {
  getAuthzOrThrow,
  jsonError,
  jsonSuccess,
  HttpError,
  logAdminAction,
} from "@/lib/rbac";
import { updateTenantEntitlements, getTenantEntitlements } from "@/lib/entitlements/demoEntitlements";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const ctx = await getAuthzOrThrow();

    if (ctx.role !== "saas_admin") {
      throw new HttpError(403, "Forbidden");
    }

    if (!ctx.permissions.includes("subscriptions:update")) {
      throw new HttpError(403, "Forbidden");
    }

    const { id } = await context.params;

    let body: {
      maxAssessors?: number;
      maxUploadsPerAssessment?: number;
      maxReportsPerMonth?: number;
      plan?: string;
      fundMandatesEnabled?: boolean;
    };
    try {
      body = await request.json();
    } catch {
      throw new HttpError(400, "Invalid JSON body");
    }

    const currentEntitlements = getTenantEntitlements(id);

    const updatedEntitlements = updateTenantEntitlements(id, {
      maxAssessors: body.maxAssessors,
      maxUploadsPerAssessment: body.maxUploadsPerAssessment,
      maxReportsPerMonth: body.maxReportsPerMonth,
      fundMandatesEnabled: body.fundMandatesEnabled,
    });

    await logAdminAction(ctx, "subscription.update", "tenant", id, {
      entitlementUpdates: body,
      previousFundMandatesEnabled: currentEntitlements.fundMandatesEnabled,
    });

    return jsonSuccess({
      tenantId: id,
      entitlements: {
        ...updatedEntitlements,
        plan: body.plan ?? "professional",
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
