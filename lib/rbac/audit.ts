import "server-only";

import type { AuthContext, ResourceType } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Audit Log Types
// ─────────────────────────────────────────────────────────────────────────────

export type AuditAction =
  // Auth actions
  | "auth.login"
  | "auth.logout"
  | "auth.login_failed"
  // Tenant actions
  | "tenant.create"
  | "tenant.update"
  | "tenant.delete"
  | "tenant.suspend"
  | "tenant.activate"
  // User actions
  | "user.create"
  | "user.update"
  | "user.delete"
  | "user.invite"
  | "user.role_change"
  | "user.deactivate"
  // Fund actions
  | "fund.create"
  | "fund.update"
  | "fund.delete"
  | "fund.pause"
  // Proposal actions
  | "proposal.create"
  | "proposal.update"
  | "proposal.delete"
  | "proposal.assign"
  | "proposal.unassign"
  | "proposal.status_change"
  // Assessment actions
  | "assessment.create"
  | "assessment.update"
  | "assessment.submit"
  | "assessment.approve"
  | "assessment.reject"
  | "assessment.upload"
  // Report actions
  | "report.generate"
  | "report.download"
  // Subscription actions
  | "subscription.update"
  | "subscription.upgrade"
  | "subscription.downgrade"
  // Security actions
  | "security.permission_denied"
  | "security.tenant_violation"
  | "security.rate_limit_exceeded";

export type AuditSeverity = "info" | "warning" | "critical";

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: AuditAction;
  severity: AuditSeverity;
  actorId: string;
  actorEmail: string;
  actorRole: string;
  tenantId: string | null;
  resourceType?: ResourceType;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// In-memory audit log store (replace with database/external service in prod)
// ─────────────────────────────────────────────────────────────────────────────

const auditLogs: AuditLogEntry[] = [];
const MAX_LOGS = 10000;

// ─────────────────────────────────────────────────────────────────────────────
// Audit Logging Functions
// ─────────────────────────────────────────────────────────────────────────────

function generateId(): string {
  return `audit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function getSeverity(action: AuditAction): AuditSeverity {
  const criticalActions: AuditAction[] = [
    "tenant.delete",
    "user.delete",
    "security.permission_denied",
    "security.tenant_violation",
  ];

  const warningActions: AuditAction[] = [
    "tenant.suspend",
    "user.deactivate",
    "user.role_change",
    "proposal.delete",
    "fund.delete",
    "assessment.reject",
    "security.rate_limit_exceeded",
  ];

  if (criticalActions.includes(action)) return "critical";
  if (warningActions.includes(action)) return "warning";
  return "info";
}

export async function logAudit(
  ctx: AuthContext | null,
  action: AuditAction,
  options: {
    resourceType?: ResourceType;
    resourceId?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    overrideTenantId?: string;
  } = {}
): Promise<AuditLogEntry> {
  const entry: AuditLogEntry = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    action,
    severity: getSeverity(action),
    actorId: ctx?.userId || "system",
    actorEmail: ctx?.email || "system",
    actorRole: ctx?.role || "system",
    tenantId: options.overrideTenantId ?? ctx?.tenantId ?? null,
    resourceType: options.resourceType,
    resourceId: options.resourceId,
    details: options.details,
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
  };

  auditLogs.unshift(entry);

  if (auditLogs.length > MAX_LOGS) {
    auditLogs.pop();
  }

  if (entry.severity === "critical") {
    console.error("[AUDIT:CRITICAL]", JSON.stringify(entry));
  } else if (entry.severity === "warning") {
    console.warn("[AUDIT:WARNING]", JSON.stringify(entry));
  }

  return entry;
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience Loggers
// ─────────────────────────────────────────────────────────────────────────────

export async function logAdminAction(
  ctx: AuthContext,
  action: AuditAction,
  resourceType: ResourceType,
  resourceId: string,
  details?: Record<string, unknown>
): Promise<AuditLogEntry> {
  return logAudit(ctx, action, {
    resourceType,
    resourceId,
    details,
  });
}

export async function logAssessorAction(
  ctx: AuthContext,
  action: AuditAction,
  resourceType: ResourceType,
  resourceId: string,
  details?: Record<string, unknown>
): Promise<AuditLogEntry> {
  return logAudit(ctx, action, {
    resourceType,
    resourceId,
    details,
  });
}

export async function logSecurityEvent(
  ctx: AuthContext | null,
  action: AuditAction,
  details: Record<string, unknown>,
  ipAddress?: string
): Promise<AuditLogEntry> {
  return logAudit(ctx, action, {
    details,
    ipAddress,
  });
}

export async function logAuthEvent(
  action: "auth.login" | "auth.logout" | "auth.login_failed",
  email: string,
  success: boolean,
  ipAddress?: string,
  details?: Record<string, unknown>
): Promise<AuditLogEntry> {
  return logAudit(null, action, {
    details: {
      email,
      success,
      ...details,
    },
    ipAddress,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit Log Queries
// ─────────────────────────────────────────────────────────────────────────────

export interface AuditQueryOptions {
  tenantId?: string;
  actorId?: string;
  action?: AuditAction;
  severity?: AuditSeverity;
  resourceType?: ResourceType;
  resourceId?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

export async function queryAuditLogs(
  ctx: AuthContext,
  options: AuditQueryOptions = {}
): Promise<{ logs: AuditLogEntry[]; total: number }> {
  let filtered = [...auditLogs];

  if (ctx.role !== "saas_admin" && ctx.tenantId) {
    filtered = filtered.filter((log) => log.tenantId === ctx.tenantId);
  }

  if (options.tenantId) {
    filtered = filtered.filter((log) => log.tenantId === options.tenantId);
  }

  if (options.actorId) {
    filtered = filtered.filter((log) => log.actorId === options.actorId);
  }

  if (options.action) {
    filtered = filtered.filter((log) => log.action === options.action);
  }

  if (options.severity) {
    filtered = filtered.filter((log) => log.severity === options.severity);
  }

  if (options.resourceType) {
    filtered = filtered.filter((log) => log.resourceType === options.resourceType);
  }

  if (options.resourceId) {
    filtered = filtered.filter((log) => log.resourceId === options.resourceId);
  }

  if (options.fromDate) {
    filtered = filtered.filter((log) => log.timestamp >= options.fromDate!);
  }

  if (options.toDate) {
    filtered = filtered.filter((log) => log.timestamp <= options.toDate!);
  }

  const total = filtered.length;
  const offset = options.offset || 0;
  const limit = options.limit || 50;

  return {
    logs: filtered.slice(offset, offset + limit),
    total,
  };
}

export async function getRecentAuditLogs(
  ctx: AuthContext,
  limit: number = 20
): Promise<AuditLogEntry[]> {
  const { logs } = await queryAuditLogs(ctx, { limit });
  return logs;
}
