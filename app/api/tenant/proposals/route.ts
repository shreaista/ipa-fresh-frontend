import { NextRequest, NextResponse } from "next/server";
import {
  requireSession,
  requireUserRole,
  requireTenant,
  jsonError,
} from "@/lib/authz";
import {
  createProposal,
  type ProposalStage,
} from "@/lib/mock/proposals";

const demoProposals = [
  { id: "P-101", name: "Community Arts Program", applicant: "Arts Alliance", fund: "General Fund", amount: 45000, status: "New", assessorId: null, tenantId: "demo-tenant" },
  { id: "P-102", name: "Youth Sports Initiative", applicant: "Sports Foundation", fund: "Youth Programs", amount: 32000, status: "New", assessorId: null, tenantId: "demo-tenant" },
  { id: "P-098", name: "Green Energy Project", applicant: "Eco Solutions", fund: "Innovation Grant", amount: 78000, status: "Assigned", assessorId: "user-assessor-1", tenantId: "demo-tenant" },
  { id: "P-099", name: "Digital Literacy Program", applicant: "Tech For All", fund: "Community Dev", amount: 25000, status: "Assigned", assessorId: "user-assessor-2", tenantId: "demo-tenant" },
  { id: "P-095", name: "Senior Wellness Center", applicant: "Elder Care Co", fund: "Healthcare Init", amount: 120000, status: "In Review", assessorId: "user-assessor-1", tenantId: "demo-tenant" },
  { id: "P-096", name: "Food Security Network", applicant: "Hunger Relief", fund: "Emergency Reserve", amount: 55000, status: "In Review", assessorId: "user-assessor-2", tenantId: "demo-tenant" },
  { id: "P-090", name: "Healthcare Access", applicant: "Health First", fund: "Healthcare Init", amount: 150000, status: "Approved", assessorId: "user-assessor-1", tenantId: "demo-tenant" },
];

export async function GET() {
  try {
    const user = await requireSession();
    requireUserRole(user, ["tenant_admin", "saas_admin"]);
    const tenantId = requireTenant(user);

    const proposals = demoProposals.filter((p) => p.tenantId === tenantId);

    return NextResponse.json({
      ok: true,
      data: { proposals },
    });
  } catch (error) {
    return jsonError(error);
  }
}

const VALID_STAGES: ProposalStage[] = ["Seed", "Series A", "Series B", "Growth"];

export async function POST(request: NextRequest) {
  try {
    const user = await requireSession();
    requireUserRole(user, ["tenant_admin", "saas_admin"]);
    const tenantId = requireTenant(user);

    const body = await request.json();
    const name = body?.name;
    const company = body?.company;
    const sector = body?.sector;
    const stage = body?.stage;
    const amountRequested = body?.amountRequested;
    const fundId = body?.fundId;
    const description = body?.description;

    const result = createProposal(tenantId, {
      name: typeof name === "string" ? name : "",
      company: typeof company === "string" ? company : undefined,
      sector: typeof sector === "string" ? sector : undefined,
      stage: VALID_STAGES.includes(stage) ? stage : undefined,
      amountRequested:
        typeof amountRequested === "number" && !Number.isNaN(amountRequested)
          ? amountRequested
          : undefined,
      fundId: typeof fundId === "string" && fundId ? fundId : undefined,
      description: typeof description === "string" ? description : undefined,
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error || "Failed to create proposal" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: { proposal: result.proposal },
    });
  } catch (error) {
    return jsonError(error);
  }
}
