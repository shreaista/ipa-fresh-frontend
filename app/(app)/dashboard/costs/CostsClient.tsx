"use client";

import { PageHeader, StatCard, DataCard, StatusBadge } from "@/components/app";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DollarSign,
  TrendingUp,
  TrendingDown,
  Server,
  Cpu,
  Database,
  Cloud,
  FileText,
  BarChart3,
} from "lucide-react";

interface CostsClientProps {
  role?: string;
}

export default function CostsClient({ role }: CostsClientProps) {
  if (role === "saas_admin") {
    return <SaaSAdminCosts />;
  }
  return <TenantCosts />;
}

function SaaSAdminCosts() {
  const monthlyData = [
    { month: "Jan", cost: 7200, tokens: "980K" },
    { month: "Feb", cost: 7850, tokens: "1.1M" },
    { month: "Mar", cost: 9420, tokens: "1.2M" },
  ];

  const breakdown = [
    { category: "LLM Inference", amount: 6340, change: 12, icon: Cpu, color: "bg-violet-500" },
    { category: "Embeddings", amount: 1410, change: -3, icon: Database, color: "bg-blue-500" },
    { category: "Storage", amount: 890, change: 5, icon: Server, color: "bg-emerald-500" },
    { category: "Compute", amount: 780, change: 0, icon: Cloud, color: "bg-amber-500" },
  ];

  const tenantCosts = [
    { tenant: "Delta Partners", cost: 2840, percentage: 30 },
    { tenant: "Acme Corp", cost: 2120, percentage: 23 },
    { tenant: "Zeta Ventures", cost: 1680, percentage: 18 },
    { tenant: "Beta Inc", cost: 1240, percentage: 13 },
    { tenant: "Others", cost: 1540, percentage: 16 },
  ];

  const maxCost = Math.max(...monthlyData.map(d => d.cost));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cost Analytics"
        subtitle="Platform-wide cost breakdown and trends"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Current Month"
          value="$9,420"
          description="+$1,570 from last month"
          trend="up"
          icon={DollarSign}
        />
        <StatCard
          title="Projected Monthly"
          value="$10,200"
          description="Based on current usage"
          trend="neutral"
          icon={TrendingUp}
        />
        <StatCard
          title="Avg Cost / Tenant"
          value="$392"
          description="24 active tenants"
          trend="neutral"
          icon={DollarSign}
        />
        <StatCard
          title="Cost / 1K Tokens"
          value="$0.0078"
          description="-5% optimization"
          trend="up"
          icon={TrendingDown}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chart Placeholder */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Cost Trend</CardTitle>
            <Badge variant="outline" className="text-xs">
              <BarChart3 className="h-3 w-3 mr-1" />
              Last 3 months
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="h-52 flex items-end justify-around gap-6 px-4 pt-4">
              {monthlyData.map((data) => {
                const height = (data.cost / maxCost) * 100;
                return (
                  <div key={data.month} className="flex flex-col items-center gap-3 flex-1 max-w-[80px]">
                    <div className="relative w-full group">
                      <div
                        className="w-full bg-gradient-to-t from-primary to-primary/70 rounded-t-lg transition-all group-hover:from-primary/90 group-hover:to-primary/60"
                        style={{ height: `${height * 1.8}px` }}
                      />
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-foreground text-background text-xs px-2 py-1 rounded whitespace-nowrap">
                        ${data.cost.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">{data.month}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        ${data.cost.toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 pt-4 border-t flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <div className="h-3 w-3 rounded-sm bg-gradient-to-t from-primary to-primary/70" />
              Monthly cost trend
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <DataCard title="By Category" description="Current month breakdown">
          <div className="space-y-4">
            {breakdown.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 ${item.color.replace('bg-', 'text-')}`} />
                      <span className="text-sm">{item.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium tabular-nums">
                        ${item.amount.toLocaleString()}
                      </span>
                      <StatusBadge
                        variant={item.change > 0 ? "error" : item.change < 0 ? "success" : "muted"}
                      >
                        {item.change > 0 ? (
                          <TrendingUp className="h-3 w-3 mr-0.5" />
                        ) : item.change < 0 ? (
                          <TrendingDown className="h-3 w-3 mr-0.5" />
                        ) : null}
                        {item.change > 0 ? "+" : ""}{item.change}%
                      </StatusBadge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-lg font-semibold tabular-nums">$9,420</span>
            </div>
          </div>
        </DataCard>
      </div>

      <DataCard title="Cost by Tenant" description="Distribution across organizations" noPadding>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Share</TableHead>
              <TableHead className="w-[40%] hidden sm:table-cell">Distribution</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenantCosts.map((row) => (
              <TableRow key={row.tenant}>
                <TableCell className="font-medium">{row.tenant}</TableCell>
                <TableCell className="tabular-nums">${row.cost.toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="tabular-nums">{row.percentage}%</Badge>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${row.percentage * 3}%` }}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataCard>
    </div>
  );
}

function TenantCosts() {
  const monthlyData = [
    { month: "Jan", cost: 189, proposals: 18 },
    { month: "Feb", cost: 212, proposals: 22 },
    { month: "Mar", cost: 234, proposals: 25 },
  ];

  const breakdown = [
    { category: "Proposal Analysis", amount: 156, percentage: 67, icon: FileText, color: "bg-violet-500" },
    { category: "Document Processing", amount: 52, percentage: 22, icon: Database, color: "bg-blue-500" },
    { category: "Embeddings", amount: 26, percentage: 11, icon: Cpu, color: "bg-emerald-500" },
  ];

  const maxCost = Math.max(...monthlyData.map(d => d.cost));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usage & Costs"
        subtitle="Your organization's LLM usage breakdown"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Current Month"
          value="$234"
          description="+$22 from last month"
          trend="up"
          icon={DollarSign}
        />
        <StatCard
          title="Proposals Processed"
          value="25"
          description="This month"
          trend="up"
          icon={FileText}
        />
        <StatCard
          title="Avg Cost / Proposal"
          value="$9.36"
          description="Efficient"
          trend="up"
          icon={TrendingDown}
        />
        <StatCard
          title="Budget Remaining"
          value="$766"
          description="of $1,000 monthly"
          trend="neutral"
          icon={DollarSign}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Monthly Trend</CardTitle>
            <Badge variant="outline" className="text-xs">
              <BarChart3 className="h-3 w-3 mr-1" />
              Last 3 months
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="h-44 flex items-end justify-around gap-6 px-4 pt-4">
              {monthlyData.map((data) => {
                const height = (data.cost / maxCost) * 100;
                return (
                  <div key={data.month} className="flex flex-col items-center gap-3 flex-1 max-w-[80px]">
                    <div className="relative w-full group">
                      <div
                        className="w-full bg-gradient-to-t from-primary to-primary/70 rounded-t-lg transition-all"
                        style={{ height: `${height * 1.2}px` }}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">{data.month}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">${data.cost}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Breakdown */}
        <DataCard title="Cost Breakdown">
          <div className="space-y-4">
            {breakdown.map((item) => {
              return (
                <div key={item.category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                      <span className="text-sm">{item.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="tabular-nums">{item.percentage}%</Badge>
                      <span className="text-sm font-medium tabular-nums w-12 text-right">${item.amount}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden ml-5">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-lg font-semibold tabular-nums">$234</span>
            </div>
          </div>
        </DataCard>
      </div>
    </div>
  );
}
