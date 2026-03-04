import { NextRequest, NextResponse } from "next/server";
import {
  getAuthzOrThrow,
  jsonError,
  jsonSuccess,
  HttpError,
  logAdminAction,
} from "@/lib/rbac";
import { assertCanCreateAssessor, isEntitlementError } from "@/lib/entitlements";

// Mock users store
const mockUsers = [
  { id: "user-001", email: "admin@acme.org", name: "Admin User", role: "tenant_admin", tenantId: "tenant-001" },
  { id: "user-002", email: "assessor1@acme.org", name: "Assessor One", role: "assessor", tenantId: "tenant-001" },
  { id: "user-003", email: "assessor2@acme.org", name: "Assessor Two", role: "assessor", tenantId: "tenant-001" },
];

export async function GET() {
  try {
    const ctx = await getAuthzOrThrow();

    // requireRole tenant_admin OR saas_admin
    if (ctx.role !== "tenant_admin" && ctx.role !== "saas_admin") {
      throw new HttpError(403, "Forbidden");
    }

    // requirePermission users:read
    if (!ctx.permissions.includes("users:read")) {
      throw new HttpError(403, "Forbidden");
    }

    // Filter by tenant for tenant_admin
    let users = mockUsers;
    if (ctx.role === "tenant_admin" && ctx.tenantId) {
      users = mockUsers.filter((u) => u.tenantId === ctx.tenantId);
    } else if (ctx.role === "saas_admin" && ctx.tenantId) {
      // SaaS admin viewing specific tenant
      users = mockUsers.filter((u) => u.tenantId === ctx.tenantId);
    }

    return jsonSuccess({ users });
  } catch (error) {
    return jsonError(error);
  }
}

type CreateUserRole = "tenant_admin" | "assessor";

interface CreateUserBody {
  email: string;
  name?: string;
  role: CreateUserRole;
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthzOrThrow();

    // requireRole tenant_admin OR saas_admin
    if (ctx.role !== "tenant_admin" && ctx.role !== "saas_admin") {
      throw new HttpError(403, "Forbidden");
    }

    // requirePermission users:create
    if (!ctx.permissions.includes("users:create")) {
      throw new HttpError(403, "Forbidden");
    }

    // Require tenant context
    if (!ctx.tenantId) {
      throw new HttpError(400, "Tenant context required");
    }

    let body: CreateUserBody;
    try {
      body = await request.json();
    } catch {
      throw new HttpError(400, "Invalid JSON body");
    }

    if (!body.email || typeof body.email !== "string") {
      throw new HttpError(422, "Validation error: email is required");
    }

    if (!body.role || !["tenant_admin", "assessor"].includes(body.role)) {
      throw new HttpError(422, "Validation error: role must be 'tenant_admin' or 'assessor'");
    }

    if ((body.role as string) === "saas_admin") {
      throw new HttpError(403, "Cannot create saas_admin via this endpoint");
    }

    if (body.role === "assessor") {
      // TODO: Replace with DB count later
      const currentAssessorCount = 0;
      assertCanCreateAssessor(
        { tenantId: ctx.tenantId, role: ctx.role } as Parameters<typeof assertCanCreateAssessor>[0],
        currentAssessorCount
      );
    }

    const newUser = {
      id: `user-${Date.now()}`,
      email: body.email,
      name: body.name || body.email.split("@")[0],
      role: body.role,
      tenantId: ctx.tenantId,
    };

    // Audit log
    await logAdminAction(ctx, "user.create", "user", newUser.id, {
      email: newUser.email,
      role: newUser.role,
    });

    return jsonSuccess({ user: newUser, created: true }, 201);
  } catch (error) {
    if (isEntitlementError(error)) {
      return NextResponse.json(
        { ok: false, error: error.safeMessage, details: error.details },
        { status: error.status }
      );
    }
    return jsonError(error);
  }
}
