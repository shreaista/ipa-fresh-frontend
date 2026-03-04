import { NextRequest } from "next/server";
import {
  getAuthzOrThrow,
  jsonError,
  jsonSuccess,
  HttpError,
  logAdminAction,
} from "@/lib/rbac";

// Mock tenant store
const mockTenants = [
  { id: "tenant-001", name: "Acme Foundation", status: "active", createdAt: "2024-01-15" },
  { id: "tenant-002", name: "Beta Grants Inc", status: "active", createdAt: "2024-02-20" },
  { id: "tenant-003", name: "Community Trust", status: "suspended", createdAt: "2024-03-10" },
];

export async function GET() {
  try {
    const ctx = await getAuthzOrThrow();

    // requireRole saas_admin
    if (ctx.role !== "saas_admin") {
      throw new HttpError(403, "Forbidden");
    }

    // requirePermission tenants:read
    if (!ctx.permissions.includes("tenants:read")) {
      throw new HttpError(403, "Forbidden");
    }

    return jsonSuccess({ tenants: mockTenants });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthzOrThrow();

    // requireRole saas_admin
    if (ctx.role !== "saas_admin") {
      throw new HttpError(403, "Forbidden");
    }

    // requirePermission tenants:create
    if (!ctx.permissions.includes("tenants:create")) {
      throw new HttpError(403, "Forbidden");
    }

    let body: { name: string };
    try {
      body = await request.json();
    } catch {
      throw new HttpError(400, "Invalid JSON body");
    }

    if (!body.name || typeof body.name !== "string") {
      throw new HttpError(422, "Validation error: name is required");
    }

    const newTenant = {
      id: `tenant-${Date.now()}`,
      name: body.name,
      status: "active",
      createdAt: new Date().toISOString().split("T")[0],
    };

    // Audit log
    await logAdminAction(ctx, "tenant.create", "tenant", newTenant.id, {
      name: newTenant.name,
    });

    return jsonSuccess({ tenant: newTenant }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
