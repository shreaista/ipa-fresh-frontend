import { requireRoleWithTenantContext } from "@/lib/authz";
import { listProposalsWithAssignmentForUser } from "@/lib/mock/proposals";
import ProposalsClient from "./ProposalsClient";

export default async function ProposalsPage() {
  const { user, tenantId } = await requireRoleWithTenantContext(["tenant_admin", "saas_admin", "fund_manager", "assessor", "viewer"]);

  const proposals = listProposalsWithAssignmentForUser({
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
