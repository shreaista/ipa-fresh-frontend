import "server-only";
import { productionMode } from "@/lib/config/productionMode";
import {
  loadProposalsFromFileSync,
  saveProposalsToFileSync,
  type ProposalsPersistenceData,
} from "@/lib/storage/proposalsPersistence";
import {
  getQueueIdsForUser,
  getProposalIdsInQueues,
  getProposalQueueId,
  getQueueById,
  assignProposalToQueue as assignToQueue,
} from "./queues";
import { getFundById } from "./fundsStore";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ProposalStatus = "New" | "Assigned" | "In Review" | "Approved" | "Declined";

export type AssignmentType = "direct" | "queue" | "none";

export type ProposalStage =
  | "Seed"
  | "Series A"
  | "Series B"
  | "Growth"
  | "Late Stage"
  | "Grant / Nonprofit";

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
  sector?: string;
  stage?: ProposalStage;
  geography?: string;
  businessModel?: string;
  description?: string;
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

const SEED_PROPOSAL_IDS = new Set([
  "P-101", "P-102", "P-098", "P-099", "P-095", "P-096", "P-090", "P-091", "P-092", "P-103",
]);

/** Load user-created proposals from durable storage and merge into in-memory array. */
function initProposalsFromFile(): void {
  const data = loadProposalsFromFileSync();
  // Remove existing user-created from proposals (keep seed only)
  for (let i = proposals.length - 1; i >= 0; i--) {
    if (!SEED_PROPOSAL_IDS.has(proposals[i].id)) {
      proposals.splice(i, 1);
    }
  }
  // Add user-created from file
  for (const p of data.userCreated) {
    proposals.push(p);
  }
}

/** Persist user-created proposals to durable storage. */
function persistProposals(): void {
  const userCreated = proposals.filter((p) => !SEED_PROPOSAL_IDS.has(p.id));
  const data: ProposalsPersistenceData = { userCreated };
  saveProposalsToFileSync(data);
}

function filterProposalsForProduction<T extends { id: string }>(items: T[]): T[] {
  if (!productionMode) return items;
  return items.filter((p) => !SEED_PROPOSAL_IDS.has(p.id));
}

function nextProposalId(): string {
  const numericIds = proposals
    .map((p) => {
      const m = p.id.match(/^P-(\d+)$/);
      return m ? parseInt(m[1], 10) : 0;
    })
    .filter((n) => n > 0);
  const max = numericIds.length ? Math.max(...numericIds) : 103;
  return `P-${max + 1}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Proposal
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateProposalInput {
  name: string;
  company?: string;
  sector?: string;
  stage?: ProposalStage;
  geography?: string;
  businessModel?: string;
  amountRequested?: number;
  fundId?: string;
  description?: string;
}

export interface CreateProposalResult {
  ok: boolean;
  proposal?: Proposal;
  error?: string;
}

export function createProposal(
  tenantId: string,
  input: CreateProposalInput
): CreateProposalResult {
  initProposalsFromFile();
  const name = (input.name ?? "").trim();
  if (!name) {
    return { ok: false, error: "Proposal name is required" };
  }

  const company = (input.company ?? "").trim();
  if (!company) {
    return { ok: false, error: "Company / Applicant name is required" };
  }

  const amountRequested =
    typeof input.amountRequested === "number" && !Number.isNaN(input.amountRequested)
      ? input.amountRequested
      : undefined;
  if (amountRequested === undefined || amountRequested < 0) {
    return { ok: false, error: "Requested amount is required and must be a valid number" };
  }

  if (!input.fundId || !input.fundId.trim()) {
    return { ok: false, error: "Fund is required" };
  }

  const fund = getFundById(tenantId, input.fundId);
  if (!fund) {
    return { ok: false, error: "Fund not found" };
  }
  const fundName = fund.name;

  const id = nextProposalId();
  const today = new Date().toISOString().slice(0, 10);

  const proposal: Proposal = {
    id,
    name,
    applicant: company,
    fund: fundName,
    amount: amountRequested,
    status: "New",
    assignedToUserId: null,
    assignedToName: null,
    tenantId,
    submittedAt: today,
    dueDate: null,
    priority: "Medium",
    sector: input.sector?.trim() || undefined,
    stage: input.stage,
    geography: input.geography?.trim() || undefined,
    businessModel: input.businessModel?.trim() || undefined,
    description: input.description?.trim() || undefined,
  };

  proposals.push(proposal);
  persistProposals();
  return { ok: true, proposal };
}

// ─────────────────────────────────────────────────────────────────────────────
// Service Functions
// ─────────────────────────────────────────────────────────────────────────────

export interface ListProposalsParams {
  tenantId: string;
  userId: string;
  role: string;
}

export function listProposalsForUser(params: ListProposalsParams): Proposal[] {
  initProposalsFromFile();
  const { tenantId, userId, role } = params;

  let tenantProposals = proposals.filter((p) => p.tenantId === tenantId);
  tenantProposals = filterProposalsForProduction(tenantProposals);

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
  initProposalsFromFile();
  const { tenantId, role } = params;

  let tenantProposals = proposals.filter((p) => p.tenantId === tenantId);
  tenantProposals = filterProposalsForProduction(tenantProposals);

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
  initProposalsFromFile();
  const { tenantId, userId, role, proposalId } = params;

  const proposal = proposals.find((p) => p.id === proposalId);

  if (!proposal) {
    return { proposal: null, accessDenied: false };
  }

  if (productionMode && SEED_PROPOSAL_IDS.has(proposal.id)) {
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
  initProposalsFromFile();
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
  initProposalsFromFile();
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

  if (!SEED_PROPOSAL_IDS.has(proposalId)) {
    persistProposals();
  }

  return {
    ok: true,
    assignedToUserId: assignToUserId,
    assignedQueueId: assignToQueueId,
    dueDate: proposal.dueDate,
  };
}

export function getProposalById(proposalId: string): Proposal | undefined {
  initProposalsFromFile();
  return proposals.find((p) => p.id === proposalId);
}
