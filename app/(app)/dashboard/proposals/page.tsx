import { requireRoleWithTenantContext } from "@/lib/authz";
import { listProposalsForUser } from "@/lib/mock/proposals";
import ProposalsClient from "./ProposalsClient";

export default async function ProposalsPage() {
  const { user, tenantId } = await requireRoleWithTenantContext(["tenant_admin", "saas_admin"]);

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
