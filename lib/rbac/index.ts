import "server-only";

// Types
export type {
  Role,
  Permission,
  AuthContext,
  Resource,
  ResourceType,
  TenantEntitlements,
  ReportType,
  LLMProvider,
  ApiError,
  ApiErrorCode,
} from "./types";

export {
  ROLE_PERMISSIONS,
  DEFAULT_ENTITLEMENTS,
  API_ERROR_STATUS,
} from "./types";

// Authorization
export {
  getAuthContext,
  requireAuth,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  requirePermission,
  requireAnyPermission,
  isSaaSAdmin,
  canAccessTenant,
  requireTenantAccess,
  getRequiredTenantId,
  canAccessResource,
  requireResourceAccess,
  requireRole,
  requireSaaSAdmin,
  requireTenantAdmin,
  requireTenantAdminOrHigher,
  createAuthError,
  getErrorStatus,
  isAuthError,
} from "./authz";

// Entitlements
export {
  getTenantEntitlements,
  getEntitlementsForContext,
  checkAssessorLimit,
  requireAssessorCapacity,
  checkUploadLimit,
  requireUploadCapacity,
  checkReportTypeAllowed,
  requireReportType,
  checkReportQuota,
  requireReportQuota,
  incrementReportCount,
  checkLLMProvider,
  checkLLMModel,
  requireLLMAccess,
  checkLLMRateLimit,
  requireLLMRateLimit,
  incrementLLMRequestCount,
  hasFeature,
  requireFeature,
} from "./entitlements";

// Audit
export type { AuditAction, AuditSeverity, AuditLogEntry, AuditQueryOptions } from "./audit";
export {
  logAudit,
  logAdminAction,
  logAssessorAction,
  logSecurityEvent,
  logAuthEvent,
  queryAuditLogs,
  getRecentAuditLogs,
} from "./audit";

// API Utilities
export type {
  ApiSuccessResponse,
  ApiErrorResponse,
  ApiResponse,
  ValidationRule,
  PaginationParams,
  PaginatedResponse,
} from "./api";

export {
  successResponse,
  errorResponse,
  handleApiError,
  withAuth,
  withPublic,
  validateRequest,
  validationError,
  parsePagination,
  paginatedResponse,
} from "./api";
