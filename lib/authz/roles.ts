import "server-only";

// ─────────────────────────────────────────────────────────────────────────────
// Role Key Type
// ─────────────────────────────────────────────────────────────────────────────

export type RoleKey = "saas_admin" | "tenant_admin" | "assessor";

// ─────────────────────────────────────────────────────────────────────────────
// Role Constants
// ─────────────────────────────────────────────────────────────────────────────

export const ROLES = {
  SAAS_ADMIN: "saas_admin" as const,
  TENANT_ADMIN: "tenant_admin" as const,
  ASSESSOR: "assessor" as const,
};

// ─────────────────────────────────────────────────────────────────────────────
// Role Metadata
// ─────────────────────────────────────────────────────────────────────────────

export interface RoleMeta {
  key: RoleKey;
  label: string;
  description: string;
  isTenantScoped: boolean;
}

export const ROLE_META: Record<RoleKey, RoleMeta> = {
  saas_admin: {
    key: "saas_admin",
    label: "SaaS Admin",
    description: "Global administrator with full platform access",
    isTenantScoped: false,
  },
  tenant_admin: {
    key: "tenant_admin",
    label: "Tenant Admin",
    description: "Organization administrator with tenant-scoped access",
    isTenantScoped: true,
  },
  assessor: {
    key: "assessor",
    label: "Assessor",
    description: "Evaluator with access to assigned proposals only",
    isTenantScoped: true,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function isValidRole(role: unknown): role is RoleKey {
  return role === "saas_admin" || role === "tenant_admin" || role === "assessor";
}

export function isTenantScopedRole(role: RoleKey): boolean {
  return ROLE_META[role].isTenantScoped;
}
