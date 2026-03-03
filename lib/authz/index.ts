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
  GROUP_MANAGE,
  QUEUE_MANAGE,
  PROPOSAL_CREATE,
  PROPOSAL_READ,
  PROPOSAL_ASSIGN,
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

// Guards
export {
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
} from "./guards";
