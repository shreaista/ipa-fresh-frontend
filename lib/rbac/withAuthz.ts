import "server-only";

import type { Permission, AuthContext } from "./types";
import { ROLE_PERMISSIONS } from "./types";
import {
  HttpError,
  requireUser,
  requireRole as httpRequireRole,
  requirePermission as httpRequirePermission,
} from "./http";
import { getDemoEntitlements } from "@/lib/entitlements/demoEntitlements";
import type { Entitlements } from "@/lib/entitlements/types";

// ─────────────────────────────────────────────────────────────────────────────
// Full Authorization Context
// ─────────────────────────────────────────────────────────────────────────────

export interface FullAuthzContext extends AuthContext {
  entitlements: Entitlements | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// getAuthzOrThrow
// ─────────────────────────────────────────────────────────────────────────────

export async function getAuthzOrThrow(): Promise<FullAuthzContext> {
  const user = await requireUser();

  const permissions = ROLE_PERMISSIONS[user.role] || [];
  const entitlements = getDemoEntitlements(user.tenantId ?? null);

  return {
    userId: user.userId,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId ?? null,
    permissions,
    entitlements,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience Guards
// ─────────────────────────────────────────────────────────────────────────────

export async function requireAuthzWithRole(
  roles: Array<"saas_admin" | "tenant_admin" | "assessor">
): Promise<FullAuthzContext> {
  const user = await requireUser();
  httpRequireRole(user, roles);

  const permissions = ROLE_PERMISSIONS[user.role] || [];
  const entitlements = getDemoEntitlements(user.tenantId ?? null);

  return {
    userId: user.userId,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId ?? null,
    permissions,
    entitlements,
  };
}

export async function requireAuthzWithPermission(
  permission: Permission
): Promise<FullAuthzContext> {
  const ctx = await getAuthzOrThrow();
  httpRequirePermission(ctx.permissions, permission);
  return ctx;
}

export async function requireAuthzWithRoleAndPermission(
  roles: Array<"saas_admin" | "tenant_admin" | "assessor">,
  permission: Permission
): Promise<FullAuthzContext> {
  const user = await requireUser();
  httpRequireRole(user, roles);

  const permissions = ROLE_PERMISSIONS[user.role] || [];
  httpRequirePermission(permissions, permission);

  const entitlements = getDemoEntitlements(user.tenantId ?? null);

  return {
    userId: user.userId,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId ?? null,
    permissions,
    entitlements,
  };
}

export async function requireTenantAdmin(): Promise<FullAuthzContext> {
  return requireAuthzWithRole(["tenant_admin"]);
}

export async function requireSaaSAdmin(): Promise<FullAuthzContext> {
  return requireAuthzWithRole(["saas_admin"]);
}

// Re-export HttpError for convenience
export { HttpError };
