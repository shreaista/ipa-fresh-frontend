import "server-only";
import { productionMode } from "@/lib/config/productionMode";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Fund {
  id: string;
  tenantId: string;
  name: string;
  code?: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface FundMandateLink {
  id: string;
  fundId: string;
  mandateId: string;
  tenantId: string;
  linkedAt: string;
  linkedByUserId: string;
}

export interface CreateFundInput {
  name: string;
  code?: string;
}

export interface UpdateFundInput {
  name?: string;
  code?: string;
  status?: "active" | "inactive";
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data Store
// ─────────────────────────────────────────────────────────────────────────────

const funds: Fund[] = [
  {
    id: "fund-001",
    tenantId: "tenant-001",
    name: "General Fund 2026",
    code: "GF26",
    status: "active",
    createdAt: "2026-01-15T10:00:00Z",
    updatedAt: "2026-01-15T10:00:00Z",
  },
  {
    id: "fund-002",
    tenantId: "tenant-001",
    name: "Innovation Grant",
    code: "IG26",
    status: "active",
    createdAt: "2026-02-01T10:00:00Z",
    updatedAt: "2026-02-01T10:00:00Z",
  },
  {
    id: "fund-003",
    tenantId: "tenant-001",
    name: "Community Development",
    code: "CD26",
    status: "active",
    createdAt: "2026-02-15T10:00:00Z",
    updatedAt: "2026-02-15T10:00:00Z",
  },
  {
    id: "fund-004",
    tenantId: "tenant-001",
    name: "Youth Programs",
    status: "active",
    createdAt: "2026-03-01T10:00:00Z",
    updatedAt: "2026-03-01T10:00:00Z",
  },
  {
    id: "fund-005",
    tenantId: "tenant-002",
    name: "Beta Grants Fund",
    code: "BG26",
    status: "active",
    createdAt: "2026-01-20T10:00:00Z",
    updatedAt: "2026-01-20T10:00:00Z",
  },
  {
    id: "F-001",
    tenantId: "tenant-001",
    name: "Primary Investment Fund",
    code: "PIF",
    status: "active",
    createdAt: "2026-01-10T10:00:00Z",
    updatedAt: "2026-01-10T10:00:00Z",
  },
  {
    id: "F-002",
    tenantId: "tenant-001",
    name: "Secondary Growth Fund",
    code: "SGF",
    status: "active",
    createdAt: "2026-01-12T10:00:00Z",
    updatedAt: "2026-01-12T10:00:00Z",
  },
];

const fundMandateLinks: FundMandateLink[] = [
  {
    id: "link-001",
    fundId: "fund-001",
    mandateId: "fm-001",
    tenantId: "tenant-001",
    linkedAt: "2026-02-01T10:00:00Z",
    linkedByUserId: "user-001",
  },
  {
    id: "link-002",
    fundId: "fund-002",
    mandateId: "fm-002",
    tenantId: "tenant-001",
    linkedAt: "2026-02-15T10:00:00Z",
    linkedByUserId: "user-001",
  },
  {
    id: "link-003",
    fundId: "F-001",
    mandateId: "fm-001",
    tenantId: "tenant-001",
    linkedAt: "2026-02-20T10:00:00Z",
    linkedByUserId: "user-001",
  },
  {
    id: "link-004",
    fundId: "F-002",
    mandateId: "fm-002",
    tenantId: "tenant-001",
    linkedAt: "2026-02-22T10:00:00Z",
    linkedByUserId: "user-001",
  },
];

let nextFundId = 8;
let nextLinkId = 5;

// Seed fund IDs (hidden in production mode)
const SEED_FUND_IDS = new Set([
  "fund-001",
  "fund-002",
  "fund-003",
  "fund-004",
  "fund-005",
  "F-001",
  "F-002",
]);

// ─────────────────────────────────────────────────────────────────────────────
// Fund CRUD Operations
// ─────────────────────────────────────────────────────────────────────────────

/** Returns funds visible for the given tenant (same scope used by list and create). */
function getVisibleFundsForTenant(tenantId: string): Fund[] {
  const byTenant = funds.filter((f) => f.tenantId === tenantId);
  if (productionMode) {
    return byTenant.filter((f) => !SEED_FUND_IDS.has(f.id));
  }
  return byTenant;
}

export function listFunds(tenantId: string): Fund[] {
  return getVisibleFundsForTenant(tenantId);
}

export function getFundById(tenantId: string, fundId: string): Fund | undefined {
  return funds.find((f) => f.id === fundId && f.tenantId === tenantId);
}

export interface CreateFundResult {
  ok: boolean;
  fund?: Fund;
  error?: string;
}

export function createFund(
  tenantId: string,
  input: CreateFundInput
): CreateFundResult {
  if (!input.name || input.name.trim().length === 0) {
    return { ok: false, error: "Fund name is required" };
  }

  // Use same visible scope as listFunds so create/check and list are aligned
  const visibleFunds = getVisibleFundsForTenant(tenantId);
  const existingFund = visibleFunds.find(
    (f) => f.name.toLowerCase() === input.name.trim().toLowerCase()
  );
  if (existingFund) {
    return { ok: false, error: "A fund with this name already exists" };
  }

  const now = new Date().toISOString();
  const newFund: Fund = {
    id: `fund-${String(nextFundId++).padStart(3, "0")}`,
    tenantId,
    name: input.name.trim(),
    code: input.code?.trim() || undefined,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  funds.push(newFund);
  return { ok: true, fund: newFund };
}

export interface UpdateFundResult {
  ok: boolean;
  fund?: Fund;
  error?: string;
}

export function updateFund(
  tenantId: string,
  fundId: string,
  input: UpdateFundInput
): UpdateFundResult {
  const fund = funds.find((f) => f.id === fundId && f.tenantId === tenantId);
  if (!fund) {
    return { ok: false, error: "Fund not found" };
  }

  if (input.name !== undefined) {
    if (input.name.trim().length === 0) {
      return { ok: false, error: "Fund name cannot be empty" };
    }
    const duplicate = funds.find(
      (f) =>
        f.tenantId === tenantId &&
        f.id !== fundId &&
        f.name.toLowerCase() === input.name!.toLowerCase()
    );
    if (duplicate) {
      return { ok: false, error: "A fund with this name already exists" };
    }
    fund.name = input.name.trim();
  }

  if (input.code !== undefined) {
    fund.code = input.code?.trim() || undefined;
  }

  if (input.status !== undefined) {
    fund.status = input.status;
  }

  fund.updatedAt = new Date().toISOString();
  return { ok: true, fund };
}

export function deleteFund(tenantId: string, fundId: string): boolean {
  const index = funds.findIndex((f) => f.id === fundId && f.tenantId === tenantId);
  if (index === -1) {
    return false;
  }

  funds.splice(index, 1);

  const linkIndexes = fundMandateLinks
    .map((l, i) => (l.fundId === fundId && l.tenantId === tenantId ? i : -1))
    .filter((i) => i !== -1)
    .reverse();
  for (const i of linkIndexes) {
    fundMandateLinks.splice(i, 1);
  }

  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fund-Mandate Link Operations
// ─────────────────────────────────────────────────────────────────────────────

export function getLinkedMandates(tenantId: string, fundId: string): string[] {
  return fundMandateLinks
    .filter((l) => l.fundId === fundId && l.tenantId === tenantId)
    .map((l) => l.mandateId);
}

export function getFundMandateLinks(tenantId: string, fundId: string): FundMandateLink[] {
  return fundMandateLinks.filter((l) => l.fundId === fundId && l.tenantId === tenantId);
}

export interface LinkMandateResult {
  ok: boolean;
  link?: FundMandateLink;
  error?: string;
}

export function linkMandateToFund(
  tenantId: string,
  fundId: string,
  mandateId: string,
  userId: string
): LinkMandateResult {
  const fund = funds.find((f) => f.id === fundId && f.tenantId === tenantId);
  if (!fund) {
    return { ok: false, error: "Fund not found" };
  }

  const existing = fundMandateLinks.find(
    (l) => l.fundId === fundId && l.mandateId === mandateId && l.tenantId === tenantId
  );
  if (existing) {
    return { ok: false, error: "Mandate is already linked to this fund" };
  }

  const newLink: FundMandateLink = {
    id: `link-${String(nextLinkId++).padStart(3, "0")}`,
    fundId,
    mandateId,
    tenantId,
    linkedAt: new Date().toISOString(),
    linkedByUserId: userId,
  };

  fundMandateLinks.push(newLink);
  return { ok: true, link: newLink };
}

export function unlinkMandateFromFund(
  tenantId: string,
  fundId: string,
  mandateId: string
): boolean {
  const index = fundMandateLinks.findIndex(
    (l) => l.fundId === fundId && l.mandateId === mandateId && l.tenantId === tenantId
  );
  if (index === -1) {
    return false;
  }

  fundMandateLinks.splice(index, 1);
  return true;
}

export function getMandateFunds(tenantId: string, mandateId: string): string[] {
  return fundMandateLinks
    .filter((l) => l.mandateId === mandateId && l.tenantId === tenantId)
    .map((l) => l.fundId);
}
