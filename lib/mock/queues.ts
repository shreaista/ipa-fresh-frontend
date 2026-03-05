import "server-only";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Queue {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
}

export interface QueueMember {
  queueId: string;
  tenantId: string;
  userId: string;
  addedAt: string;
}

export interface ProposalQueue {
  proposalId: string;
  queueId: string;
}

export interface QueueWithMemberCount extends Queue {
  memberCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data Store
// ─────────────────────────────────────────────────────────────────────────────

let nextQueueId = 4;

const queues: Queue[] = [
  { id: "queue-default", tenantId: "tenant-001", name: "Default Queue", description: "General proposals queue", isActive: true, createdAt: "2026-01-15T10:00:00Z" },
  { id: "queue-high-priority", tenantId: "tenant-001", name: "High Priority", description: "Urgent proposals requiring immediate attention", isActive: true, createdAt: "2026-01-20T14:30:00Z" },
  { id: "queue-healthcare", tenantId: "tenant-001", name: "Healthcare", description: "Healthcare-related funding proposals", isActive: true, createdAt: "2026-02-01T09:00:00Z" },
];

const queueMembers: QueueMember[] = [
  { queueId: "queue-default", tenantId: "tenant-001", userId: "user-003", addedAt: "2026-01-15T10:05:00Z" },
  { queueId: "queue-default", tenantId: "tenant-001", userId: "user-assessor-2", addedAt: "2026-01-15T10:10:00Z" },
  { queueId: "queue-high-priority", tenantId: "tenant-001", userId: "user-003", addedAt: "2026-01-20T14:35:00Z" },
  { queueId: "queue-healthcare", tenantId: "tenant-001", userId: "user-assessor-2", addedAt: "2026-02-01T09:05:00Z" },
  { queueId: "queue-healthcare", tenantId: "tenant-001", userId: "user-assessor-3", addedAt: "2026-02-01T09:10:00Z" },
];

const proposalQueues: ProposalQueue[] = [];

// ─────────────────────────────────────────────────────────────────────────────
// Service Functions
// ─────────────────────────────────────────────────────────────────────────────

export function listQueuesForTenant(tenantId: string, includeInactive = false): Queue[] {
  return queues.filter((q) => q.tenantId === tenantId && (includeInactive || q.isActive));
}

export function listQueuesWithMemberCountForTenant(tenantId: string, includeInactive = false): QueueWithMemberCount[] {
  const tenantQueues = queues.filter((q) => q.tenantId === tenantId && (includeInactive || q.isActive));
  return tenantQueues.map((q) => ({
    ...q,
    memberCount: queueMembers.filter((m) => m.queueId === q.id).length,
  }));
}

export function getQueueById(queueId: string): Queue | undefined {
  return queues.find((q) => q.id === queueId);
}

export function getQueueIdsForUser(tenantId: string, userId: string): string[] {
  const tenantQueueIds = queues
    .filter((q) => q.tenantId === tenantId)
    .map((q) => q.id);

  return queueMembers
    .filter((m) => m.userId === userId && tenantQueueIds.includes(m.queueId))
    .map((m) => m.queueId);
}

export function getProposalQueueId(proposalId: string): string | null {
  const pq = proposalQueues.find((pq) => pq.proposalId === proposalId);
  return pq ? pq.queueId : null;
}

export function getProposalIdsInQueues(queueIds: string[]): string[] {
  return proposalQueues
    .filter((pq) => queueIds.includes(pq.queueId))
    .map((pq) => pq.proposalId);
}

export interface AssignProposalToQueueParams {
  tenantId: string;
  proposalId: string;
  queueId: string;
}

export interface AssignProposalToQueueResult {
  ok: boolean;
  error?: string;
}

export function assignProposalToQueue(
  params: AssignProposalToQueueParams
): AssignProposalToQueueResult {
  const { tenantId, proposalId, queueId } = params;

  const queue = queues.find((q) => q.id === queueId && q.tenantId === tenantId);
  if (!queue) {
    return { ok: false, error: "Queue not found in tenant" };
  }

  const existingIndex = proposalQueues.findIndex(
    (pq) => pq.proposalId === proposalId
  );

  if (existingIndex >= 0) {
    proposalQueues[existingIndex] = { proposalId, queueId };
  } else {
    proposalQueues.push({ proposalId, queueId });
  }

  return { ok: true };
}

export function removeProposalFromQueue(proposalId: string): void {
  const index = proposalQueues.findIndex((pq) => pq.proposalId === proposalId);
  if (index >= 0) {
    proposalQueues.splice(index, 1);
  }
}

export function isUserInQueue(userId: string, queueId: string): boolean {
  return queueMembers.some(
    (m) => m.userId === userId && m.queueId === queueId
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Queue CRUD Operations
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateQueueParams {
  tenantId: string;
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface CreateQueueResult {
  ok: boolean;
  error?: string;
  data?: Queue;
}

export function createQueue(params: CreateQueueParams): CreateQueueResult {
  const { tenantId, name, description = "", isActive = true } = params;

  if (!name || name.trim().length === 0) {
    return { ok: false, error: "Queue name is required" };
  }

  const existingQueue = queues.find(
    (q) => q.tenantId === tenantId && q.name.toLowerCase() === name.toLowerCase() && q.isActive
  );
  if (existingQueue) {
    return { ok: false, error: "A queue with this name already exists" };
  }

  const newQueue: Queue = {
    id: `queue-${nextQueueId++}`,
    tenantId,
    name: name.trim(),
    description: description.trim(),
    isActive,
    createdAt: new Date().toISOString(),
  };

  queues.push(newQueue);
  return { ok: true, data: newQueue };
}

export interface UpdateQueueParams {
  queueId: string;
  tenantId: string;
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateQueueResult {
  ok: boolean;
  error?: string;
  data?: Queue;
}

export function updateQueue(params: UpdateQueueParams): UpdateQueueResult {
  const { queueId, tenantId, name, description, isActive } = params;

  const queueIndex = queues.findIndex((q) => q.id === queueId && q.tenantId === tenantId);
  if (queueIndex < 0) {
    return { ok: false, error: "Queue not found" };
  }

  const queue = queues[queueIndex];

  if (name !== undefined) {
    if (!name || name.trim().length === 0) {
      return { ok: false, error: "Queue name is required" };
    }
    const duplicateName = queues.find(
      (q) => q.tenantId === tenantId && q.id !== queueId && q.name.toLowerCase() === name.toLowerCase() && q.isActive
    );
    if (duplicateName) {
      return { ok: false, error: "A queue with this name already exists" };
    }
    queue.name = name.trim();
  }

  if (description !== undefined) {
    queue.description = description.trim();
  }

  if (isActive !== undefined) {
    queue.isActive = isActive;
  }

  return { ok: true, data: queue };
}

export interface DeleteQueueParams {
  queueId: string;
  tenantId: string;
}

export interface DeleteQueueResult {
  ok: boolean;
  error?: string;
}

export function deleteQueue(params: DeleteQueueParams): DeleteQueueResult {
  const { queueId, tenantId } = params;

  const queueIndex = queues.findIndex((q) => q.id === queueId && q.tenantId === tenantId);
  if (queueIndex < 0) {
    return { ok: false, error: "Queue not found" };
  }

  queues[queueIndex].isActive = false;
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Queue Member Management
// ─────────────────────────────────────────────────────────────────────────────

export function getQueueMembersForTenantQueue(queueId: string, tenantId: string): QueueMember[] {
  const queue = queues.find((q) => q.id === queueId && q.tenantId === tenantId);
  if (!queue) return [];
  return queueMembers.filter((m) => m.queueId === queueId && m.tenantId === tenantId);
}

export interface AddQueueMemberParams {
  queueId: string;
  tenantId: string;
  userId: string;
}

export interface AddQueueMemberResult {
  ok: boolean;
  error?: string;
  data?: QueueMember;
}

export function addQueueMember(params: AddQueueMemberParams): AddQueueMemberResult {
  const { queueId, tenantId, userId } = params;

  const queue = queues.find((q) => q.id === queueId && q.tenantId === tenantId);
  if (!queue) {
    return { ok: false, error: "Queue not found in tenant" };
  }

  const existingMember = queueMembers.find(
    (m) => m.queueId === queueId && m.userId === userId
  );
  if (existingMember) {
    return { ok: false, error: "User is already a member of this queue" };
  }

  const newMember: QueueMember = {
    queueId,
    tenantId,
    userId,
    addedAt: new Date().toISOString(),
  };

  queueMembers.push(newMember);
  return { ok: true, data: newMember };
}

export interface RemoveQueueMemberParams {
  queueId: string;
  tenantId: string;
  userId: string;
}

export interface RemoveQueueMemberResult {
  ok: boolean;
  error?: string;
}

export function removeQueueMember(params: RemoveQueueMemberParams): RemoveQueueMemberResult {
  const { queueId, tenantId, userId } = params;

  const queue = queues.find((q) => q.id === queueId && q.tenantId === tenantId);
  if (!queue) {
    return { ok: false, error: "Queue not found in tenant" };
  }

  const memberIndex = queueMembers.findIndex(
    (m) => m.queueId === queueId && m.userId === userId && m.tenantId === tenantId
  );
  if (memberIndex < 0) {
    return { ok: false, error: "User is not a member of this queue" };
  }

  queueMembers.splice(memberIndex, 1);
  return { ok: true };
}
