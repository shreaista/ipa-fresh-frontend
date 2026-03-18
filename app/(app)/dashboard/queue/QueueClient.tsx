"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, StatCard, DataCard, StatusBadge, EmptyState } from "@/components/app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  ArrowRight,
  Target,
  CheckCircle,
  AlertTriangle,
  Users,
  User,
  Play,
} from "lucide-react";
import type { ProposalWithAssignment, ProposalStatus } from "@/lib/mock/proposals";

type FilterKey = "all" | "high" | "direct" | "queue";

interface QueueClientProps {
  proposals: ProposalWithAssignment[];
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(amount);
}

const statusVariants: Record<ProposalStatus, "muted" | "info" | "warning" | "success" | "error"> = {
  New: "muted",
  Assigned: "info",
  "In Review": "warning",
  Approved: "success",
  Declined: "error",
  Deferred: "muted",
};

export default function QueueClient({ proposals }: QueueClientProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [queueFilter, setQueueFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const uniqueQueues = Array.from(
    new Set(proposals.filter(p => p.assignedQueueName).map(p => p.assignedQueueName))
  );

  const filteredItems = proposals.filter((item) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "high" && item.priority === "High") ||
      (filter === "direct" && item.assignmentType === "direct") ||
      (filter === "queue" && item.assignmentType === "queue");
    const matchesQueueFilter =
      queueFilter === "all" || item.assignedQueueName === queueFilter;
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.applicant.toLowerCase().includes(search.toLowerCase()) ||
      item.id.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesQueueFilter && matchesSearch;
  });

  const highPriorityCount = proposals.filter(q => q.priority === "High").length;
  const directCount = proposals.filter(q => q.assignmentType === "direct").length;
  const queueCount = proposals.filter(q => q.assignmentType === "queue").length;

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
        Showing <span className="font-medium text-foreground">{proposals.length}</span> proposal{proposals.length !== 1 ? "s" : ""} in your queue
      </div>

      <PageHeader
        title="My Queue"
        subtitle="Proposals assigned to you for assessment"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Assigned"
          value={proposals.length}
          description="In your queue"
          icon={Target}
        />
        <StatCard
          title="High Priority"
          value={highPriorityCount}
          description="Requires attention"
          icon={AlertTriangle}
        />
        <StatCard
          title="Direct Assigned"
          value={directCount}
          description="Assigned to you"
          icon={User}
        />
        <StatCard
          title="Via Queue"
          value={queueCount}
          description="From shared queues"
          icon={Users}
        />
      </div>

      <DataCard title="Assessment Queue" noPadding>
        <div className="p-4 border-b">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
              <TabsList>
                <TabsTrigger value="all">
                  All
                  <span className="ml-1.5 text-xs text-muted-foreground">({proposals.length})</span>
                </TabsTrigger>
                <TabsTrigger value="high">
                  High Priority
                </TabsTrigger>
                <TabsTrigger value="direct">
                  Direct
                </TabsTrigger>
                <TabsTrigger value="queue">
                  Via Queue
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
              <div className="relative w-full lg:w-64">
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

        {filteredItems.length === 0 ? (
          <EmptyState
            icon={CheckCircle}
            title="Queue is clear"
            description="No proposals match your current filters"
            action={{ label: "Show all", onClick: () => { setFilter("all"); setQueueFilter("all"); setSearch(""); } }}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proposal</TableHead>
                <TableHead className="hidden md:table-cell">Fund</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="hidden lg:table-cell">Queue</TableHead>
                <TableHead className="hidden sm:table-cell">Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => {
                const isInReview = item.status === "In Review";
                const StatusIcon = isInReview ? Play : undefined;

                return (
                  <TableRow
                    key={item.id}
                    className="group cursor-pointer"
                    onClick={() => router.push(`/dashboard/proposals/${item.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={`w-1 h-10 rounded-full shrink-0 ${
                          item.priority === "High"
                            ? "bg-red-500"
                            : item.priority === "Medium"
                            ? "bg-amber-500"
                            : "bg-slate-300 dark:bg-slate-600"
                        }`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-muted-foreground">{item.id}</span>
                            {item.priority === "High" && (
                              <StatusBadge variant="error" className="text-[10px] px-1 py-0">
                                High
                              </StatusBadge>
                            )}
                          </div>
                          <span className="font-medium">{item.name}</span>
                          <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {item.applicant}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-sm">{item.fund}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium tabular-nums">{formatAmount(item.amount)}</span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {item.assignedQueueName ? (
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <Users className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <span className="text-sm">{item.assignedQueueName}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <span className="text-sm text-muted-foreground">Direct</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {item.dueDate ? (
                        <StatusBadge variant="warning">
                          {item.dueDate}
                        </StatusBadge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        variant={statusVariants[item.status]}
                        icon={StatusIcon}
                      >
                        {item.status}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/dashboard/proposals/${item.id}`);
                        }}
                      >
                        Open
                        <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                      </Button>
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
