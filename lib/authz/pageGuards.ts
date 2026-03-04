import "server-only";

import { redirect } from "next/navigation";
import { getSessionSafe } from "@/lib/session";
import type { RoleKey } from "./roles";
import { ROLE_PERMISSIONS } from "./rolePermissions";
import type { Permission } from "./permissions";
import {
  type PermissionKey,
  roleHasPermission as rbacRoleHasPermission,
} from "@/lib/rbac/permissions";

// ─────────────────────────────────────────────────────────────────────────────
// Page Guard Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthenticatedUser {
  userId: string;
  email: string;
  name: string;
  role: RoleKey;
  tenantId?: string;
}

export interface TenantContext {
  user: AuthenticatedUser;
  tenantId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// requireAuth
// ─────────────────────────────────────────────────────────────────────────────

export async function requireAuth(): Promise<AuthenticatedUser> {
  const { user } = await getSessionSafe();

  if (!user) {
    redirect("/login");
  }

  return {
    userId: user.userId || "",
    email: user.email || "",
    name: user.name || "",
    role: user.role as RoleKey,
    tenantId: user.tenantId,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// requireRole
// ─────────────────────────────────────────────────────────────────────────────

export async function requireRole(
  allowedRoles: Array<"saas_admin" | "tenant_admin" | "assessor">
): Promise<AuthenticatedUser> {
  const user = await requireAuth();

  if (!allowedRoles.includes(user.role)) {
    redirect("/dashboard");
  }

  return user;
}

// ─────────────────────────────────────────────────────────────────────────────
// requireTenantContext
// ─────────────────────────────────────────────────────────────────────────────

export async function requireTenantContext(): Promise<TenantContext> {
  const user = await requireAuth();

  if (user.role === "saas_admin") {
    if (!user.tenantId) {
      redirect("/dashboard/tenants");
    }
    return { user, tenantId: user.tenantId };
  }

  if (!user.tenantId) {
    redirect("/login");
  }

  return { user, tenantId: user.tenantId };
}

// ─────────────────────────────────────────────────────────────────────────────
// requireRoleWithTenantContext
// ─────────────────────────────────────────────────────────────────────────────

export async function requireRoleWithTenantContext(
  allowedRoles: Array<"saas_admin" | "tenant_admin" | "assessor">
): Promise<TenantContext> {
  const user = await requireRole(allowedRoles);

  if (user.role === "saas_admin") {
    if (!user.tenantId) {
      redirect("/dashboard/tenants");
    }
    return { user, tenantId: user.tenantId };
  }

  if (!user.tenantId) {
    redirect("/login");
  }

  return { user, tenantId: user.tenantId };
}

// ─────────────────────────────────────────────────────────────────────────────
// requirePermission
// ─────────────────────────────────────────────────────────────────────────────

export async function requirePermission(
  permission: Permission
): Promise<AuthenticatedUser> {
  const user = await requireAuth();

  const permissions = ROLE_PERMISSIONS[user.role] ?? [];
  if (!permissions.includes(permission)) {
    redirect("/dashboard");
  }

  return user;
}

// ─────────────────────────────────────────────────────────────────────────────
// requireRoleOrPermission
// ─────────────────────────────────────────────────────────────────────────────

export async function requireRoleOrPermission(
  allowedRoles: Array<"saas_admin" | "tenant_admin" | "assessor">,
  permission: Permission
): Promise<AuthenticatedUser> {
  const user = await requireAuth();

  if (allowedRoles.includes(user.role)) {
    return user;
  }

  const permissions = ROLE_PERMISSIONS[user.role] ?? [];
  if (permissions.includes(permission)) {
    return user;
  }

  redirect("/dashboard");
}

// ─────────────────────────────────────────────────────────────────────────────
// requirePermissionWithTenantContext
// ─────────────────────────────────────────────────────────────────────────────

export async function requirePermissionWithTenantContext(
  permission: Permission
): Promise<TenantContext> {
  const user = await requirePermission(permission);

  if (user.role === "saas_admin") {
    if (!user.tenantId) {
      redirect("/dashboard/tenants");
    }
    return { user, tenantId: user.tenantId };
  }

  if (!user.tenantId) {
    redirect("/login");
  }

  return { user, tenantId: user.tenantId };
}

// ─────────────────────────────────────────────────────────────────────────────
// RBAC Permission Guards (using lib/rbac/permissions)
// ─────────────────────────────────────────────────────────────────────────────

export interface ForbiddenResult {
  forbidden: true;
  message: string;
}

export async function requireRBACPermission(
  permission: PermissionKey
): Promise<AuthenticatedUser | ForbiddenResult> {
  const user = await requireAuth();

  if (!rbacRoleHasPermission(user.role, permission)) {
    return { forbidden: true, message: `Missing permission: ${permission}` };
  }

  return user;
}

export async function requireRBACPermissionStrict(
  permission: PermissionKey
): Promise<AuthenticatedUser> {
  const user = await requireAuth();

  if (!rbacRoleHasPermission(user.role, permission)) {
    redirect("/dashboard");
  }

  return user;
}

export async function requireRBACPermissionWithTenantContext(
  permission: PermissionKey
): Promise<TenantContext | ForbiddenResult> {
  const user = await requireAuth();

  if (!rbacRoleHasPermission(user.role, permission)) {
    return { forbidden: true, message: `Missing permission: ${permission}` };
  }

  if (user.role === "saas_admin") {
    if (!user.tenantId) {
      redirect("/dashboard/tenants");
    }
    return { user, tenantId: user.tenantId };
  }

  if (!user.tenantId) {
    redirect("/login");
  }

  return { user, tenantId: user.tenantId };
}

export function isForbidden(
  result: AuthenticatedUser | TenantContext | ForbiddenResult
): result is ForbiddenResult {
  return "forbidden" in result && result.forbidden === true;
}
