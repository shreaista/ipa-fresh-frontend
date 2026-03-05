"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, StatCard, DataCard, StatusBadge, EmptyState } from "@/components/app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Play,
  Users,
  User,
} from "lucide-react";
import type { ProposalWithAssignment } from "@/lib/mock/proposals";

type PriorityKey = "High" | "Medium" | "Low";
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
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search proposals..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
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
            <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
              <TabsList>
                <TabsTrigger value="all">
                  All
                  <span className="ml-1.5 text-xs text-muted-foreground">({proposals.length})</span>
                </TabsTrigger>
                <TabsTrigger value="high">
                  High
                </TabsTrigger>
                <TabsTrigger value="direct">
                  Direct
                </TabsTrigger>
                <TabsTrigger value="queue">
                  Queue
                </TabsTrigger>
              </TabsList>
            </Tabs>
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
          <div className="divide-y">
            {filteredItems.map((item) => (
              <QueueRow key={item.id} item={item} onOpen={() => router.push(`/dashboard/proposals/${item.id}`)} />
            ))}
          </div>
        )}
      </DataCard>
    </div>
  );
}

interface QueueRowProps {
  item: ProposalWithAssignment;
  onOpen: () => void;
}

function QueueRow({ item, onOpen }: QueueRowProps) {
  const priority = item.priority as PriorityKey;
  const isInReview = item.status === "In Review";

  return (
    <div className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors group">
      <div
        className={`w-1 h-12 rounded-full shrink-0 ${
          priority === "High"
            ? "bg-red-500"
            : priority === "Medium"
            ? "bg-amber-500"
            : "bg-slate-300 dark:bg-slate-600"
        }`}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-xs text-muted-foreground">{item.id}</span>
          <span className="font-medium truncate">{item.name}</span>
          {priority === "High" && (
            <StatusBadge variant="error">
              High
            </StatusBadge>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{item.applicant}</span>
          <span className="text-muted-foreground/50">•</span>
          <span className="tabular-nums">{formatAmount(item.amount)}</span>
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-3">
        <StatusBadge variant={isInReview ? "warning" : "info"}>
          {isInReview && <Play className="h-3 w-3 mr-1 fill-current" />}
          {item.status}
        </StatusBadge>
      </div>

      <div className="hidden md:flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          {item.assignmentType === "direct" ? (
            <>
              <User className="h-3 w-3 mr-1" />
              Direct
            </>
          ) : (
            <>
              <Users className="h-3 w-3 mr-1" />
              {item.assignedQueueName || "Queue"}
            </>
          )}
        </Badge>
      </div>

      {item.dueDate && (
        <div className="hidden lg:block text-right w-24">
          <p className="text-sm font-medium">{item.dueDate}</p>
          <p className="text-xs text-muted-foreground">Due date</p>
        </div>
      )}

      <Button size="sm" className="shrink-0" onClick={onOpen}>
        Open
        <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
      </Button>
    </div>
  );
}
