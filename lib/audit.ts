import "server-only";

// ─────────────────────────────────────────────────────────────────────────────
// Audit Log Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  actorUserId: string;
  actorEmail?: string;
  tenantId: string | null;
  resourceType: string;
  resourceId: string;
  details?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// In-Memory Audit Log (stub for future DB implementation)
// ─────────────────────────────────────────────────────────────────────────────

const auditLog: AuditLogEntry[] = [];
let nextAuditId = 1;

// ─────────────────────────────────────────────────────────────────────────────
// Audit Functions
// ─────────────────────────────────────────────────────────────────────────────

export interface LogAuditParams {
  action: string;
  actorUserId: string;
  actorEmail?: string;
  tenantId: string | null;
  resourceType: string;
  resourceId: string;
  details?: Record<string, unknown>;
}

export function logAudit(params: LogAuditParams): void {
  const entry: AuditLogEntry = {
    id: `audit-${nextAuditId++}`,
    timestamp: new Date().toISOString(),
    action: params.action,
    actorUserId: params.actorUserId,
    actorEmail: params.actorEmail,
    tenantId: params.tenantId,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    details: params.details,
  };

  auditLog.push(entry);

  console.log("[audit]", entry.action, {
    resourceType: entry.resourceType,
    resourceId: entry.resourceId,
    actorUserId: entry.actorUserId,
    tenantId: entry.tenantId,
    timestamp: entry.timestamp,
    ...entry.details,
  });
}

export function getAuditLog(tenantId?: string): AuditLogEntry[] {
  if (tenantId) {
    return auditLog.filter((e) => e.tenantId === tenantId);
  }
  return [...auditLog];
}
