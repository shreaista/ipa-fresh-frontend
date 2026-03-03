import "server-only";

import type { RoleKey } from "./roles";
import { ROLES } from "./roles";
import type { Permission } from "./permissions";
import type { AuthorizationContext } from "./context";
import { ForbiddenError } from "./errors";

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
