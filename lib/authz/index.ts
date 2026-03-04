import "server-only";

// Roles
export { ROLES, ROLE_META } from "./roles";
export type { RoleKey, RoleMeta } from "./roles";
export { isValidRole, isTenantScopedRole } from "./roles";

// Permissions
export {
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
  PERMISSIONS,
  ALL_PERMISSIONS,
} from "./permissions";
export type { Permission } from "./permissions";

// Role → Permissions mapping
export { ROLE_PERMISSIONS, getPermissionsForRole, roleHasPermission } from "./rolePermissions";

// Errors
export { AuthzError, AuthRequiredError, ForbiddenError, isAuthzError } from "./errors";

// Context
export type { AuthzUser, AuthorizationContext } from "./context";
export { getAuthzContext, getAuthzContextOrNull } from "./context";

// Session Authz
export type { MyAuthzData, MyAuthzResult } from "./sessionAuthz";
export { getMyAuthz } from "./sessionAuthz";

// Guards (API routes)
export {
  AuthzHttpError,
  requireSession,
  requireUserRole,
  requireTenant,
  jsonError,
  requireRole,
  requireSaaSAdmin,
  requireTenantAdmin,
  requireTenantAdminOrHigher,
  hasPermission,
  requirePermission,
  requireAnyPermission,
  canAccessTenant,
  requireTenantAccess,
  requireTenantContext,
  requirePermissionInTenant,
  canAccessProposal,
  requireProposalAccess,
  RBAC_PERMISSIONS,
  requireRBACPermission,
  requireRBACPermissions,
  requireAnyRBACPermission,
  requireTenantMatch,
  hasRBACPermission,
} from "./guards";
export type { SessionUser, Proposal, PermissionKey } from "./guards";

// Page Guards (server components)
export {
  requireAuth,
  requireRole as requirePageRole,
  requireTenantContext as requirePageTenantContext,
  requireRoleWithTenantContext,
  requirePermission as requirePagePermission,
  requireRoleOrPermission,
  requirePermissionWithTenantContext,
  requireRBACPermission as requirePageRBACPermission,
  requireRBACPermissionStrict,
  requireRBACPermissionWithTenantContext,
  isForbidden,
} from "./pageGuards";
export type { AuthenticatedUser, TenantContext, ForbiddenResult } from "./pageGuards";
