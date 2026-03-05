import "server-only";

import {
  getQueueIdsForUser,
  getProposalIdsInQueues,
  getProposalQueueId,
  getQueueById,
  assignProposalToQueue as assignToQueue,
} from "./queues";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ProposalStatus = "New" | "Assigned" | "In Review" | "Approved" | "Declined";

export type AssignmentType = "direct" | "queue" | "none";

export interface Proposal {
  id: string;
  name: string;
  applicant: string;
  fund: string;
  amount: number;
  status: ProposalStatus;
  assignedToUserId: string | null;
  assignedToName: string | null;
  tenantId: string;
  submittedAt: string;
  dueDate: string | null;
  priority: "High" | "Medium" | "Low";
}

export interface ProposalWithAssignment extends Proposal {
  assignmentType: AssignmentType;
  assignedQueueId: string | null;
  assignedQueueName: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data Store
// ─────────────────────────────────────────────────────────────────────────────

const proposals: Proposal[] = [
  {
    id: "P-101",
    name: "Community Arts Program",
    applicant: "Arts Alliance",
    fund: "General Fund",
    amount: 45000,
    status: "New",
    assignedToUserId: null,
    assignedToName: null,
    tenantId: "tenant-001",
    submittedAt: "2026-03-02",
    dueDate: null,
    priority: "Medium",
  },
  {
    id: "P-102",
    name: "Youth Sports Initiative",
    applicant: "Sports Foundation",
    fund: "Youth Programs",
    amount: 32000,
    status: "New",
    assignedToUserId: null,
    assignedToName: null,
    tenantId: "tenant-001",
    submittedAt: "2026-03-01",
    dueDate: null,
    priority: "Low",
  },
  {
    id: "P-098",
    name: "Green Energy Project",
    applicant: "Eco Solutions",
    fund: "Innovation Grant",
    amount: 78000,
    status: "Assigned",
    assignedToUserId: "user-003",
    assignedToName: "Assessor User",
    tenantId: "tenant-001",
    submittedAt: "2026-02-25",
    dueDate: "2026-03-05",
    priority: "High",
  },
  {
    id: "P-099",
    name: "Digital Literacy Program",
    applicant: "Tech For All",
    fund: "Community Dev",
    amount: 25000,
    status: "Assigned",
    assignedToUserId: "user-assessor-2",
    assignedToName: "Sarah M.",
    tenantId: "tenant-001",
    submittedAt: "2026-02-26",
    dueDate: "2026-03-06",
    priority: "Medium",
  },
  {
    id: "P-095",
    name: "Senior Wellness Center",
    applicant: "Elder Care Co",
    fund: "Healthcare Init",
    amount: 120000,
    status: "In Review",
    assignedToUserId: "user-003",
    assignedToName: "Assessor User",
    tenantId: "tenant-001",
    submittedAt: "2026-02-20",
    dueDate: "2026-03-03",
    priority: "High",
  },
  {
    id: "P-096",
    name: "Food Security Network",
    applicant: "Hunger Relief",
    fund: "Emergency Reserve",
    amount: 55000,
    status: "In Review",
    assignedToUserId: "user-assessor-2",
    assignedToName: "Sarah M.",
    tenantId: "tenant-001",
    submittedAt: "2026-02-22",
    dueDate: "2026-03-04",
    priority: "High",
  },
  {
    id: "P-090",
    name: "Healthcare Access",
    applicant: "Health First",
    fund: "Healthcare Init",
    amount: 150000,
    status: "Approved",
    assignedToUserId: "user-003",
    assignedToName: "Assessor User",
    tenantId: "tenant-001",
    submittedAt: "2026-02-15",
    dueDate: null,
    priority: "High",
  },
  {
    id: "P-091",
    name: "Housing Initiative",
    applicant: "Shelter Org",
    fund: "Community Dev",
    amount: 200000,
    status: "Approved",
    assignedToUserId: "user-assessor-2",
    assignedToName: "Sarah M.",
    tenantId: "tenant-001",
    submittedAt: "2026-02-12",
    dueDate: null,
    priority: "Medium",
  },
  {
    id: "P-092",
    name: "Transport Subsidy",
    applicant: "Mobility Aid",
    fund: "General Fund",
    amount: 35000,
    status: "Declined",
    assignedToUserId: "user-assessor-2",
    assignedToName: "Sarah M.",
    tenantId: "tenant-001",
    submittedAt: "2026-02-10",
    dueDate: null,
    priority: "Low",
  },
  {
    id: "P-103",
    name: "Clean Water Initiative",
    applicant: "Water For All",
    fund: "Community Dev",
    amount: 68000,
    status: "New",
    assignedToUserId: null,
    assignedToName: null,
    tenantId: "tenant-001",
    submittedAt: "2026-03-01",
    dueDate: null,
    priority: "Medium",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Service Functions
// ─────────────────────────────────────────────────────────────────────────────

export interface ListProposalsParams {
  tenantId: string;
  userId: string;
  role: string;
}

export function listProposalsForUser(params: ListProposalsParams): Proposal[] {
  const { tenantId, userId, role } = params;

  const tenantProposals = proposals.filter((p) => p.tenantId === tenantId);

  if (role === "saas_admin" || role === "tenant_admin") {
    return tenantProposals;
  }

  if (role === "assessor") {
    const userQueueIds = getQueueIdsForUser(tenantId, userId);
    const proposalIdsInQueues = getProposalIdsInQueues(userQueueIds);

    return tenantProposals.filter(
      (p) =>
        p.assignedToUserId === userId || proposalIdsInQueues.includes(p.id)
    );
  }

  return [];
}

export function listProposalsWithAssignmentForUser(params: ListProposalsParams): ProposalWithAssignment[] {
  const { tenantId, role } = params;

  const tenantProposals = proposals.filter((p) => p.tenantId === tenantId);

  if (role !== "saas_admin" && role !== "tenant_admin") {
    return [];
  }

  return tenantProposals.map((proposal) => {
    const queueId = getProposalQueueId(proposal.id);
    const queue = queueId ? getQueueById(queueId) : null;

    let assignmentType: AssignmentType = "none";
    if (proposal.assignedToUserId) {
      assignmentType = "direct";
    } else if (queueId) {
      assignmentType = "queue";
    }

    return {
      ...proposal,
      assignmentType,
      assignedQueueId: queueId,
      assignedQueueName: queue?.name ?? null,
    };
  });
}

export interface GetProposalParams {
  tenantId: string;
  userId: string;
  role: string;
  proposalId: string;
}

export interface GetProposalResult {
  proposal: Proposal | null;
  accessDenied: boolean;
}

export function getProposalForUser(params: GetProposalParams): GetProposalResult {
  const { tenantId, userId, role, proposalId } = params;

  const proposal = proposals.find((p) => p.id === proposalId);

  if (!proposal) {
    return { proposal: null, accessDenied: false };
  }

  if (proposal.tenantId !== tenantId) {
    return { proposal: null, accessDenied: true };
  }

  if (role === "saas_admin" || role === "tenant_admin") {
    return { proposal, accessDenied: false };
  }

  if (role === "assessor") {
    if (proposal.assignedToUserId === userId) {
      return { proposal, accessDenied: false };
    }

    const userQueueIds = getQueueIdsForUser(tenantId, userId);
    const proposalQueueId = getProposalQueueId(proposalId);
    if (proposalQueueId && userQueueIds.includes(proposalQueueId)) {
      return { proposal, accessDenied: false };
    }

    return { proposal: null, accessDenied: true };
  }

  return { proposal: null, accessDenied: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Assessor Queue Access
// ─────────────────────────────────────────────────────────────────────────────

export interface ListAssessorQueueParams {
  tenantId: string;
  userId: string;
}

export function listProposalsForAssessorAccess(
  params: ListAssessorQueueParams
): ProposalWithAssignment[] {
  const { tenantId, userId } = params;

  const tenantProposals = proposals.filter((p) => p.tenantId === tenantId);
  const userQueueIds = getQueueIdsForUser(tenantId, userId);
  const proposalIdsInQueues = getProposalIdsInQueues(userQueueIds);

  const result: ProposalWithAssignment[] = [];

  for (const proposal of tenantProposals) {
    const proposalQueueId = getProposalQueueId(proposal.id);
    const queue = proposalQueueId ? getQueueById(proposalQueueId) : null;

    if (proposal.assignedToUserId === userId) {
      result.push({
        ...proposal,
        assignmentType: "direct",
        assignedQueueId: proposalQueueId,
        assignedQueueName: queue?.name ?? null,
      });
    } else if (proposalIdsInQueues.includes(proposal.id)) {
      result.push({
        ...proposal,
        assignmentType: "queue",
        assignedQueueId: proposalQueueId,
        assignedQueueName: queue?.name ?? null,
      });
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Assignment Functions
// ─────────────────────────────────────────────────────────────────────────────

export interface AssignProposalParams {
  tenantId: string;
  proposalId: string;
  assignToUserId: string;
  assignToUserName?: string;
  assignToQueueId: string;
  dueDate?: string | null;
}

export interface AssignProposalResult {
  ok: boolean;
  error?: string;
  assignedToUserId?: string | null;
  assignedQueueId?: string | null;
  dueDate?: string | null;
}

export function assignProposal(params: AssignProposalParams): AssignProposalResult {
  const { tenantId, proposalId, assignToUserId, assignToUserName, assignToQueueId, dueDate } = params;

  const proposal = proposals.find((p) => p.id === proposalId);
  if (!proposal) {
    return { ok: false, error: "Proposal not found" };
  }

  if (proposal.tenantId !== tenantId) {
    return { ok: false, error: "Proposal not in tenant" };
  }

  if (!assignToUserId) {
    return { ok: false, error: "Assessor is required" };
  }

  if (!assignToQueueId) {
    return { ok: false, error: "Queue is required" };
  }

  // Assign to queue
  const queueResult = assignToQueue({ tenantId, proposalId, queueId: assignToQueueId });
  if (!queueResult.ok) {
    return { ok: false, error: queueResult.error };
  }

  // Assign to user
  proposal.assignedToUserId = assignToUserId;
  proposal.assignedToName = assignToUserName ?? assignToUserId;
  
  // Set due date
  if (dueDate !== undefined) {
    proposal.dueDate = dueDate;
  }

  // Update status
  if (proposal.status === "New") {
    proposal.status = "Assigned";
  }

  return {
    ok: true,
    assignedToUserId: assignToUserId,
    assignedQueueId: assignToQueueId,
    dueDate: proposal.dueDate,
  };
}

export function getProposalById(proposalId: string): Proposal | undefined {
  return proposals.find((p) => p.id === proposalId);
}
