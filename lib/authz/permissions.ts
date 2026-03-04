import "server-only";

// ─────────────────────────────────────────────────────────────────────────────
// Permission String Constants
// ─────────────────────────────────────────────────────────────────────────────

export const TENANT_MANAGE = "tenant:manage";
export const TENANT_ENTITLEMENTS_UPDATE = "tenant:entitlements:update";
export const TENANT_COSTS_READ = "tenant:costs:read";

export const USER_MANAGE = "user:manage";
export const USER_CREATE = "user:create";
export const USER_READ = "user:read";
export const GROUP_MANAGE = "group:manage";
export const QUEUE_MANAGE = "queue:manage";

export const PROPOSAL_CREATE = "proposal:create";
export const PROPOSAL_READ = "proposal:read";
export const PROPOSAL_ASSIGN = "proposal:assign";

export const FUND_MANDATE_MANAGE = "fund_mandate:manage";

export const UPLOAD_CREATE = "upload:create";
export const REPORT_GENERATE = "report:generate";
export const LLM_USE = "llm:use";

// ─────────────────────────────────────────────────────────────────────────────
// Permissions Object (for grouped access)
// ─────────────────────────────────────────────────────────────────────────────

export const PERMISSIONS = {
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
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ─────────────────────────────────────────────────────────────────────────────
// All Permissions Array
// ─────────────────────────────────────────────────────────────────────────────

export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);
