import { requirePermissionWithTenantContext, PROPOSAL_READ } from "@/lib/authz";
import { listProposalsForUser } from "@/lib/mock/proposals";
import ProposalsClient from "./ProposalsClient";

export default async function ProposalsPage() {
  const { user, tenantId } = await requirePermissionWithTenantContext(PROPOSAL_READ);

  const proposals = listProposalsForUser({
    tenantId,
    userId: user.userId,
    role: user.role,
  });

  return (
    <ProposalsClient
      proposals={proposals}
      role={user.role}
      proposalCount={proposals.length}
    />
  );
}
