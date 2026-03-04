import { NextRequest, NextResponse } from "next/server";
import {
  requireSession,
  requireUserRole,
  requireTenant,
  jsonError,
  requireRBACPermission,
  RBAC_PERMISSIONS,
  AuthzHttpError,
} from "@/lib/authz";
import { logAdminAction } from "@/lib/rbac";
import { assertCanCreateAssessor, isEntitlementError } from "@/lib/entitlements";

const mockUsers = [
  { id: "user-001", email: "admin@acme.org", name: "Admin User", role: "tenant_admin", tenantId: "tenant-001" },
  { id: "user-002", email: "assessor1@acme.org", name: "Assessor One", role: "assessor", tenantId: "tenant-001" },
  { id: "user-003", email: "assessor2@acme.org", name: "Assessor Two", role: "assessor", tenantId: "tenant-001" },
];

export async function GET() {
  try {
    const session = await requireSession();
    requireUserRole(session, ["tenant_admin", "saas_admin"]);
    requireRBACPermission(session, RBAC_PERMISSIONS.USER_READ);
    const tenantId = requireTenant(session);

    const users = mockUsers.filter((u) => u.tenantId === tenantId);

    return NextResponse.json({ ok: true, data: { users } });
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
    const session = await requireSession();
    requireUserRole(session, ["tenant_admin", "saas_admin"]);
    requireRBACPermission(session, RBAC_PERMISSIONS.USER_CREATE);
    const tenantId = requireTenant(session);

    let body: CreateUserBody;
    try {
      body = await request.json();
    } catch {
      throw new AuthzHttpError(400, "Invalid JSON body");
    }

    if (!body.email || typeof body.email !== "string") {
      throw new AuthzHttpError(422, "Validation error: email is required");
    }

    if (!body.role || !["tenant_admin", "assessor"].includes(body.role)) {
      throw new AuthzHttpError(422, "Validation error: role must be 'tenant_admin' or 'assessor'");
    }

    if ((body.role as string) === "saas_admin") {
      throw new AuthzHttpError(403, "Cannot create saas_admin via this endpoint");
    }

    if (body.role === "assessor") {
      const currentAssessorCount = 0;
      assertCanCreateAssessor(
        { tenantId, role: session.role } as Parameters<typeof assertCanCreateAssessor>[0],
        currentAssessorCount
      );
    }

    const newUser = {
      id: `user-${Date.now()}`,
      email: body.email,
      name: body.name || body.email.split("@")[0],
      role: body.role,
      tenantId,
    };

    await logAdminAction(
      { userId: session.userId || "", email: session.email || "", role: session.role, tenantId, permissions: [], name: session.name || "" },
      "user.create",
      "user",
      newUser.id,
      { email: newUser.email, role: newUser.role }
    );

    return NextResponse.json({ ok: true, data: { user: newUser, created: true } }, { status: 201 });
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
