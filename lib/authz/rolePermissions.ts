import "server-only";

import type { RoleKey } from "./roles";
import {
  TENANT_MANAGE,
  TENANT_ENTITLEMENTS_UPDATE,
  TENANT_COSTS_READ,
  USER_MANAGE,
  USER_CREATE,
  USER_READ,
  GROUP_MANAGE,
  QUEUE_MANAGE,
  PROPOSAL_CREATE,
  PROPOSAL_READ,
  PROPOSAL_ASSIGN,
  FUND_MANDATE_MANAGE,
  UPLOAD_CREATE,
  REPORT_GENERATE,
  LLM_USE,
  type Permission,
} from "./permissions";

// ─────────────────────────────────────────────────────────────────────────────
// Role → Permissions Mapping
// ─────────────────────────────────────────────────────────────────────────────

export const ROLE_PERMISSIONS: Record<RoleKey, readonly Permission[]> = {
  // SaaS Admin: full platform access
  saas_admin: [
    TENANT_MANAGE,
    TENANT_ENTITLEMENTS_UPDATE,
    TENANT_COSTS_READ,
    USER_MANAGE,
    USER_CREATE,
    USER_READ,
    GROUP_MANAGE,
    QUEUE_MANAGE,
    PROPOSAL_CREATE,
    PROPOSAL_READ,
    PROPOSAL_ASSIGN,
    FUND_MANDATE_MANAGE,
    UPLOAD_CREATE,
    REPORT_GENERATE,
    LLM_USE,
  ],

  // Tenant Admin: tenant-scoped management
  tenant_admin: [
    TENANT_COSTS_READ,
    USER_MANAGE,
    USER_CREATE,
    USER_READ,
    GROUP_MANAGE,
    QUEUE_MANAGE,
    PROPOSAL_CREATE,
    PROPOSAL_READ,
    PROPOSAL_ASSIGN,
    FUND_MANDATE_MANAGE,
    UPLOAD_CREATE,
    REPORT_GENERATE,
    LLM_USE,
  ],

  // Fund Manager: IC dashboard + decision tools (no config/audit)
  fund_manager: [
    PROPOSAL_READ,
    PROPOSAL_ASSIGN,
    QUEUE_MANAGE,
    UPLOAD_CREATE,
    REPORT_GENERATE,
    LLM_USE,
  ],

  // Assessor (Analyst): proposal workspace
  assessor: [
    PROPOSAL_READ,
    UPLOAD_CREATE,
    REPORT_GENERATE,
    LLM_USE,
  ],

  // Viewer: read-only
  viewer: [
    PROPOSAL_READ,
    REPORT_GENERATE,
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function getPermissionsForRole(role: RoleKey): readonly Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

export function roleHasPermission(role: RoleKey, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
