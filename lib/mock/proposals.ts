import "server-only";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ProposalStatus = "New" | "Assigned" | "In Review" | "Approved" | "Declined";

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
    return tenantProposals.filter((p) => p.assignedToUserId === userId);
  }

  return [];
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
    return { proposal: null, accessDenied: true };
  }

  return { proposal: null, accessDenied: true };
}
