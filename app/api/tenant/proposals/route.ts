import { NextRequest, NextResponse } from "next/server";
import {
  requireSession,
  requireUserRole,
  requireTenant,
  jsonError,
} from "@/lib/authz";
import {
  createProposal,
  listProposalsWithAssignmentForUser,
  type ProposalStage,
} from "@/lib/mock/proposals";
import { PROPOSALS_FILE_PATH } from "@/lib/storage/proposalsPersistence";

const STORAGE_SOURCE = `proposalsStore (durable JSON: ${PROPOSALS_FILE_PATH})`;

export async function GET(request: NextRequest) {
  try {
    const user = await requireSession();
    requireUserRole(user, ["tenant_admin", "saas_admin"]);
    const tenantId = requireTenant(user);

    const proposals = listProposalsWithAssignmentForUser({
      tenantId,
      userId: user.userId ?? "",
      role: user.role ?? "tenant_admin",
    });

    const rawCount = proposals.length;
    const proposalIds = proposals.map((p) => p.id);
    const proposalNames = proposals.map((p) => p.name);

    console.log("[Proposals API] GET", {
      tenantId,
      source: STORAGE_SOURCE,
      rawCount,
      proposalIds,
      proposalNames,
    });

    const debug = request.nextUrl.searchParams.get("debug") === "1";
    if (debug) {
      return NextResponse.json({
        ok: true,
        tenantId,
        source: STORAGE_SOURCE,
        count: rawCount,
        proposals: proposals.map((p) => ({ id: p.id, name: p.name, status: p.status, applicant: p.applicant })),
      });
    }

    return NextResponse.json({
      ok: true,
      data: { proposals },
    });
  } catch (error) {
    return jsonError(error);
  }
}

const VALID_STAGES: ProposalStage[] = [
  "Seed",
  "Series A",
  "Series B",
  "Growth",
  "Late Stage",
  "Grant / Nonprofit",
];

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
    const geography = body?.geography;
    const businessModel = body?.businessModel;
    const amountRequested = body?.amountRequested;
    const fundId = body?.fundId;
    const description = body?.description;

    const incomingPayload = {
      name,
      company,
      sector,
      stage,
      geography,
      businessModel,
      amountRequested,
      fundId,
      description,
    };

    console.log("[Proposals API] POST", {
      tenantId,
      incomingPayload,
      storageDestination: PROPOSALS_FILE_PATH,
    });

    const result = createProposal(tenantId, {
      name: typeof name === "string" ? name : "",
      company: typeof company === "string" ? company : undefined,
      sector: typeof sector === "string" ? sector : undefined,
      stage: VALID_STAGES.includes(stage) ? stage : undefined,
      geography: typeof geography === "string" ? geography : undefined,
      businessModel: typeof businessModel === "string" ? businessModel : undefined,
      amountRequested:
        typeof amountRequested === "number" && !Number.isNaN(amountRequested)
          ? amountRequested
          : undefined,
      fundId: typeof fundId === "string" && fundId ? fundId : undefined,
      description: typeof description === "string" ? description : undefined,
    });

    if (!result.ok) {
      console.error("[Proposals API] POST create failure:", result.error);
      return NextResponse.json(
        { ok: false, error: result.error || "Failed to create proposal" },
        { status: 400 }
      );
    }

    const createdProposalId = result.proposal?.id;
    const createdProposalName = result.proposal?.name;
    const persistedCount = listProposalsWithAssignmentForUser({
      tenantId,
      userId: user.userId ?? "",
      role: user.role ?? "tenant_admin",
    }).length;

    console.log("[Proposals API] POST success", {
      tenantId,
      createdProposalId,
      createdProposalName,
      storageDestination: PROPOSALS_FILE_PATH,
      persistedTotalCount: persistedCount,
    });

    return NextResponse.json({
      ok: true,
      data: { proposal: result.proposal },
    });
  } catch (error) {
    return jsonError(error);
  }
}
