import { requirePermissionWithTenantContext, PROPOSAL_READ } from "@/lib/authz";
import { getProposalForUser } from "@/lib/mock/proposals";
import ProposalDetailClient from "./ProposalDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProposalDetailPage({ params }: PageProps) {
  const { user, tenantId } = await requirePermissionWithTenantContext(PROPOSAL_READ);
  const { id } = await params;

  const result = getProposalForUser({
    tenantId,
    userId: user.userId,
    role: user.role,
    proposalId: id,
  });

  if (result.accessDenied) {
    return <ProposalDetailClient proposal={null} error="Not authorized to view this proposal" />;
  }

  if (!result.proposal) {
    return <ProposalDetailClient proposal={null} error="Proposal not found" />;
  }

  return <ProposalDetailClient proposal={result.proposal} />;
}
