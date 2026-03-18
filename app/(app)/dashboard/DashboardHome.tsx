"use client";

import { PageHeader, StatCard, DataCard, StatusBadge } from "@/components/app";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Target,
  Users,
  DollarSign,
  Cpu,
  Building2,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface DashboardHomeProps {
  user: {
    id?: string;
    email?: string;
    name?: string;
    role?: string;
  };
}

export default function DashboardHome({ user }: DashboardHomeProps) {
  const role = user.role || "assessor";

  return (
    <div className="space-y-6">
      {role === "saas_admin" && <SaaSAdminOverview />}
      {(role === "tenant_admin" || role === "fund_manager" || role === "viewer") && <ExecutiveDashboard />}
      {role === "assessor" && <AssessorOverview />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Executive Dashboard - High-level view for tenant admins
// ─────────────────────────────────────────────────────────────────────────────

const KPI_DATA = [
  {
    title: "Total Deals Processed",
    value: "142",
    description: "+12% vs last month",
    trend: "up" as const,
    icon: FileText,
  },
  {
    title: "Avg Processing Time",
    value: "2.3 days",
    description: "-0.4 days vs last month",
    trend: "up" as const,
    icon: Clock,
  },
  {
    title: "Approval Rate",
    value: "68%",
    description: "+5% vs last month",
    trend: "up" as const,
    icon: CheckCircle,
  },
  {
    title: "Risk-Flagged Deals",
    value: "12%",
    description: "-2% vs last month",
    trend: "up" as const,
    icon: AlertTriangle,
  },
];

const DEALS_OVER_TIME = [
  { week: "Week 1", deals: 28, approved: 18 },
  { week: "Week 2", deals: 35, approved: 24 },
  { week: "Week 3", deals: 42, approved: 29 },
  { week: "Week 4", deals: 37, approved: 26 },
];

const APPROVAL_REJECTION = [
  { name: "Approved", count: 97, fill: "hsl(var(--success))" },
  { name: "Rejected", count: 31, fill: "hsl(var(--destructive))" },
  { name: "Deferred", count: 14, fill: "hsl(var(--muted-foreground))" },
];

const RISK_DISTRIBUTION = [
  { name: "Low", value: 68, color: "hsl(var(--success))" },
  { name: "Medium", value: 22, color: "hsl(var(--warning))" },
  { name: "High", value: 10, color: "hsl(var(--destructive))" },
];

const RECENT_PROPOSALS = [
  { id: "P-101", name: "Community Arts Program", applicant: "Arts Alliance", amount: "$45,000", status: "New" },
  { id: "P-102", name: "Youth Sports Initiative", applicant: "Sports Foundation", amount: "$32,000", status: "New" },
  { id: "P-098", name: "Green Energy Project", applicant: "Eco Solutions", amount: "$78,000", status: "Assigned" },
  { id: "P-099", name: "Digital Literacy Program", applicant: "Tech For All", amount: "$25,000", status: "Assigned" },
  { id: "P-095", name: "Senior Wellness Center", applicant: "Elder Care Co", amount: "$120,000", status: "In Review" },
  { id: "P-096", name: "Food Security Network", applicant: "Hunger Relief", amount: "$55,000", status: "In Review" },
  { id: "P-090", name: "Healthcare Access", applicant: "Health First", amount: "$150,000", status: "Approved" },
  { id: "P-092", name: "Transport Subsidy", applicant: "Mobility Aid", amount: "$35,000", status: "Declined" },
];

const AI_INSIGHTS = `Deal processing volume has increased 12% over the past 30 days, with approval rates trending favorably at 68%. Risk-flagged proposals remain below 15%, indicating strong mandate alignment. Average processing time improved to 2.3 days—consider prioritizing the 3 proposals due this week for IC review.`;

const statusVariant: Record<string, "muted" | "info" | "warning" | "success" | "error"> = {
  New: "muted",
  Assigned: "info",
  "In Review": "warning",
  Approved: "success",
  Declined: "error",
};

function ExecutiveDashboard() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Executive Dashboard"
        subtitle="High-level overview of deal pipeline and performance"
        actions={
          <div className="flex items-center gap-2">
            <Link href="/dashboard/fund-manager">
              <Button variant="outline" size="sm">
                Fund Manager
                <ArrowRight className="h-3.5 w-3.5 ml-2" />
              </Button>
            </Link>
            <Link href="/dashboard/proposals">
              <Button size="sm">
                View Proposals
                <ExternalLink className="h-3.5 w-3.5 ml-2" />
              </Button>
            </Link>
          </div>
        }
      />

      {/* KPI Cards - 4 across top */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPI_DATA.map((kpi) => (
          <StatCard
            key={kpi.title}
            title={kpi.title}
            value={kpi.value}
            description={kpi.description}
            trend={kpi.trend}
            icon={kpi.icon}
          />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-3">
        <DataCard
          title="Deals Over Time"
          description="Last 30 days"
          className="lg:col-span-2"
        >
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={DEALS_OVER_TIME} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="deals"
                  name="Total Deals"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="approved"
                  name="Approved"
                  stroke="hsl(var(--success))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--success))", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </DataCard>

        <DataCard title="Risk Distribution" description="By deal risk level">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={RISK_DISTRIBUTION}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                >
                  {RISK_DISTRIBUTION.map((entry, index) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </DataCard>
      </div>

      {/* Approval vs Rejection bar chart - full width */}
      <DataCard title="Approval vs Rejection" description="Outcomes last 30 days">
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={APPROVAL_REJECTION} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} horizontal={false} />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} width={80} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                }}
              />
              <Bar dataKey="count" name="Deals" radius={[0, 4, 4, 0]}>
                {APPROVAL_REJECTION.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </DataCard>

      {/* Recent Proposals + AI Insights */}
      <div className="grid gap-6 lg:grid-cols-3">
        <DataCard
          title="Recent Proposals"
          description="Latest activity"
          className="lg:col-span-2"
          actions={
            <Link href="/dashboard/proposals">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>
          }
          noPadding
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proposal</TableHead>
                <TableHead className="hidden sm:table-cell">Applicant</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {RECENT_PROPOSALS.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link href={`/dashboard/proposals/${row.id}`} className="font-medium hover:underline">
                      {row.name}
                    </Link>
                    <p className="text-xs text-muted-foreground font-mono">{row.id}</p>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">{row.applicant}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{row.amount}</TableCell>
                  <TableCell>
                    <StatusBadge variant={statusVariant[row.status] || "muted"}>{row.status}</StatusBadge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataCard>

        <DataCard
          title="AI Insights Summary"
          description="Auto-generated analysis"
          actions={<Sparkles className="h-4 w-4 text-primary" />}
        >
          <p className="text-sm text-muted-foreground leading-relaxed font-normal">{AI_INSIGHTS}</p>
        </DataCard>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SaaS Admin Overview
// ─────────────────────────────────────────────────────────────────────────────

function SaaSAdminOverview() {
  const tenantUsage = [
    { tenant: "Delta Partners", users: 78, proposals: 256, llmCalls: "28.1K", cost: "$512", trend: "up" },
    { tenant: "Acme Corp", users: 45, proposals: 128, llmCalls: "12.4K", cost: "$234", trend: "up" },
    { tenant: "Zeta Ventures", users: 48, proposals: 89, llmCalls: "8.2K", cost: "$156", trend: "neutral" },
    { tenant: "Beta Inc", users: 12, proposals: 34, llmCalls: "3.2K", cost: "$67", trend: "down" },
    { tenant: "Gamma LLC", users: 5, proposals: 8, llmCalls: "890", cost: "$18", trend: "neutral" },
  ];

  const costDrivers = [
    { name: "GPT-4 Turbo", percentage: 45, amount: "$4,230", color: "bg-violet-500" },
    { name: "Claude 3 Opus", percentage: 28, amount: "$2,640", color: "bg-blue-500" },
    { name: "Embeddings", percentage: 15, amount: "$1,410", color: "bg-emerald-500" },
    { name: "Storage", percentage: 8, amount: "$752", color: "bg-amber-500" },
    { name: "Compute", percentage: 4, amount: "$368", color: "bg-slate-400" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Overview"
        subtitle="Real-time metrics across all tenants"
        actions={
          <Link href="/dashboard/reports">
            <Button variant="outline" size="sm">
              View Reports
              <ExternalLink className="h-3.5 w-3.5 ml-2" />
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Tenants" value="24" description="+3 this month" trend="up" icon={Building2} />
        <StatCard title="Active Users" value="312" description="+28 this week" trend="up" icon={Users} />
        <StatCard title="Monthly Cost" value="$9,420" description="+12% vs last month" trend="up" icon={DollarSign} />
        <StatCard title="LLM Requests" value="1.2M" description="Last 30 days" trend="neutral" icon={Cpu} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DataCard
          title="Tenant Usage"
          description="Top tenants by activity"
          actions={
            <Link href="/dashboard/tenants">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>
          }
          noPadding
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead className="text-right">Users</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Proposals</TableHead>
                <TableHead className="text-right hidden md:table-cell">LLM Calls</TableHead>
                <TableHead className="text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenantUsage.map((row) => (
                <TableRow key={row.tenant} className="group">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <span className="font-medium truncate">{row.tenant}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.users}</TableCell>
                  <TableCell className="text-right tabular-nums hidden sm:table-cell">{row.proposals}</TableCell>
                  <TableCell className="text-right text-muted-foreground hidden md:table-cell">{row.llmCalls}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="font-medium tabular-nums">{row.cost}</span>
                      {row.trend === "up" && <TrendingUp className="h-3 w-3 text-emerald-500" />}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataCard>

        <DataCard title="Cost Drivers" description="Monthly spend breakdown">
          <div className="space-y-4">
            {costDrivers.map((driver) => (
              <div key={driver.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{driver.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="tabular-nums">
                      {driver.percentage}%
                    </Badge>
                    <span className="text-sm font-semibold tabular-nums w-16 text-right">{driver.amount}</span>
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${driver.color}`}
                    style={{ width: `${driver.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Monthly Cost</span>
              <span className="font-semibold text-lg">$9,400</span>
            </div>
          </div>
        </DataCard>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Assessor Overview
// ─────────────────────────────────────────────────────────────────────────────

function AssessorOverview() {
  const queue = [
    { id: "P-095", name: "Senior Wellness Center", tenant: "Elder Care Co", priority: "High", status: "In Progress", due: "Mar 3, 2026", daysLeft: 1 },
    { id: "P-098", name: "Green Energy Project", tenant: "Eco Solutions", priority: "High", status: "Not Started", due: "Mar 5, 2026", daysLeft: 3 },
    { id: "P-096", name: "Food Security Network", tenant: "Hunger Relief", priority: "Medium", status: "In Progress", due: "Mar 4, 2026", daysLeft: 2 },
    { id: "P-099", name: "Digital Literacy Program", tenant: "Tech For All", priority: "Medium", status: "Not Started", due: "Mar 6, 2026", daysLeft: 4 },
    { id: "P-100", name: "Arts & Culture Festival", tenant: "Creative Minds", priority: "Low", status: "Not Started", due: "Mar 10, 2026", daysLeft: 8 },
  ];

  type PriorityKey = "High" | "Medium" | "Low";
  type StatusKey = "In Progress" | "Not Started";

  const priorityVariants: Record<PriorityKey, "error" | "warning" | "muted"> = {
    High: "error",
    Medium: "warning",
    Low: "muted",
  };

  const statusVariants: Record<StatusKey, "info" | "muted"> = {
    "In Progress": "info",
    "Not Started": "muted",
  };

  return (
    <div className="space-y-6">
      <PageHeader title="My Dashboard" subtitle="Your assessment queue and progress" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Assigned" value="5" description="Total in queue" icon={Target} />
        <StatCard title="Due Soon" value="2" description="Within 48 hours" trend="neutral" icon={AlertTriangle} />
        <StatCard title="Completed (Week)" value="8" description="+2 from last week" trend="up" icon={CheckCircle} />
        <StatCard title="Avg Turnaround" value="1.8 days" description="-0.4 days improved" trend="up" icon={Clock} />
      </div>

      <DataCard
        title="My Queue"
        actions={
          <Link href="/dashboard/queue">
            <Button variant="outline" size="sm">
              View All
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        }
      >
        <div className="space-y-2">
          {queue.map((item) => (
            <QueueItem
              key={item.id}
              item={item}
              priorityVariants={priorityVariants}
              statusVariants={statusVariants}
            />
          ))}
        </div>
      </DataCard>
    </div>
  );
}

interface QueueItemProps {
  item: {
    id: string;
    name: string;
    tenant: string;
    priority: string;
    status: string;
    due: string;
    daysLeft: number;
  };
  priorityVariants: Record<string, "error" | "warning" | "muted">;
  statusVariants: Record<string, "info" | "muted">;
}

function QueueItem({ item, priorityVariants, statusVariants }: QueueItemProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{item.id}</span>
            <span className="font-medium truncate">{item.name}</span>
          </div>
          <p className="text-sm text-muted-foreground">{item.tenant}</p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <StatusBadge variant={priorityVariants[item.priority]}>{item.priority}</StatusBadge>
          <StatusBadge variant={statusVariants[item.status]}>{item.status}</StatusBadge>
        </div>
        <div className="hidden md:block text-right">
          <p className="text-sm font-medium">{item.due}</p>
          <p className={`text-xs ${item.daysLeft <= 2 ? "text-red-500" : "text-muted-foreground"}`}>
            {item.daysLeft} day{item.daysLeft !== 1 ? "s" : ""} left
          </p>
        </div>
      </div>
      <Link href={`/dashboard/proposals/${item.id}`}>
        <Button variant="outline" size="sm" className="ml-4">
          Open
        </Button>
      </Link>
    </div>
  );
}
