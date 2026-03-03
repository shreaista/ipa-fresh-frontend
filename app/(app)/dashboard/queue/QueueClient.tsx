"use client";

import { useState } from "react";
import { PageHeader, StatCard, DataCard, StatusBadge, EmptyState } from "@/components/app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  ArrowRight,
  Target,
  Clock,
  CheckCircle,
  AlertTriangle,
  Play,
  Zap,
} from "lucide-react";

const queueItems = [
  { id: "P-095", name: "Senior Wellness Center", tenant: "Elder Care Co", fund: "Healthcare Init", amount: "$120,000", priority: "High", status: "In Progress", due: "Mar 3, 2026", daysLeft: 1, progress: 75 },
  { id: "P-098", name: "Green Energy Project", tenant: "Eco Solutions", fund: "Innovation Grant", amount: "$78,000", priority: "High", status: "Not Started", due: "Mar 5, 2026", daysLeft: 3, progress: 0 },
  { id: "P-096", name: "Food Security Network", tenant: "Hunger Relief", fund: "Emergency Reserve", amount: "$55,000", priority: "Medium", status: "In Progress", due: "Mar 4, 2026", daysLeft: 2, progress: 40 },
  { id: "P-099", name: "Digital Literacy Program", tenant: "Tech For All", fund: "Community Dev", amount: "$25,000", priority: "Medium", status: "Not Started", due: "Mar 6, 2026", daysLeft: 4, progress: 0 },
  { id: "P-100", name: "Arts & Culture Festival", tenant: "Creative Minds", fund: "General Fund", amount: "$35,000", priority: "Low", status: "Not Started", due: "Mar 10, 2026", daysLeft: 8, progress: 0 },
  { id: "P-103", name: "Youth Mentorship", tenant: "Future Leaders", fund: "Youth Programs", amount: "$42,000", priority: "Medium", status: "Not Started", due: "Mar 8, 2026", daysLeft: 6, progress: 0 },
  { id: "P-104", name: "Clean Water Initiative", tenant: "Water For All", fund: "Community Dev", amount: "$68,000", priority: "Low", status: "Not Started", due: "Mar 12, 2026", daysLeft: 10, progress: 0 },
];

type PriorityKey = "High" | "Medium" | "Low";
type StatusKey = "In Progress" | "Not Started";
type FilterKey = "all" | "high" | "in-progress" | "due-soon";

const statusVariants: Record<StatusKey, "info" | "muted"> = {
  "In Progress": "info",
  "Not Started": "muted",
};

export default function QueueClient() {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");

  const filteredItems = queueItems.filter((item) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "high" && item.priority === "High") ||
      (filter === "in-progress" && item.status === "In Progress") ||
      (filter === "due-soon" && item.daysLeft <= 3);
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.tenant.toLowerCase().includes(search.toLowerCase()) ||
      item.id.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const highPriorityCount = queueItems.filter(q => q.priority === "High").length;
  const inProgressCount = queueItems.filter(q => q.status === "In Progress").length;
  const dueSoonCount = queueItems.filter(q => q.daysLeft <= 3).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Queue"
        subtitle="Proposals assigned to you for assessment"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Assigned"
          value={queueItems.length}
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
          title="In Progress"
          value={inProgressCount}
          description="Currently working"
          icon={Clock}
        />
        <StatCard
          title="Due Soon"
          value={dueSoonCount}
          description="Within 3 days"
          trend={dueSoonCount > 2 ? "down" : "neutral"}
          icon={Zap}
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
            <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
              <TabsList>
                <TabsTrigger value="all">
                  All
                  <span className="ml-1.5 text-xs text-muted-foreground">({queueItems.length})</span>
                </TabsTrigger>
                <TabsTrigger value="high">
                  High
                </TabsTrigger>
                <TabsTrigger value="in-progress">
                  In Progress
                </TabsTrigger>
                <TabsTrigger value="due-soon">
                  Due Soon
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
            action={{ label: "Show all", onClick: () => { setFilter("all"); setSearch(""); } }}
          />
        ) : (
          <div className="divide-y">
            {filteredItems.map((item) => (
              <QueueRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </DataCard>
    </div>
  );
}

interface QueueItem {
  id: string;
  name: string;
  tenant: string;
  fund: string;
  amount: string;
  priority: string;
  status: string;
  due: string;
  daysLeft: number;
  progress: number;
}

interface QueueRowProps {
  item: QueueItem;
}

function QueueRow({ item }: QueueRowProps) {
  const isUrgent = item.daysLeft <= 2;
  const priority = item.priority as PriorityKey;
  const status = item.status as StatusKey;

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
          {isUrgent && (
            <StatusBadge variant="error" className="animate-pulse">
              Urgent
            </StatusBadge>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{item.tenant}</span>
          <span className="text-muted-foreground/50">•</span>
          <span className="tabular-nums">{item.amount}</span>
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-3">
        <StatusBadge variant={statusVariants[status]}>
          {status === "In Progress" && <Play className="h-3 w-3 mr-1 fill-current" />}
          {status}
        </StatusBadge>
        {item.progress > 0 && (
          <div className="w-16">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${item.progress}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-0.5">
              {item.progress}%
            </p>
          </div>
        )}
      </div>

      <div className="hidden md:block text-right w-24">
        <p className="text-sm font-medium">{item.due}</p>
        <p className={`text-xs ${isUrgent ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
          {item.daysLeft} day{item.daysLeft !== 1 ? "s" : ""} left
        </p>
      </div>

      <Button size="sm" className="shrink-0">
        Open
        <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
      </Button>
    </div>
  );
}
