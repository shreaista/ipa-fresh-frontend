import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/currentUser";
import { PageHeader, StatCard, DataCard } from "@/components/layout";
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
  Building2,
  Users,
  DollarSign,
  Cpu,
  CheckCircle,
  Clock,
  Target,
  TrendingUp,
  Wallet,
  FileText,
} from "lucide-react";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role === "saas_admin") {
    return <SaaSAdminOverview />;
  }

  if (user.role === "tenant_admin") {
    return <TenantAdminOverview />;
  }

  return <AssessorOverview />;
}

function SaaSAdminOverview() {
  const tenantUsage = [
    { tenant: "Acme Corp", users: 45, proposals: 128, llmCalls: "12.4K", cost: "$234" },
    { tenant: "Beta Inc", users: 12, proposals: 34, llmCalls: "3.2K", cost: "$67" },
    { tenant: "Gamma LLC", users: 5, proposals: 8, llmCalls: "890", cost: "$18" },
    { tenant: "Delta Partners", users: 78, proposals: 256, llmCalls: "28.1K", cost: "$512" },
  ];

  const costDrivers = [
    { name: "GPT-4 Turbo", percentage: 45, amount: "$4,230" },
    { name: "Claude 3 Opus", percentage: 28, amount: "$2,640" },
    { name: "Embeddings", percentage: 15, amount: "$1,410" },
    { name: "Storage", percentage: 8, amount: "$752" },
    { name: "Compute", percentage: 4, amount: "$368" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="SaaS Admin Overview"
        subtitle="Platform-wide metrics and insights"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Tenants"
          value="24"
          description="+3 this month"
          trend="up"
          icon={Building2}
        />
        <StatCard
          title="Active Users"
          value="312"
          description="+28 this week"
          trend="up"
          icon={Users}
        />
        <StatCard
          title="Monthly Cost"
          value="$9,420"
          description="+12% from last month"
          trend="up"
          icon={DollarSign}
        />
        <StatCard
          title="LLM Requests"
          value="1.2M"
          description="Last 30 days"
          trend="neutral"
          icon={Cpu}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DataCard title="Tenant Usage">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead className="text-right">Users</TableHead>
                <TableHead className="text-right">Proposals</TableHead>
                <TableHead className="text-right">LLM Calls</TableHead>
                <TableHead className="text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenantUsage.map((row) => (
                <TableRow key={row.tenant}>
                  <TableCell className="font-medium">{row.tenant}</TableCell>
                  <TableCell className="text-right">{row.users}</TableCell>
                  <TableCell className="text-right">{row.proposals}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{row.llmCalls}</TableCell>
                  <TableCell className="text-right font-medium">{row.cost}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataCard>

        <DataCard title="Cost Drivers">
          <div className="space-y-4">
            {costDrivers.map((driver) => (
              <div key={driver.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-sm font-medium w-28">{driver.name}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${driver.percentage}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Badge variant="secondary">{driver.percentage}%</Badge>
                  <span className="text-sm font-medium w-16 text-right">{driver.amount}</span>
                </div>
              </div>
            ))}
          </div>
        </DataCard>
      </div>
    </div>
  );
}

function TenantAdminOverview() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tenant Overview"
        subtitle="Your organization at a glance"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Funds"
          value="8"
          description="3 closing soon"
          trend="neutral"
          icon={Wallet}
        />
        <StatCard
          title="Open Proposals"
          value="34"
          description="+5 this week"
          trend="up"
          icon={FileText}
        />
        <StatCard
          title="Team Members"
          value="12"
          description="2 pending invites"
          trend="neutral"
          icon={Users}
        />
        <StatCard
          title="Pending Approvals"
          value="7"
          description="Action required"
          trend="neutral"
          icon={Clock}
        />
      </div>
    </div>
  );
}

function AssessorOverview() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="My Queue"
        subtitle="Your assigned assessments and progress"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Assigned to Me"
          value="12"
          description="4 high priority"
          trend="neutral"
          icon={Target}
        />
        <StatCard
          title="Completed Today"
          value="5"
          description="Above average"
          trend="up"
          icon={CheckCircle}
        />
        <StatCard
          title="Pending Review"
          value="3"
          description="Due this week"
          trend="neutral"
          icon={Clock}
        />
        <StatCard
          title="Avg. Review Time"
          value="2.4 hrs"
          description="-15% improvement"
          trend="up"
          icon={TrendingUp}
        />
      </div>
    </div>
  );
}
