import "server-only";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type FundMandateStatus = "draft" | "active" | "inactive";

export interface FundMandateTemplate {
  id: string;
  tenantId: string;
  name: string;
  strategy: string;
  geography: string;
  minTicket: number;
  maxTicket: number;
  status: FundMandateStatus;
  version: number;
  updatedAt: string;
  updatedByUserId: string;
  notes?: string;
}

export interface CreateFundMandateInput {
  name: string;
  strategy: string;
  geography: string;
  minTicket: number;
  maxTicket: number;
  notes?: string;
}

export interface UpdateFundMandateInput {
  name?: string;
  strategy?: string;
  geography?: string;
  minTicket?: number;
  maxTicket?: number;
  notes?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data Store
// ─────────────────────────────────────────────────────────────────────────────

const fundMandates: FundMandateTemplate[] = [
  {
    id: "fm-001",
    tenantId: "tenant-001",
    name: "Growth Equity Mandate",
    strategy: "Growth Equity",
    geography: "North America",
    minTicket: 500000,
    maxTicket: 5000000,
    status: "active",
    version: 2,
    updatedAt: "2026-02-15T10:30:00Z",
    updatedByUserId: "user-002",
    notes: "Focus on Series B and C stage companies",
  },
  {
    id: "fm-002",
    tenantId: "tenant-001",
    name: "Impact Investing Template",
    strategy: "Impact",
    geography: "Global",
    minTicket: 100000,
    maxTicket: 1000000,
    status: "draft",
    version: 1,
    updatedAt: "2026-03-01T14:00:00Z",
    updatedByUserId: "user-002",
    notes: "ESG-focused investments only",
  },
];

let nextId = 3;

// ─────────────────────────────────────────────────────────────────────────────
// Service Functions
// ─────────────────────────────────────────────────────────────────────────────

export function listFundMandates(tenantId: string): FundMandateTemplate[] {
  return fundMandates.filter((fm) => fm.tenantId === tenantId);
}

export function getFundMandateById(
  tenantId: string,
  id: string
): FundMandateTemplate | undefined {
  return fundMandates.find((fm) => fm.id === id && fm.tenantId === tenantId);
}

export interface CreateFundMandateResult {
  ok: boolean;
  mandate?: FundMandateTemplate;
  error?: string;
}

export function createFundMandate(
  tenantId: string,
  input: CreateFundMandateInput,
  actorUserId: string
): CreateFundMandateResult {
  if (!input.name || !input.strategy || !input.geography) {
    return { ok: false, error: "Missing required fields" };
  }

  if (input.minTicket < 0 || input.maxTicket < 0) {
    return { ok: false, error: "Ticket amounts must be positive" };
  }

  if (input.minTicket > input.maxTicket) {
    return { ok: false, error: "Min ticket cannot exceed max ticket" };
  }

  const newMandate: FundMandateTemplate = {
    id: `fm-${String(nextId++).padStart(3, "0")}`,
    tenantId,
    name: input.name,
    strategy: input.strategy,
    geography: input.geography,
    minTicket: input.minTicket,
    maxTicket: input.maxTicket,
    status: "draft",
    version: 1,
    updatedAt: new Date().toISOString(),
    updatedByUserId: actorUserId,
    notes: input.notes,
  };

  fundMandates.push(newMandate);

  return { ok: true, mandate: newMandate };
}

export interface UpdateFundMandateResult {
  ok: boolean;
  mandate?: FundMandateTemplate;
  error?: string;
}

export function updateFundMandate(
  tenantId: string,
  id: string,
  patch: UpdateFundMandateInput,
  actorUserId: string
): UpdateFundMandateResult {
  const mandate = fundMandates.find(
    (fm) => fm.id === id && fm.tenantId === tenantId
  );

  if (!mandate) {
    return { ok: false, error: "Fund mandate not found" };
  }

  if (patch.name !== undefined) mandate.name = patch.name;
  if (patch.strategy !== undefined) mandate.strategy = patch.strategy;
  if (patch.geography !== undefined) mandate.geography = patch.geography;
  if (patch.minTicket !== undefined) mandate.minTicket = patch.minTicket;
  if (patch.maxTicket !== undefined) mandate.maxTicket = patch.maxTicket;
  if (patch.notes !== undefined) mandate.notes = patch.notes;

  if (mandate.minTicket > mandate.maxTicket) {
    return { ok: false, error: "Min ticket cannot exceed max ticket" };
  }

  mandate.version += 1;
  mandate.updatedAt = new Date().toISOString();
  mandate.updatedByUserId = actorUserId;

  return { ok: true, mandate };
}

export interface SetFundMandateStatusResult {
  ok: boolean;
  mandate?: FundMandateTemplate;
  error?: string;
}

export function setFundMandateStatus(
  tenantId: string,
  id: string,
  status: FundMandateStatus,
  actorUserId: string
): SetFundMandateStatusResult {
  const mandate = fundMandates.find(
    (fm) => fm.id === id && fm.tenantId === tenantId
  );

  if (!mandate) {
    return { ok: false, error: "Fund mandate not found" };
  }

  mandate.status = status;
  mandate.version += 1;
  mandate.updatedAt = new Date().toISOString();
  mandate.updatedByUserId = actorUserId;

  return { ok: true, mandate };
}
