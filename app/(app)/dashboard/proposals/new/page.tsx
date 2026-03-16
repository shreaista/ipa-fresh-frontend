import { requirePermissionWithTenantContext, PROPOSAL_CREATE } from "@/lib/authz";
import { listFunds, type Fund } from "@/lib/mock/fundsStore";
import NewProposalClient from "./NewProposalClient";

export default async function NewProposalPage() {
  const { tenantId } = await requirePermissionWithTenantContext(PROPOSAL_CREATE);

  const funds: Fund[] = listFunds(tenantId);
  console.log("[NewProposal Page] SSR funds, tenantId:", tenantId, "count:", funds.length, "ids:", funds.map((f) => f.id));

  return <NewProposalClient initialFunds={funds} />;
}
