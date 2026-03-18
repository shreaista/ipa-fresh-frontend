import "server-only";

// ─────────────────────────────────────────────────────────────────────────────
// Role Key Type
// ─────────────────────────────────────────────────────────────────────────────

export type RoleKey = "saas_admin" | "tenant_admin" | "fund_manager" | "assessor" | "viewer";

// ─────────────────────────────────────────────────────────────────────────────
// Role Constants
// ─────────────────────────────────────────────────────────────────────────────

export const ROLES = {
  SAAS_ADMIN: "saas_admin" as const,
  TENANT_ADMIN: "tenant_admin" as const,
  FUND_MANAGER: "fund_manager" as const,
  ASSESSOR: "assessor" as const,
  VIEWER: "viewer" as const,
};

// ─────────────────────────────────────────────────────────────────────────────
// Role Metadata
// ─────────────────────────────────────────────────────────────────────────────

export interface RoleMeta {
  key: RoleKey;
  label: string;
  description: string;
  isTenantScoped: boolean;
  isReadOnly: boolean;
}

export const ROLE_META: Record<RoleKey, RoleMeta> = {
  saas_admin: {
    key: "saas_admin",
    label: "SaaS Admin",
    description: "Global administrator with full platform access",
    isTenantScoped: false,
    isReadOnly: false,
  },
  tenant_admin: {
    key: "tenant_admin",
    label: "Admin",
    description: "Full dashboard, audit, and configuration access",
    isTenantScoped: true,
    isReadOnly: false,
  },
  fund_manager: {
    key: "fund_manager",
    label: "Fund Manager",
    description: "IC dashboard and decision tools",
    isTenantScoped: true,
    isReadOnly: false,
  },
  assessor: {
    key: "assessor",
    label: "Analyst",
    description: "Proposal workspace and evaluation",
    isTenantScoped: true,
    isReadOnly: false,
  },
  viewer: {
    key: "viewer",
    label: "Viewer",
    description: "Read-only dashboards",
    isTenantScoped: true,
    isReadOnly: true,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function isValidRole(role: unknown): role is RoleKey {
  return ["saas_admin", "tenant_admin", "fund_manager", "assessor", "viewer"].includes(role as string);
}

export function isReadOnlyRole(role: RoleKey): boolean {
  return ROLE_META[role]?.isReadOnly ?? false;
}

export function isTenantScopedRole(role: RoleKey): boolean {
  return ROLE_META[role]?.isTenantScoped ?? true;
}
