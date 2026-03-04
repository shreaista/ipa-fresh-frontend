import "server-only";

// ─────────────────────────────────────────────────────────────────────────────
// Unified Proposals Store
// Consolidates proposals, users, queues, and assignments for RBAC enforcement
// ─────────────────────────────────────────────────────────────────────────────

import type { Role } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface StoreUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  tenantId: string | null;
}

export interface StoreQueue {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
}

export interface StoreQueueMember {
  queueId: string;
  userId: string;
}

export interface StoreProposalAssignment {
  proposalId: string;
  assignedUserId: string | null;
  assignedQueueId: string | null;
  assignedAt: string;
  assignedBy: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data Store
// ─────────────────────────────────────────────────────────────────────────────

const users: StoreUser[] = [
  { id: "user-001", email: "admin@ipa.com", name: "SaaS Admin", role: "saas_admin", tenantId: null },
  { id: "user-002", email: "tenant@ipa.com", name: "Tenant Admin", role: "tenant_admin", tenantId: "tenant-001" },
  { id: "user-003", email: "assessor@ipa.com", name: "Assessor User", role: "assessor", tenantId: "tenant-001" },
  { id: "user-assessor-2", email: "sarah@ipa.com", name: "Sarah M.", role: "assessor", tenantId: "tenant-001" },
  { id: "user-assessor-3", email: "mike@ipa.com", name: "Mike R.", role: "assessor", tenantId: "tenant-001" },
];

const queues: StoreQueue[] = [
  { id: "queue-default", tenantId: "tenant-001", name: "Default Queue", description: "General proposals" },
  { id: "queue-high-priority", tenantId: "tenant-001", name: "High Priority", description: "Urgent proposals" },
  { id: "queue-healthcare", tenantId: "tenant-001", name: "Healthcare", description: "Healthcare-related proposals" },
];

const queueMembers: StoreQueueMember[] = [
  { queueId: "queue-default", userId: "user-003" },
  { queueId: "queue-default", userId: "user-assessor-2" },
  { queueId: "queue-high-priority", userId: "user-003" },
  { queueId: "queue-healthcare", userId: "user-assessor-2" },
  { queueId: "queue-healthcare", userId: "user-assessor-3" },
];

const proposalAssignments: StoreProposalAssignment[] = [];

// ─────────────────────────────────────────────────────────────────────────────
// User Service Functions
// ─────────────────────────────────────────────────────────────────────────────

export function listUsersForTenant(tenantId: string): StoreUser[] {
  return users.filter((u) => u.tenantId === tenantId);
}

export function listAssessorsForTenant(tenantId: string): StoreUser[] {
  return users.filter((u) => u.tenantId === tenantId && u.role === "assessor");
}

export function getUserById(userId: string): StoreUser | undefined {
  return users.find((u) => u.id === userId);
}

export function isUserInTenant(userId: string, tenantId: string): boolean {
  const user = getUserById(userId);
  return user !== undefined && user.tenantId === tenantId;
}

// ─────────────────────────────────────────────────────────────────────────────
// Queue Service Functions
// ─────────────────────────────────────────────────────────────────────────────

export function listQueuesForTenant(tenantId: string): StoreQueue[] {
  return queues.filter((q) => q.tenantId === tenantId);
}

export function getQueueById(queueId: string): StoreQueue | undefined {
  return queues.find((q) => q.id === queueId);
}

export function isQueueInTenant(queueId: string, tenantId: string): boolean {
  const queue = getQueueById(queueId);
  return queue !== undefined && queue.tenantId === tenantId;
}

export function getQueueMembersForQueue(queueId: string): StoreQueueMember[] {
  return queueMembers.filter((m) => m.queueId === queueId);
}

export function isUserInQueue(userId: string, queueId: string): boolean {
  return queueMembers.some((m) => m.userId === userId && m.queueId === queueId);
}

export function getQueuesForUser(tenantId: string, userId: string): StoreQueue[] {
  const userQueueIds = queueMembers
    .filter((m) => m.userId === userId)
    .map((m) => m.queueId);
  return queues.filter((q) => q.tenantId === tenantId && userQueueIds.includes(q.id));
}

// ─────────────────────────────────────────────────────────────────────────────
// Assignment Service Functions
// ─────────────────────────────────────────────────────────────────────────────

export function getAssignmentForProposal(proposalId: string): StoreProposalAssignment | undefined {
  return proposalAssignments.find((a) => a.proposalId === proposalId);
}

export function setAssignment(
  proposalId: string,
  assignedUserId: string | null,
  assignedQueueId: string | null,
  assignedBy: string
): StoreProposalAssignment {
  const existingIndex = proposalAssignments.findIndex((a) => a.proposalId === proposalId);
  
  const assignment: StoreProposalAssignment = {
    proposalId,
    assignedUserId,
    assignedQueueId,
    assignedAt: new Date().toISOString(),
    assignedBy,
  };

  if (existingIndex >= 0) {
    proposalAssignments[existingIndex] = assignment;
  } else {
    proposalAssignments.push(assignment);
  }

  return assignment;
}

export function clearAssignment(proposalId: string): void {
  const index = proposalAssignments.findIndex((a) => a.proposalId === proposalId);
  if (index >= 0) {
    proposalAssignments.splice(index, 1);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Access Check Functions
// ─────────────────────────────────────────────────────────────────────────────

export interface CanAccessProposalParams {
  userId: string;
  tenantId: string;
  role: Role;
  proposalId: string;
  proposalTenantId: string;
  proposalAssignedUserId: string | null;
}

export function canUserAccessProposal(params: CanAccessProposalParams): boolean {
  const { userId, tenantId, role, proposalTenantId, proposalAssignedUserId, proposalId } = params;

  // Tenant isolation
  if (proposalTenantId !== tenantId && role !== "saas_admin") {
    return false;
  }

  // SaaS admin can access all
  if (role === "saas_admin") {
    return true;
  }

  // Tenant admin can access all in their tenant
  if (role === "tenant_admin") {
    return true;
  }

  // Assessor access
  if (role === "assessor") {
    // Direct assignment
    if (proposalAssignedUserId === userId) {
      return true;
    }

    // Queue-based access: check if proposal is in a queue the user belongs to
    const assignment = getAssignmentForProposal(proposalId);
    if (assignment?.assignedQueueId) {
      if (isUserInQueue(userId, assignment.assignedQueueId)) {
        return true;
      }
    }

    return false;
  }

  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported Store Access (for testing/debugging)
// ─────────────────────────────────────────────────────────────────────────────

export function getStoreSnapshot() {
  return {
    users: [...users],
    queues: [...queues],
    queueMembers: [...queueMembers],
    proposalAssignments: [...proposalAssignments],
  };
}
