"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, StatCard, DataCard, StatusBadge, EmptyState } from "@/components/app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import {
  Search,
  MoreHorizontal,
  Eye,
  UserPlus,
  MessageSquare,
  CheckCircle,
  XCircle,
  FileText,
  Clock,
  AlertTriangle,
  Filter,
  ChevronDown,
  Download,
  LucideIcon,
  AlertCircle,
  User,
  Users,
  Loader2,
} from "lucide-react";
import type { ProposalWithAssignment, ProposalStatus } from "@/lib/mock/proposals";

type FilterKey = "all" | "new" | "assigned" | "in-review" | "approved" | "declined";

const statusVariants: Record<ProposalStatus, "muted" | "info" | "warning" | "success" | "error"> = {
  New: "muted",
  Assigned: "info",
  "In Review": "warning",
  Approved: "success",
  Declined: "error",
};

const statusIcons: Record<ProposalStatus, LucideIcon> = {
  New: FileText,
  Assigned: UserPlus,
  "In Review": Clock,
  Approved: CheckCircle,
  Declined: XCircle,
};

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(amount);
}

interface Assessor {
  id: string;
  name: string;
  email: string;
}

interface Queue {
  id: string;
  name: string;
  description?: string;
  isActive?: boolean;
}

interface ProposalsClientProps {
  proposals: ProposalWithAssignment[];
  error?: string;
  role?: string;
  proposalCount?: number;
}

interface AssignProposalParams {
  proposalId: string;
  assessorId: string;
  queueId: string;
  dueDate?: string | null;
}

async function assignProposal(
  params: AssignProposalParams
): Promise<{ ok: boolean; error?: string; data?: { proposalId: string; assessorId?: string; queueId?: string; dueDate?: string } }> {
  const { proposalId, assessorId, queueId, dueDate } = params;
  try {
    const res = await fetch(`/api/tenant/proposals/${proposalId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ assessorId, queueId, dueDate }),
    });
    const data = await res.json();
    return data;
  } catch {
    return { ok: false, error: "Network error" };
  }
}

async function fetchAssessors(): Promise<{ ok: boolean; data?: Assessor[]; error?: string }> {
  try {
    const res = await fetch("/api/tenant/assessors", {
      credentials: "include",
    });
    const data = await res.json();
    if (data.ok && data.data?.assessors) {
      return { ok: true, data: data.data.assessors };
    }
    return { ok: false, error: data.error || "Failed to load assessors" };
  } catch {
    return { ok: false, error: "Network error" };
  }
}

async function fetchQueues(): Promise<{ ok: boolean; data?: Queue[]; error?: string }> {
  try {
    const res = await fetch("/api/tenant/queues", {
      credentials: "include",
    });
    const data = await res.json();
    if (data.ok && data.data?.queues) {
      return { ok: true, data: data.data.queues };
    }
    return { ok: false, error: data.error || "Failed to load queues" };
  } catch {
    return { ok: false, error: "Network error" };
  }
}

export default function ProposalsClient({ proposals, error, role, proposalCount }: ProposalsClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [queueFilter, setQueueFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [, startTransition] = useTransition();
  
  // Assign modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigningProposal, setAssigningProposal] = useState<ProposalWithAssignment | null>(null);
  const [assessors, setAssessors] = useState<Assessor[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [selectedAssessorId, setSelectedAssessorId] = useState<string>("");
  const [selectedQueueId, setSelectedQueueId] = useState<string>("");
  const [selectedDueDate, setSelectedDueDate] = useState<string>("");
  const [loadingData, setLoadingData] = useState(false);
  const [submittingAssignment, setSubmittingAssignment] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const canAssign = role === "tenant_admin" || role === "saas_admin";

  const loadAssignmentData = useCallback(async () => {
    setLoadingData(true);
    setAssignError(null);
    
    const [assessorResult, queueResult] = await Promise.all([
      fetchAssessors(),
      fetchQueues(),
    ]);
    
    if (assessorResult.ok && assessorResult.data) {
      setAssessors(assessorResult.data);
    }
    if (queueResult.ok && queueResult.data) {
      setQueues(queueResult.data.filter((q: Queue) => q.isActive !== false));
    }
    
    if (!assessorResult.ok && !queueResult.ok) {
      setAssignError("Failed to load assignment options");
    }
    
    setLoadingData(false);
  }, []);

  const openAssignModal = useCallback(async (proposal: ProposalWithAssignment) => {
    setAssigningProposal(proposal);
    setSelectedAssessorId("");
    setSelectedQueueId("");
    setSelectedDueDate("");
    setAssignError(null);
    setAssignModalOpen(true);
    await loadAssignmentData();
  }, [loadAssignmentData]);

  const handleAssignSubmit = async () => {
    if (!assigningProposal) return;
    
    if (!selectedAssessorId || !selectedQueueId) {
      setAssignError("Both assessor and queue are required");
      return;
    }
    
    setSubmittingAssignment(true);
    setAssignError(null);
    
    const result = await assignProposal({
      proposalId: assigningProposal.id,
      assessorId: selectedAssessorId,
      queueId: selectedQueueId,
      dueDate: selectedDueDate || null,
    });
    
    if (result.ok) {
      const assessor = assessors.find(a => a.id === selectedAssessorId);
      const queue = queues.find(q => q.id === selectedQueueId);
      toast(`Assigned to ${assessor?.name || "assessor"} in ${queue?.name || "queue"}`);
      setAssignModalOpen(false);
      setAssigningProposal(null);
      startTransition(() => {
        router.refresh();
      });
    } else {
      setAssignError(result.error || "Assignment failed");
    }
    
    setSubmittingAssignment(false);
  };

  const uniqueQueues = Array.from(new Set(proposals.filter(p => p.assignedQueueName).map(p => p.assignedQueueName)));

  const filteredProposals = proposals.filter((p) => {
    const statusKey = p.status.toLowerCase().replace(" ", "-");
    const matchesFilter = filter === "all" || statusKey === filter;
    const matchesQueueFilter = queueFilter === "all" || p.assignedQueueName === queueFilter;
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.applicant.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesQueueFilter && matchesSearch;
  });

  const counts = {
    all: proposals.length,
    new: proposals.filter(p => p.status === "New").length,
    assigned: proposals.filter(p => p.status === "Assigned").length,
    inReview: proposals.filter(p => p.status === "In Review").length,
    approved: proposals.filter(p => p.status === "Approved").length,
  };

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Proposals" subtitle="View and manage all funding proposals" />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const roleLabel = role === "saas_admin" ? "SaaS Admin" :
                    role === "tenant_admin" ? "Tenant Admin" :
                    role === "assessor" ? "Assessor" : role;

  return (
    <div className="space-y-6">
      {role && proposalCount !== undefined && (
        <div className="text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
          Showing <span className="font-medium text-foreground">{proposalCount}</span> proposal{proposalCount !== 1 ? "s" : ""} as <span className="font-medium text-foreground">{roleLabel}</span>
        </div>
      )}

      <PageHeader
        title="Proposals"
        subtitle="View and manage all funding proposals"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Filter by Fund</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>All Funds</DropdownMenuItem>
                <DropdownMenuItem>General Fund</DropdownMenuItem>
                <DropdownMenuItem>Innovation Grant</DropdownMenuItem>
                <DropdownMenuItem>Community Dev</DropdownMenuItem>
                <DropdownMenuItem>Youth Programs</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Proposals"
          value={counts.all}
          description="All time"
          icon={FileText}
        />
        <StatCard
          title="Pending Review"
          value={counts.new + counts.assigned}
          description={`${counts.new} new, ${counts.assigned} assigned`}
          icon={Clock}
        />
        <StatCard
          title="In Review"
          value={counts.inReview}
          description="Active assessments"
          trend="neutral"
          icon={AlertTriangle}
        />
        <StatCard
          title="Approved (MTD)"
          value={counts.approved}
          description="+3 from last month"
          trend="up"
          icon={CheckCircle}
        />
      </div>

      <DataCard title="All Proposals" noPadding>
        <div className="p-4 border-b space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
              <TabsList>
                <TabsTrigger value="all">
                  All
                  <span className="ml-1.5 text-xs text-muted-foreground">({counts.all})</span>
                </TabsTrigger>
                <TabsTrigger value="new">
                  New
                  <span className="ml-1.5 text-xs text-muted-foreground">({counts.new})</span>
                </TabsTrigger>
                <TabsTrigger value="assigned">
                  Assigned
                </TabsTrigger>
                <TabsTrigger value="in-review">
                  In Review
                </TabsTrigger>
                <TabsTrigger value="approved">
                  Approved
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2">
              {uniqueQueues.length > 0 && (
                <Select value={queueFilter} onValueChange={setQueueFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Filter by queue" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Queues</SelectItem>
                    {uniqueQueues.map((queueName) => (
                      <SelectItem key={queueName} value={queueName!}>
                        {queueName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="relative w-full lg:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search proposals..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {filteredProposals.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No proposals found"
            description="Try adjusting your search or filter criteria"
            action={{ label: "Clear filters", onClick: () => { setFilter("all"); setQueueFilter("all"); setSearch(""); } }}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Proposal</TableHead>
                <TableHead className="hidden md:table-cell">Fund</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Assessor</TableHead>
                <TableHead className="hidden lg:table-cell">Queue</TableHead>
                <TableHead className="hidden sm:table-cell">Due</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProposals.map((proposal) => {
                const StatusIcon = statusIcons[proposal.status];
                return (
                  <TableRow
                    key={proposal.id}
                    className="group cursor-pointer"
                    onClick={() => router.push(`/dashboard/proposals/${proposal.id}`)}
                  >
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">{proposal.id}</span>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{proposal.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{proposal.applicant}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className="font-normal">
                        {proposal.fund}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium tabular-nums">{formatAmount(proposal.amount)}</span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        variant={statusVariants[proposal.status]}
                        icon={StatusIcon}
                      >
                        {proposal.status}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {proposal.assignedToName ? (
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                            {proposal.assignedToName.split(" ").map(n => n[0]).join("")}
                          </div>
                          <span className="text-sm">{proposal.assignedToName}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {proposal.assignedQueueName ? (
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <Users className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <span className="text-sm">{proposal.assignedQueueName}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {proposal.dueDate ? (
                        <StatusBadge variant="warning">
                          {proposal.dueDate}
                        </StatusBadge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/proposals/${proposal.id}`)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Open
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <FileText className="h-4 w-4 mr-2" />
                            View Documents
                          </DropdownMenuItem>
                          {canAssign && (proposal.status === "New" || proposal.assignmentType === "none") && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openAssignModal(proposal);
                                }}
                              >
                                <UserPlus className="h-4 w-4 mr-2" />
                                Assign
                              </DropdownMenuItem>
                            </>
                          )}
                          {proposal.status === "In Review" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-emerald-600">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">
                                <XCircle className="h-4 w-4 mr-2" />
                                Decline
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Add Comment
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </DataCard>

      {/* Assign Modal */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Proposal</DialogTitle>
            <DialogDescription>
              {assigningProposal && (
                <>
                  Assign <span className="font-medium">{assigningProposal.name}</span> to an assessor and queue.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {loadingData ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading options...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="assessor-select" className="text-sm font-medium">
                    Assessor <span className="text-destructive">*</span>
                  </label>
                  {assessors.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground border rounded-md">
                      <User className="h-6 w-6 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No assessors available</p>
                    </div>
                  ) : (
                    <Select value={selectedAssessorId} onValueChange={setSelectedAssessorId}>
                      <SelectTrigger id="assessor-select">
                        <SelectValue placeholder="Choose an assessor..." />
                      </SelectTrigger>
                      <SelectContent>
                        {assessors.map((assessor) => (
                          <SelectItem key={assessor.id} value={assessor.id}>
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                                {assessor.name.split(" ").map(n => n[0]).join("")}
                              </div>
                              <div>
                                <span className="font-medium">{assessor.name}</span>
                                <span className="text-muted-foreground ml-2 text-xs">{assessor.email}</span>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="queue-select" className="text-sm font-medium">
                    Queue <span className="text-destructive">*</span>
                  </label>
                  {queues.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground border rounded-md">
                      <Users className="h-6 w-6 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No queues available</p>
                    </div>
                  ) : (
                    <Select value={selectedQueueId} onValueChange={setSelectedQueueId}>
                      <SelectTrigger id="queue-select">
                        <SelectValue placeholder="Choose a queue..." />
                      </SelectTrigger>
                      <SelectContent>
                        {queues.map((queue) => (
                          <SelectItem key={queue.id} value={queue.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{queue.name}</span>
                              {queue.description && (
                                <span className="text-muted-foreground text-xs">{queue.description}</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="due-date" className="text-sm font-medium">
                    Due Date (optional)
                  </label>
                  <input
                    id="due-date"
                    type="date"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={selectedDueDate}
                    onChange={(e) => setSelectedDueDate(e.target.value)}
                  />
                </div>

                {assignError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{assignError}</AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignModalOpen(false)}
              disabled={submittingAssignment}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignSubmit}
              disabled={
                !selectedAssessorId ||
                !selectedQueueId ||
                submittingAssignment ||
                loadingData
              }
            >
              {submittingAssignment ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
