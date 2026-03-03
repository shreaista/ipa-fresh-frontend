import "server-only";

import type {
  Role,
  Permission,
  AuthContext,
  Resource,
  ApiError,
  ApiErrorCode,
} from "./types";
import { ROLE_PERMISSIONS, API_ERROR_STATUS } from "./types";
import { getSessionSafe } from "../session";

// ─────────────────────────────────────────────────────────────────────────────
// Auth Context Builder
// ─────────────────────────────────────────────────────────────────────────────

export async function getAuthContext(): Promise<AuthContext | null> {
  const { user } = await getSessionSafe();

  if (!user) {
    return null;
  }

  return {
    userId: user.userId,
    email: user.email,
    role: user.role,
    name: user.name,
    tenantId: user.tenantId ?? null,
    permissions: ROLE_PERMISSIONS[user.role] || [],
  };
}

export async function requireAuth(): Promise<AuthContext> {
  const ctx = await getAuthContext();

  if (!ctx) {
    throw createAuthError("UNAUTHENTICATED", "Authentication required");
  }

  return ctx;
}

// ─────────────────────────────────────────────────────────────────────────────
// Permission Checks
// ─────────────────────────────────────────────────────────────────────────────

export function hasPermission(ctx: AuthContext, permission: Permission): boolean {
  return ctx.permissions.includes(permission);
}

export function hasAnyPermission(ctx: AuthContext, permissions: Permission[]): boolean {
  return permissions.some((p) => ctx.permissions.includes(p));
}

export function hasAllPermissions(ctx: AuthContext, permissions: Permission[]): boolean {
  return permissions.every((p) => ctx.permissions.includes(p));
}

export function requirePermission(ctx: AuthContext, permission: Permission): void {
  if (!hasPermission(ctx, permission)) {
    throw createAuthError(
      "UNAUTHORIZED",
      `Missing required permission: ${permission}`
    );
  }
}

export function requireAnyPermission(ctx: AuthContext, permissions: Permission[]): void {
  if (!hasAnyPermission(ctx, permissions)) {
    throw createAuthError(
      "UNAUTHORIZED",
      `Missing one of required permissions: ${permissions.join(", ")}`
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tenant Isolation
// ─────────────────────────────────────────────────────────────────────────────

export function isSaaSAdmin(ctx: AuthContext): boolean {
  return ctx.role === "saas_admin";
}

export function canAccessTenant(ctx: AuthContext, tenantId: string): boolean {
  if (isSaaSAdmin(ctx)) {
    return true;
  }
  return ctx.tenantId === tenantId;
}

export function requireTenantAccess(ctx: AuthContext, tenantId: string): void {
  if (!canAccessTenant(ctx, tenantId)) {
    throw createAuthError(
      "FORBIDDEN",
      "Access denied: tenant isolation violation"
    );
  }
}

export function getRequiredTenantId(ctx: AuthContext): string {
  if (isSaaSAdmin(ctx)) {
    throw createAuthError(
      "VALIDATION_ERROR",
      "SaaS admin must specify tenant context"
    );
  }
  if (!ctx.tenantId) {
    throw createAuthError(
      "VALIDATION_ERROR",
      "User is not associated with a tenant"
    );
  }
  return ctx.tenantId;
}

// ─────────────────────────────────────────────────────────────────────────────
// Resource Access Checks
// ─────────────────────────────────────────────────────────────────────────────

export function canAccessResource(ctx: AuthContext, resource: Resource): boolean {
  if (isSaaSAdmin(ctx)) {
    return true;
  }

  if (resource.tenantId && !canAccessTenant(ctx, resource.tenantId)) {
    return false;
  }

  if (ctx.role === "assessor") {
    if (resource.type === "proposal" || resource.type === "assessment") {
      const isAssigned = resource.assignedUserIds?.includes(ctx.userId);
      const isOwner = resource.ownerId === ctx.userId;
      return isAssigned || isOwner;
    }
    if (resource.type === "report") {
      return resource.ownerId === ctx.userId;
    }
  }

  return true;
}

export function requireResourceAccess(ctx: AuthContext, resource: Resource): void {
  if (!canAccessResource(ctx, resource)) {
    throw createAuthError(
      "FORBIDDEN",
      `Access denied to ${resource.type}:${resource.id}`
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Role-based Checks
// ─────────────────────────────────────────────────────────────────────────────

export function requireRole(ctx: AuthContext, ...allowedRoles: Role[]): void {
  if (!allowedRoles.includes(ctx.role)) {
    throw createAuthError(
      "UNAUTHORIZED",
      `Role ${ctx.role} is not authorized for this action`
    );
  }
}

export function requireSaaSAdmin(ctx: AuthContext): void {
  requireRole(ctx, "saas_admin");
}

export function requireTenantAdmin(ctx: AuthContext): void {
  requireRole(ctx, "tenant_admin");
}

export function requireTenantAdminOrHigher(ctx: AuthContext): void {
  requireRole(ctx, "saas_admin", "tenant_admin");
}

// ─────────────────────────────────────────────────────────────────────────────
// Error Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function createAuthError(
  code: ApiErrorCode,
  message: string,
  details?: Record<string, unknown>
): ApiError & Error {
  const error = new Error(message) as ApiError & Error;
  error.code = code;
  error.message = message;
  error.details = details;
  return error;
}

export function getErrorStatus(error: ApiError): number {
  return API_ERROR_STATUS[error.code] || 500;
}

export function isAuthError(error: unknown): error is ApiError & Error {
  return (
    error instanceof Error &&
    "code" in error &&
    typeof (error as ApiError).code === "string"
  );
}
