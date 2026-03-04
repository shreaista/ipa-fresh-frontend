import "server-only";

import { NextResponse } from "next/server";
import type { RoleKey } from "./roles";
import { ROLES } from "./roles";
import type { Permission } from "./permissions";
import type { AuthorizationContext } from "./context";
import { ForbiddenError } from "./errors";
import { getSessionSafe } from "@/lib/session";
import {
  PERMISSIONS as RBAC_PERMISSIONS,
  type PermissionKey,
  roleHasPermission as rbacRoleHasPermission,
} from "@/lib/rbac/permissions";

// ─────────────────────────────────────────────────────────────────────────────
// HTTP Error Class for API Routes
// ─────────────────────────────────────────────────────────────────────────────

export class AuthzHttpError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "AuthzHttpError";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Session & User Guards (for API routes)
// ─────────────────────────────────────────────────────────────────────────────

export interface SessionUser {
  userId?: string;
  email?: string;
  name?: string;
  role: RoleKey;
  tenantId?: string;
}

export async function requireSession(): Promise<SessionUser> {
  const { user } = await getSessionSafe();
  if (!user) {
    throw new AuthzHttpError(401, "Authentication required");
  }
  return user as SessionUser;
}

export function requireUserRole(user: SessionUser, allowedRoles: RoleKey[]): void {
  if (!allowedRoles.includes(user.role)) {
    throw new AuthzHttpError(403, "Forbidden");
  }
}

export function requireTenant(user: SessionUser): string {
  if (!user.tenantId) {
    throw new AuthzHttpError(400, "Tenant context required");
  }
  return user.tenantId;
}

// ─────────────────────────────────────────────────────────────────────────────
// JSON Error Response Helper
// ─────────────────────────────────────────────────────────────────────────────

export function jsonError(err: unknown): NextResponse {
  if (err instanceof AuthzHttpError) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: err.status }
    );
  }
  console.error("[jsonError]", err);
  return NextResponse.json(
    { ok: false, error: "Internal server error" },
    { status: 500 }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Role Guards
// ─────────────────────────────────────────────────────────────────────────────

export function requireRole(ctx: AuthorizationContext, ...allowedRoles: RoleKey[]): void {
  if (!allowedRoles.includes(ctx.role)) {
    throw new ForbiddenError(
      `Role '${ctx.role}' is not authorized. Required: ${allowedRoles.join(" or ")}`,
      "Access denied"
    );
  }
}

export function requireSaaSAdmin(ctx: AuthorizationContext): void {
  requireRole(ctx, ROLES.SAAS_ADMIN);
}

export function requireTenantAdmin(ctx: AuthorizationContext): void {
  requireRole(ctx, ROLES.TENANT_ADMIN);
}

export function requireTenantAdminOrHigher(ctx: AuthorizationContext): void {
  requireRole(ctx, ROLES.SAAS_ADMIN, ROLES.TENANT_ADMIN);
}

// ─────────────────────────────────────────────────────────────────────────────
// Permission Guards
// ─────────────────────────────────────────────────────────────────────────────

export function hasPermission(ctx: AuthorizationContext, permission: Permission): boolean {
  return ctx.permissions.includes(permission);
}

export function requirePermission(ctx: AuthorizationContext, permission: Permission): void {
  if (!hasPermission(ctx, permission)) {
    throw new ForbiddenError(
      `Missing required permission: ${permission}`,
      "Access denied"
    );
  }
}

export function requireAnyPermission(ctx: AuthorizationContext, permissions: Permission[]): void {
  const hasAny = permissions.some((p) => ctx.permissions.includes(p));
  if (!hasAny) {
    throw new ForbiddenError(
      `Missing one of required permissions: ${permissions.join(", ")}`,
      "Access denied"
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tenant Access Guards
// ─────────────────────────────────────────────────────────────────────────────

export function canAccessTenant(ctx: AuthorizationContext, tenantId: string): boolean {
  if (ctx.role === ROLES.SAAS_ADMIN) {
    return true;
  }
  return ctx.tenantId === tenantId;
}

export function requireTenantAccess(ctx: AuthorizationContext, tenantId: string): void {
  if (!canAccessTenant(ctx, tenantId)) {
    throw new ForbiddenError(
      `Tenant access denied: user tenant '${ctx.tenantId}' cannot access '${tenantId}'`,
      "Access denied"
    );
  }
}

export function requireTenantContext(ctx: AuthorizationContext): string {
  if (!ctx.tenantId) {
    throw new ForbiddenError(
      "Tenant context required for this operation",
      "Access denied"
    );
  }
  return ctx.tenantId;
}

// ─────────────────────────────────────────────────────────────────────────────
// Combined Guards
// ─────────────────────────────────────────────────────────────────────────────

export function requirePermissionInTenant(
  ctx: AuthorizationContext,
  permission: Permission,
  tenantId: string
): void {
  requirePermission(ctx, permission);
  requireTenantAccess(ctx, tenantId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Proposal Access Guards
// ─────────────────────────────────────────────────────────────────────────────

export interface Proposal {
  id: string;
  tenantId: string;
  assignedAssessorId?: string;
  queueAssessorIds?: string[];
}

export function canAccessProposal(ctx: AuthorizationContext, proposal: Proposal): boolean {
  if (ctx.role === ROLES.SAAS_ADMIN) {
    return true;
  }

  if (ctx.tenantId !== proposal.tenantId) {
    return false;
  }

  if (ctx.role === ROLES.TENANT_ADMIN) {
    return true;
  }

  if (ctx.role === ROLES.ASSESSOR) {
    const userId = ctx.user.id;
    if (!userId) return false;

    if (proposal.assignedAssessorId === userId) {
      return true;
    }

    if (proposal.queueAssessorIds?.includes(userId)) {
      return true;
    }

    return false;
  }

  return false;
}

export function requireProposalAccess(ctx: AuthorizationContext, proposal: Proposal): void {
  if (!canAccessProposal(ctx, proposal)) {
    throw new ForbiddenError(
      `Access denied to proposal ${proposal.id}`,
      "Access denied"
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RBAC Permission Guards (using lib/rbac/permissions)
// ─────────────────────────────────────────────────────────────────────────────

export { RBAC_PERMISSIONS, type PermissionKey };

export function requireRBACPermission(
  session: SessionUser,
  permission: PermissionKey
): void {
  if (!rbacRoleHasPermission(session.role, permission)) {
    throw new AuthzHttpError(403, `Missing permission: ${permission}`);
  }
}

export function requireRBACPermissions(
  session: SessionUser,
  permissions: PermissionKey[]
): void {
  for (const permission of permissions) {
    if (!rbacRoleHasPermission(session.role, permission)) {
      throw new AuthzHttpError(403, `Missing permission: ${permission}`);
    }
  }
}

export function requireAnyRBACPermission(
  session: SessionUser,
  permissions: PermissionKey[]
): void {
  const hasAny = permissions.some((p) => rbacRoleHasPermission(session.role, p));
  if (!hasAny) {
    throw new AuthzHttpError(
      403,
      `Missing one of required permissions: ${permissions.join(", ")}`
    );
  }
}

export function requireTenantMatch(
  session: SessionUser,
  resourceTenantId: string
): void {
  if (session.role === ROLES.SAAS_ADMIN) {
    return;
  }
  if (session.tenantId !== resourceTenantId) {
    throw new AuthzHttpError(403, "Tenant access denied");
  }
}

export function hasRBACPermission(
  session: SessionUser,
  permission: PermissionKey
): boolean {
  return rbacRoleHasPermission(session.role, permission);
}
