"use client";

import { useState } from "react";
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
} from "lucide-react";
import type { Proposal, ProposalStatus } from "@/lib/mock/proposals";

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

interface ProposalsClientProps {
  proposals: Proposal[];
  error?: string;
  role?: string;
  proposalCount?: number;
}

export default function ProposalsClient({ proposals, error, role, proposalCount }: ProposalsClientProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");

  const filteredProposals = proposals.filter((p) => {
    const statusKey = p.status.toLowerCase().replace(" ", "-");
    const matchesFilter = filter === "all" || statusKey === filter;
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.applicant.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
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

        {filteredProposals.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No proposals found"
            description="Try adjusting your search or filter criteria"
            action={{ label: "Clear filters", onClick: () => { setFilter("all"); setSearch(""); } }}
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
                          {proposal.status === "New" && (
                            <DropdownMenuItem>
                              <UserPlus className="h-4 w-4 mr-2" />
                              Assign Assessor
                            </DropdownMenuItem>
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
    </div>
  );
}
