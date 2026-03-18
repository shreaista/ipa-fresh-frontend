import { requirePermissionWithTenantContext, PROPOSAL_READ } from "@/lib/authz";
import { getProposalForUser } from "@/lib/mock/proposals";
import { getProposalQueueId, getQueueById } from "@/lib/mock/queues";
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
    return <ProposalDetailClient proposal={null} canAssign={false} isReadOnly={false} error="Not authorized to view this proposal" />;
  }

  if (!result.proposal) {
    return <ProposalDetailClient proposal={null} canAssign={false} isReadOnly={false} error="Proposal not found" />;
  }

  // Check if user can assign (tenant_admin, saas_admin, or fund_manager) - not viewer
  const canAssign = ["tenant_admin", "saas_admin", "fund_manager"].includes(user.role);

  // Check if user can manage documents (upload/delete) - not viewer
  const canManageDocuments = !["viewer"].includes(user.role) && ["tenant_admin", "saas_admin", "assessor", "fund_manager"].includes(user.role);

  const isReadOnly = user.role === "viewer";

  // Get current queue assignment if any
  const queueId = getProposalQueueId(result.proposal.id);
  const queue = queueId ? getQueueById(queueId) : null;
  const currentAssignment = {
    assignedToUserId: result.proposal.assignedToUserId,
    assignedToName: result.proposal.assignedToName,
    assignedQueueId: queueId,
    assignedQueueName: queue?.name || null,
  };

  return (
    <ProposalDetailClient
      proposal={result.proposal}
      canAssign={canAssign}
      canManageDocuments={canManageDocuments}
      isReadOnly={isReadOnly}
      currentAssignment={currentAssignment}
    />
  );
}
