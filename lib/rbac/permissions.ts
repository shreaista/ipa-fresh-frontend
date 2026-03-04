import "server-only";

// ─────────────────────────────────────────────────────────────────────────────
// Permission Keys (Central Definition)
// ─────────────────────────────────────────────────────────────────────────────

export const PERMISSIONS = {
  // Tenant management
  TENANT_READ: "tenant:read",
  TENANT_UPDATE: "tenant:update",
  TENANT_ENTITLEMENTS_UPDATE: "tenant:entitlements:update",

  // User management
  USER_CREATE: "user:create",
  USER_READ: "user:read",
  USER_UPDATE: "user:update",

  // Proposal management
  PROPOSAL_READ: "proposal:read",
  PROPOSAL_CREATE: "proposal:create",
  PROPOSAL_ASSIGN: "proposal:assign",

  // Fund mandate management
  FUND_MANDATE_UPLOAD: "fund:mandate:upload",
  FUND_MANDATE_READ: "fund:mandate:read",

  // Costs
  COSTS_READ: "costs:read",

  // Reports
  REPORT_GENERATE: "report:generate",

  // Uploads
  UPLOAD_CREATE: "upload:create",

  // LLM
  LLM_USE: "llm:use",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ─────────────────────────────────────────────────────────────────────────────
// All Permissions Array
// ─────────────────────────────────────────────────────────────────────────────

export const ALL_PERMISSIONS: PermissionKey[] = Object.values(PERMISSIONS);

// ─────────────────────────────────────────────────────────────────────────────
// Role → Permissions Mapping
// ─────────────────────────────────────────────────────────────────────────────

export type RoleKey = "saas_admin" | "tenant_admin" | "assessor";

export const ROLE_PERMISSION_MAP: Record<RoleKey, readonly PermissionKey[]> = {
  saas_admin: [
    PERMISSIONS.TENANT_READ,
    PERMISSIONS.TENANT_UPDATE,
    PERMISSIONS.TENANT_ENTITLEMENTS_UPDATE,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.PROPOSAL_READ,
    PERMISSIONS.PROPOSAL_CREATE,
    PERMISSIONS.PROPOSAL_ASSIGN,
    PERMISSIONS.FUND_MANDATE_UPLOAD,
    PERMISSIONS.FUND_MANDATE_READ,
    PERMISSIONS.COSTS_READ,
    PERMISSIONS.REPORT_GENERATE,
    PERMISSIONS.UPLOAD_CREATE,
    PERMISSIONS.LLM_USE,
  ],

  tenant_admin: [
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.PROPOSAL_READ,
    PERMISSIONS.PROPOSAL_CREATE,
    PERMISSIONS.PROPOSAL_ASSIGN,
    PERMISSIONS.FUND_MANDATE_UPLOAD,
    PERMISSIONS.FUND_MANDATE_READ,
    PERMISSIONS.COSTS_READ,
    PERMISSIONS.REPORT_GENERATE,
    PERMISSIONS.UPLOAD_CREATE,
    PERMISSIONS.LLM_USE,
  ],

  assessor: [
    PERMISSIONS.PROPOSAL_READ,
    PERMISSIONS.UPLOAD_CREATE,
    PERMISSIONS.REPORT_GENERATE,
    PERMISSIONS.LLM_USE,
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

export function getPermissionsForRole(role: RoleKey): readonly PermissionKey[] {
  return ROLE_PERMISSION_MAP[role] ?? [];
}

export function roleHasPermission(role: RoleKey, permission: PermissionKey): boolean {
  return ROLE_PERMISSION_MAP[role]?.includes(permission) ?? false;
}

export function hasPermission(
  userPermissions: readonly string[],
  permission: PermissionKey
): boolean {
  return userPermissions.includes(permission);
}

export function hasAnyPermission(
  userPermissions: readonly string[],
  permissions: PermissionKey[]
): boolean {
  return permissions.some((p) => userPermissions.includes(p));
}

export function hasAllPermissions(
  userPermissions: readonly string[],
  permissions: PermissionKey[]
): boolean {
  return permissions.every((p) => userPermissions.includes(p));
}
