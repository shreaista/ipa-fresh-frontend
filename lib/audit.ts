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

export interface AuditQueryOptions {
  tenantId?: string;
  startDate?: string; // ISO
  endDate?: string; // ISO
  userId?: string;
  action?: string;
  proposalId?: string;
  limit?: number;
  offset?: number;
}

export function queryAuditLog(options: AuditQueryOptions): { entries: AuditLogEntry[]; total: number } {
  let filtered = [...auditLog];

  if (options.tenantId) {
    filtered = filtered.filter((e) => e.tenantId === options.tenantId);
  }
  if (options.startDate) {
    filtered = filtered.filter((e) => e.timestamp >= options.startDate!);
  }
  if (options.endDate) {
    filtered = filtered.filter((e) => e.timestamp <= options.endDate!);
  }
  if (options.userId) {
    filtered = filtered.filter((e) => e.actorUserId === options.userId);
  }
  if (options.action) {
    filtered = filtered.filter((e) => e.action === options.action);
  }
  if (options.proposalId) {
    filtered = filtered.filter((e) => e.resourceId === options.proposalId || (e.details as Record<string, unknown>)?.proposalId === options.proposalId);
  }

  const total = filtered.length;
  const offset = options.offset ?? 0;
  const limit = options.limit ?? 100;
  const entries = filtered.slice(offset, offset + limit);

  return { entries, total };
}

/** Seed demo entries when tenant has no entries (for development) */
export function seedDemoAuditLog(tenantId: string): void {
  const hasTenantEntries = auditLog.some((e) => e.tenantId === tenantId);
  if (hasTenantEntries) return;
  const now = new Date();
  const entries: Omit<AuditLogEntry, "id">[] = [
    { timestamp: new Date(now.getTime() - 3600000).toISOString(), action: "proposal.status_update", actorUserId: "user-001", actorEmail: "admin@example.com", tenantId, resourceType: "proposal", resourceId: "P-101", details: { before: "In Review", after: "Approved", proposalName: "Community Arts Program" } },
    { timestamp: new Date(now.getTime() - 7200000).toISOString(), action: "proposal.evaluate", actorUserId: "user-002", actorEmail: "assessor@example.com", tenantId, resourceType: "proposal_evaluation", resourceId: "P-102", details: { fitScore: 78, model: "gpt-4" } },
    { timestamp: new Date(now.getTime() - 10800000).toISOString(), action: "proposal_document.upload", actorUserId: "user-001", actorEmail: "admin@example.com", tenantId, resourceType: "proposal_document", resourceId: "P-103", details: { filename: "pitch.pdf" } },
    { timestamp: new Date(now.getTime() - 14400000).toISOString(), action: "proposal.assign_to_assessor", actorUserId: "user-001", actorEmail: "admin@example.com", tenantId, resourceType: "proposal", resourceId: "P-104", details: { assessorName: "Jane Doe", before: null, after: "Assigned" } },
    { timestamp: new Date(now.getTime() - 18000000).toISOString(), action: "proposal.status_update", actorUserId: "user-002", actorEmail: "assessor@example.com", tenantId, resourceType: "proposal", resourceId: "P-105", details: { before: "Assigned", after: "Declined", proposalName: "Tech Startup Alpha" } },
  ];
  entries.forEach((e, i) => {
    auditLog.push({
      id: `audit-${nextAuditId++}`,
      ...e,
    } as AuditLogEntry);
  });
}
