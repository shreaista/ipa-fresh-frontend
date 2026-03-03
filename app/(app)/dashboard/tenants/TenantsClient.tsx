"use client";

import { useState } from "react";
import { PageHeader, DataCard, StatusBadge, EmptyState } from "@/components/app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  Search,
  Plus,
  MoreHorizontal,
  Building2,
  Users,
  Settings,
  Trash2,
  Filter,
  ChevronDown,
  X,
} from "lucide-react";

const tenants = [
  { id: "t-001", name: "Acme Corp", plan: "Enterprise", seats: 45, used: 42, status: "Active", lastActivity: "2 hours ago", revenue: "$4,500" },
  { id: "t-002", name: "Beta Inc", plan: "Pro", seats: 20, used: 12, status: "Active", lastActivity: "5 mins ago", revenue: "$800" },
  { id: "t-003", name: "Gamma LLC", plan: "Starter", seats: 10, used: 5, status: "Trial", lastActivity: "1 day ago", revenue: "$0" },
  { id: "t-004", name: "Delta Partners", plan: "Enterprise", seats: 100, used: 78, status: "Active", lastActivity: "30 mins ago", revenue: "$10,000" },
  { id: "t-005", name: "Epsilon Fund", plan: "Pro", seats: 30, used: 23, status: "Active", lastActivity: "3 hours ago", revenue: "$1,200" },
  { id: "t-006", name: "Zeta Ventures", plan: "Enterprise", seats: 50, used: 48, status: "Active", lastActivity: "1 hour ago", revenue: "$5,000" },
  { id: "t-007", name: "Eta Holdings", plan: "Starter", seats: 5, used: 2, status: "Suspended", lastActivity: "7 days ago", revenue: "$0" },
];

type StatusKey = "Active" | "Trial" | "Suspended";
type PlanKey = "Enterprise" | "Pro" | "Starter";

const statusVariants: Record<StatusKey, "success" | "warning" | "error"> = {
  Active: "success",
  Trial: "warning",
  Suspended: "error",
};

const planVariants: Record<PlanKey, "default" | "info" | "muted"> = {
  Enterprise: "default",
  Pro: "info",
  Starter: "muted",
};

export default function TenantsClient() {
  const [filter, setFilter] = useState<"all" | StatusKey>("all");
  const [planFilter, setPlanFilter] = useState<"all" | PlanKey>("all");
  const [search, setSearch] = useState("");

  const filteredTenants = tenants.filter((t) => {
    const matchesStatus = filter === "all" || t.status === filter;
    const matchesPlan = planFilter === "all" || t.plan === planFilter;
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesPlan && matchesSearch;
  });

  const hasActiveFilters = filter !== "all" || planFilter !== "all" || search !== "";

  const clearFilters = () => {
    setFilter("all");
    setPlanFilter("all");
    setSearch("");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tenants"
        subtitle="Manage all tenant organizations"
        actions={
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Tenant
          </Button>
        }
      />

      <DataCard title="All Tenants" description={`${filteredTenants.length} of ${tenants.length} tenants`} noPadding>
        <div className="p-4 border-b space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or ID..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Status
                    {filter !== "all" && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                        {filter}
                      </Badge>
                    )}
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setFilter("all")}>
                    All Statuses
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter("Active")}>
                    <span className="h-2 w-2 rounded-full bg-emerald-500 mr-2" />
                    Active
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter("Trial")}>
                    <span className="h-2 w-2 rounded-full bg-amber-500 mr-2" />
                    Trial
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter("Suspended")}>
                    <span className="h-2 w-2 rounded-full bg-red-500 mr-2" />
                    Suspended
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    Plan
                    {planFilter !== "all" && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                        {planFilter}
                      </Badge>
                    )}
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuLabel>Filter by Plan</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setPlanFilter("all")}>
                    All Plans
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPlanFilter("Enterprise")}>
                    Enterprise
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPlanFilter("Pro")}>
                    Pro
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPlanFilter("Starter")}>
                    Starter
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Active filters:</span>
              {filter !== "all" && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-6 px-2 text-xs gap-1"
                  onClick={() => setFilter("all")}
                >
                  Status: {filter}
                  <X className="h-3 w-3" />
                </Button>
              )}
              {planFilter !== "all" && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-6 px-2 text-xs gap-1"
                  onClick={() => setPlanFilter("all")}
                >
                  Plan: {planFilter}
                  <X className="h-3 w-3" />
                </Button>
              )}
              {search && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-6 px-2 text-xs gap-1"
                  onClick={() => setSearch("")}
                >
                  Search: &quot;{search}&quot;
                  <X className="h-3 w-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground"
                onClick={clearFilters}
              >
                Clear all
              </Button>
            </div>
          )}
        </div>

        {filteredTenants.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No tenants found"
            description="Try adjusting your search or filter criteria"
            action={{ label: "Clear filters", onClick: clearFilters }}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="hidden md:table-cell">Seats</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Last Activity</TableHead>
                <TableHead className="hidden sm:table-cell text-right">MRR</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTenants.map((tenant) => (
                <TableRow key={tenant.id} className="group">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                        <Building2 className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div>
                        <p className="font-medium">{tenant.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{tenant.id}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={planVariants[tenant.plan as PlanKey]}>
                      {tenant.plan}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${(tenant.used / tenant.seats) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm tabular-nums">
                        <span className="font-medium">{tenant.used}</span>
                        <span className="text-muted-foreground">/{tenant.seats}</span>
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={statusVariants[tenant.status as StatusKey]} dot>
                      {tenant.status}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden lg:table-cell">
                    {tenant.lastActivity}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-right font-medium tabular-nums">
                    {tenant.revenue}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Users className="h-4 w-4 mr-2" />
                          View Users
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Settings className="h-4 w-4 mr-2" />
                          Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Suspend
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DataCard>
    </div>
  );
}
