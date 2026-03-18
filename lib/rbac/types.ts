import "server-only";

// ─────────────────────────────────────────────────────────────────────────────
// Core Role & Permission Types
// ─────────────────────────────────────────────────────────────────────────────

export type Role = "saas_admin" | "tenant_admin" | "fund_manager" | "assessor" | "viewer";

export type Permission =
  // Tenant management (SaaS Admin only)
  | "tenants:read"
  | "tenants:create"
  | "tenants:update"
  | "tenants:delete"
  // User management
  | "users:read"
  | "users:create"
  | "users:update"
  | "users:delete"
  | "users:invite"
  // Fund management (Tenant Admin)
  | "funds:read"
  | "funds:create"
  | "funds:update"
  | "funds:delete"
  // Proposal management
  | "proposals:read"
  | "proposals:read:own"
  | "proposals:read:assigned"
  | "proposals:create"
  | "proposals:update"
  | "proposals:assign"
  | "proposals:delete"
  // Assessment operations
  | "assessments:read"
  | "assessments:read:own"
  | "assessments:create"
  | "assessments:update"
  | "assessments:submit"
  | "assessments:approve"
  // Report access
  | "reports:read"
  | "reports:read:own"
  | "reports:create"
  | "reports:download"
  // Cost/billing views
  | "costs:read"
  | "costs:read:tenant"
  // Subscription/entitlement management
  | "subscriptions:read"
  | "subscriptions:update"
  // Queue management (Assessor)
  | "queue:read"
  | "queue:update"
  // Audit logs
  | "audit:read";

// ─────────────────────────────────────────────────────────────────────────────
// Role → Permission Mappings
// ─────────────────────────────────────────────────────────────────────────────

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  saas_admin: [
    "tenants:read",
    "tenants:create",
    "tenants:update",
    "tenants:delete",
    "users:read",
    "users:create",
    "users:update",
    "users:delete",
    "users:invite",
    "proposals:read",
    "assessments:read",
    "reports:read",
    "reports:download",
    "costs:read",
    "subscriptions:read",
    "subscriptions:update",
    "audit:read",
  ],
  tenant_admin: [
    "users:read",
    "users:create",
    "users:update",
    "users:delete",
    "users:invite",
    "funds:read",
    "funds:create",
    "funds:update",
    "funds:delete",
    "proposals:read",
    "proposals:create",
    "proposals:update",
    "proposals:assign",
    "proposals:delete",
    "assessments:read",
    "assessments:approve",
    "reports:read",
    "reports:create",
    "reports:download",
    "costs:read:tenant",
    "audit:read",
  ],
  assessor: [
    "proposals:read:assigned",
    "assessments:read:own",
    "assessments:create",
    "assessments:update",
    "assessments:submit",
    "reports:read:own",
    "queue:read",
    "queue:update",
  ],
  fund_manager: [
    "proposals:read",
    "proposals:create",
    "proposals:update",
    "proposals:assign",
    "assessments:read",
    "assessments:approve",
    "reports:read",
    "reports:create",
    "reports:download",
    "costs:read:tenant",
    "queue:read",
    "queue:update",
  ],
  viewer: [
    "proposals:read",
    "reports:read",
    "reports:download",
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Entitlement Types (per-tenant limits)
// ─────────────────────────────────────────────────────────────────────────────

export type ReportType = "summary" | "detailed" | "executive" | "compliance";
export type LLMProvider = "openai" | "anthropic" | "azure_openai" | "google";

export interface TenantEntitlements {
  tenantId: string;
  plan: "starter" | "professional" | "enterprise";
  maxAssessors: number;
  maxUploadsPerAssessment: number;
  allowedReportTypes: ReportType[];
  maxReportsPerMonth: number;
  reportsGeneratedThisMonth: number;
  allowedLLMProviders: LLMProvider[];
  llmModelAllowlist: string[];
  llmRateLimitRPM: number;
  llmRequestsThisMinute: number;
  llmRequestsLastReset: number;
  features: {
    advancedAnalytics: boolean;
    customBranding: boolean;
    apiAccess: boolean;
    ssoEnabled: boolean;
    auditLogRetentionDays: number;
  };
}

export const DEFAULT_ENTITLEMENTS: Omit<TenantEntitlements, "tenantId"> = {
  plan: "starter",
  maxAssessors: 5,
  maxUploadsPerAssessment: 3,
  allowedReportTypes: ["summary"],
  maxReportsPerMonth: 10,
  reportsGeneratedThisMonth: 0,
  allowedLLMProviders: ["openai"],
  llmModelAllowlist: ["gpt-4o-mini"],
  llmRateLimitRPM: 10,
  llmRequestsThisMinute: 0,
  llmRequestsLastReset: Date.now(),
  features: {
    advancedAnalytics: false,
    customBranding: false,
    apiAccess: false,
    ssoEnabled: false,
    auditLogRetentionDays: 30,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Resource Types for ownership/assignment checks
// ─────────────────────────────────────────────────────────────────────────────

export type ResourceType =
  | "tenant"
  | "user"
  | "fund"
  | "proposal"
  | "assessment"
  | "report";

export interface Resource {
  type: ResourceType;
  id: string;
  tenantId?: string;
  ownerId?: string;
  assignedUserIds?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Authorization Context
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthContext {
  userId: string;
  email: string;
  role: Role;
  name: string;
  tenantId: string | null;
  permissions: Permission[];
}

// ─────────────────────────────────────────────────────────────────────────────
// API Error Types
// ─────────────────────────────────────────────────────────────────────────────

export type ApiErrorCode =
  | "UNAUTHENTICATED"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "ENTITLEMENT_LIMIT"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR";

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export const API_ERROR_STATUS: Record<ApiErrorCode, number> = {
  UNAUTHENTICATED: 401,
  UNAUTHORIZED: 403,
  FORBIDDEN: 403,
  ENTITLEMENT_LIMIT: 409,
  VALIDATION_ERROR: 422,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
};
