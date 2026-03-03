"use client";

import { useState } from "react";
import { PageHeader, StatCard, DataCard, StatusBadge } from "@/components/app";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/dropdown-menu";
import {
  Wallet,
  Plus,
  LayoutGrid,
  List,
  TrendingUp,
  DollarSign,
  Target,
  MoreHorizontal,
  Settings,
  FileText,
  PauseCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";

const funds = [
  {
    id: "F-001",
    name: "General Fund 2026",
    strategy: "Diversified Impact",
    aum: "$2,500,000",
    allocated: "$1,850,000",
    available: "$650,000",
    capacity: 74,
    status: "Active",
    proposals: 45,
  },
  {
    id: "F-002",
    name: "Innovation Grant",
    strategy: "Technology Focus",
    aum: "$500,000",
    allocated: "$320,000",
    available: "$180,000",
    capacity: 64,
    status: "Active",
    proposals: 12,
  },
  {
    id: "F-003",
    name: "Community Development",
    strategy: "Local Impact",
    aum: "$750,000",
    allocated: "$680,000",
    available: "$70,000",
    capacity: 91,
    status: "Limited",
    proposals: 28,
  },
  {
    id: "F-004",
    name: "Emergency Reserve",
    strategy: "Rapid Response",
    aum: "$200,000",
    allocated: "$45,000",
    available: "$155,000",
    capacity: 23,
    status: "Active",
    proposals: 5,
  },
  {
    id: "F-005",
    name: "Youth Programs",
    strategy: "Education & Youth",
    aum: "$400,000",
    allocated: "$280,000",
    available: "$120,000",
    capacity: 70,
    status: "Active",
    proposals: 18,
  },
  {
    id: "F-006",
    name: "Healthcare Initiative",
    strategy: "Health & Wellness",
    aum: "$600,000",
    allocated: "$600,000",
    available: "$0",
    capacity: 100,
    status: "Closed",
    proposals: 22,
  },
];

type StatusKey = "Active" | "Limited" | "Closed";

const statusVariants: Record<StatusKey, "success" | "warning" | "muted"> = {
  Active: "success",
  Limited: "warning",
  Closed: "muted",
};

export default function FundsPage() {
  const [view, setView] = useState<"grid" | "table">("grid");

  const totalAum = funds.reduce((sum, f) => sum + parseInt(f.aum.replace(/[$,]/g, "")), 0);
  const totalAvailable = funds.reduce((sum, f) => sum + parseInt(f.available.replace(/[$,]/g, "")), 0);
  const activeFunds = funds.filter(f => f.status === "Active").length;
  const avgUtilization = Math.round(funds.reduce((sum, f) => sum + f.capacity, 0) / funds.length);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Funds"
        subtitle="Manage funding sources and allocations"
        actions={
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Fund
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total AUM"
          value={`$${(totalAum / 1000000).toFixed(1)}M`}
          description="Assets under management"
          icon={Wallet}
        />
        <StatCard
          title="Available Capital"
          value={`$${(totalAvailable / 1000).toFixed(0)}K`}
          description="Ready for allocation"
          trend="neutral"
          icon={DollarSign}
        />
        <StatCard
          title="Active Funds"
          value={activeFunds.toString()}
          description={`of ${funds.length} total`}
          trend="neutral"
          icon={Target}
        />
        <StatCard
          title="Avg Utilization"
          value={`${avgUtilization}%`}
          description="Across all funds"
          trend="up"
          icon={TrendingUp}
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1">
            {funds.length} Funds
          </Badge>
          <span className="text-sm text-muted-foreground">
            {activeFunds} active, {funds.filter(f => f.status === "Limited").length} limited, {funds.filter(f => f.status === "Closed").length} closed
          </span>
        </div>

        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Button
            variant={view === "grid" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 px-3"
            onClick={() => setView("grid")}
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            Cards
          </Button>
          <Button
            variant={view === "table" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 px-3"
            onClick={() => setView("table")}
          >
            <List className="h-4 w-4 mr-2" />
            Table
          </Button>
        </div>
      </div>

      {view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {funds.map((fund) => (
            <Card key={fund.id} className="group hover:shadow-md transition-all duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base truncate">{fund.name}</CardTitle>
                    <CardDescription className="truncate">{fund.strategy}</CardDescription>
                  </div>
                  <StatusBadge variant={statusVariants[fund.status as StatusKey]} dot>
                    {fund.status}
                  </StatusBadge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">AUM</p>
                    <p className="text-lg font-semibold tabular-nums">{fund.aum}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Available</p>
                    <p className="text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {fund.available}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Capacity Used</span>
                    <span className="font-medium tabular-nums">{fund.capacity}%</span>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        fund.capacity >= 100
                          ? "bg-slate-400"
                          : fund.capacity > 90
                          ? "bg-red-500"
                          : fund.capacity > 70
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(fund.capacity, 100)}%` }}
                    />
                  </div>
                  {fund.capacity < 100 && (
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {100 - fund.capacity}% capacity remaining
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    <span>{fund.proposals} proposals</span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 px-2">
                        Actions
                        <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <FileText className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Add Capital
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-amber-600">
                        <PauseCircle className="h-4 w-4 mr-2" />
                        Pause Fund
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <DataCard title="All Funds" description={`${funds.length} funds total`} noPadding>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fund</TableHead>
                <TableHead>Strategy</TableHead>
                <TableHead className="text-right">AUM</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Proposals</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {funds.map((fund) => (
                <TableRow key={fund.id} className="group">
                  <TableCell>
                    <div>
                      <p className="font-medium">{fund.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{fund.id}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{fund.strategy}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{fund.aum}</TableCell>
                  <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                    {fund.available}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            fund.capacity >= 100
                              ? "bg-slate-400"
                              : fund.capacity > 90
                              ? "bg-red-500"
                              : fund.capacity > 70
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                          style={{ width: `${Math.min(fund.capacity, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm tabular-nums w-10">{fund.capacity}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={statusVariants[fund.status as StatusKey]} dot>
                      {fund.status}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums hidden sm:table-cell">
                    {fund.proposals}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <FileText className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Settings className="h-4 w-4 mr-2" />
                          Settings
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataCard>
      )}
    </div>
  );
}
