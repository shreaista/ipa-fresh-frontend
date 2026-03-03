"use client";

import { PageHeader, StatCard, DataCard } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  Wallet,
  FileCheck,
  AlertCircle,
  ArrowRight,
  AlertTriangle,
  Timer,
} from "lucide-react";
import Link from "next/link";

interface DashboardHomeProps {
  user: {
    id?: string;
    email?: string;
    name?: string;
    role?: "saas_admin" | "tenant_admin" | "assessor";
  };
}

export default function DashboardHome({ user }: DashboardHomeProps) {
  const role = user.role || "assessor";
  const displayName = user.name || user.email || "User";

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Signed in as {displayName}</p>
      </div>

      {role === "saas_admin" && <SaaSAdminOverview />}
      {role === "tenant_admin" && <TenantAdminOverview />}
      {role === "assessor" && <AssessorOverview />}
    </div>
  );
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
        <StatCard title="Total Tenants" value="24" description="+3 this month" trend="up" icon={Building2} />
        <StatCard title="Active Users" value="312" description="+28 this week" trend="up" icon={Users} />
        <StatCard title="Monthly Cost" value="$9,420" description="+12% from last month" trend="up" icon={DollarSign} />
        <StatCard title="LLM Requests" value="1.2M" description="Last 30 days" trend="neutral" icon={Cpu} />
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
                    <div className="h-full bg-primary rounded-full" style={{ width: `${driver.percentage}%` }} />
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
  const pipelineData = {
    new: [
      { id: "P-101", name: "Community Arts Program", applicant: "Arts Alliance", amount: "$45,000", submitted: "Mar 2, 2026" },
      { id: "P-102", name: "Youth Sports Initiative", applicant: "Sports Foundation", amount: "$32,000", submitted: "Mar 1, 2026" },
    ],
    assigned: [
      { id: "P-098", name: "Green Energy Project", applicant: "Eco Solutions", amount: "$78,000", assessor: "John D.", due: "Mar 5, 2026" },
      { id: "P-099", name: "Digital Literacy Program", applicant: "Tech For All", amount: "$25,000", assessor: "Sarah M.", due: "Mar 6, 2026" },
    ],
    review: [
      { id: "P-095", name: "Senior Wellness Center", applicant: "Elder Care Co", amount: "$120,000", assessor: "Mike R.", score: "8.2" },
      { id: "P-096", name: "Food Security Network", applicant: "Hunger Relief", amount: "$55,000", assessor: "Lisa K.", score: "7.8" },
      { id: "P-097", name: "Education Technology", applicant: "EduTech Inc", amount: "$89,000", assessor: "John D.", score: "9.1" },
    ],
    completed: [
      { id: "P-090", name: "Healthcare Access", applicant: "Health First", amount: "$150,000", status: "Approved", date: "Feb 28, 2026" },
      { id: "P-091", name: "Housing Initiative", applicant: "Shelter Org", amount: "$200,000", status: "Approved", date: "Feb 27, 2026" },
      { id: "P-092", name: "Transport Subsidy", applicant: "Mobility Aid", amount: "$35,000", status: "Declined", date: "Feb 26, 2026" },
    ],
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Tenant Overview" subtitle="Your organization's funding pipeline" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Funds Available" value="$1.2M" description="Across 8 active funds" trend="neutral" icon={Wallet} />
        <StatCard title="In Review" value="7" description="3 due this week" trend="neutral" icon={Clock} />
        <StatCard title="Completed (MTD)" value="23" description="+8 from last month" trend="up" icon={FileCheck} />
        <StatCard title="Monthly Cost" value="$234" description="LLM processing" trend="neutral" icon={DollarSign} />
      </div>

      <DataCard title="Proposal Pipeline">
        <Tabs defaultValue="new">
          <TabsList>
            <TabsTrigger value="new">New <Badge variant="secondary" className="ml-1.5">{pipelineData.new.length}</Badge></TabsTrigger>
            <TabsTrigger value="assigned">Assigned <Badge variant="secondary" className="ml-1.5">{pipelineData.assigned.length}</Badge></TabsTrigger>
            <TabsTrigger value="review">In Review <Badge variant="secondary" className="ml-1.5">{pipelineData.review.length}</Badge></TabsTrigger>
            <TabsTrigger value="completed">Completed <Badge variant="secondary" className="ml-1.5">{pipelineData.completed.length}</Badge></TabsTrigger>
          </TabsList>

          <TabsContent value="new">
            <Table>
              <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Proposal</TableHead><TableHead>Applicant</TableHead><TableHead>Amount</TableHead><TableHead>Submitted</TableHead></TableRow></TableHeader>
              <TableBody>
                {pipelineData.new.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{item.id}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.applicant}</TableCell>
                    <TableCell>{item.amount}</TableCell>
                    <TableCell className="text-muted-foreground">{item.submitted}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="assigned">
            <Table>
              <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Proposal</TableHead><TableHead>Applicant</TableHead><TableHead>Assessor</TableHead><TableHead>Due Date</TableHead></TableRow></TableHeader>
              <TableBody>
                {pipelineData.assigned.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{item.id}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.applicant}</TableCell>
                    <TableCell>{item.assessor}</TableCell>
                    <TableCell><Badge variant="warning">{item.due}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="review">
            <Table>
              <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Proposal</TableHead><TableHead>Applicant</TableHead><TableHead>Assessor</TableHead><TableHead>Score</TableHead></TableRow></TableHeader>
              <TableBody>
                {pipelineData.review.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{item.id}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.applicant}</TableCell>
                    <TableCell>{item.assessor}</TableCell>
                    <TableCell><Badge variant="info">{item.score}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="completed">
            <Table>
              <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Proposal</TableHead><TableHead>Applicant</TableHead><TableHead>Status</TableHead><TableHead>Completed</TableHead></TableRow></TableHeader>
              <TableBody>
                {pipelineData.completed.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{item.id}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.applicant}</TableCell>
                    <TableCell>
                      <Badge variant={item.status === "Approved" ? "success" : "destructive"}>
                        {item.status === "Approved" ? <CheckCircle className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </DataCard>
    </div>
  );
}

function AssessorOverview() {
  const queue = [
    { id: "P-095", name: "Senior Wellness Center", tenant: "Elder Care Co", priority: "High", status: "In Progress", due: "Mar 3, 2026", daysLeft: 1 },
    { id: "P-098", name: "Green Energy Project", tenant: "Eco Solutions", priority: "High", status: "Not Started", due: "Mar 5, 2026", daysLeft: 3 },
    { id: "P-096", name: "Food Security Network", tenant: "Hunger Relief", priority: "Medium", status: "In Progress", due: "Mar 4, 2026", daysLeft: 2 },
    { id: "P-099", name: "Digital Literacy Program", tenant: "Tech For All", priority: "Medium", status: "Not Started", due: "Mar 6, 2026", daysLeft: 4 },
    { id: "P-100", name: "Arts & Culture Festival", tenant: "Creative Minds", priority: "Low", status: "Not Started", due: "Mar 10, 2026", daysLeft: 8 },
  ];

  const priorityStyles = {
    High: "destructive",
    Medium: "warning",
    Low: "secondary",
  } as const;

  const statusStyles = {
    "In Progress": "info",
    "Not Started": "outline",
  } as const;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Dashboard"
        subtitle="Your assessment queue and progress"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Assigned" value="5" description="Total in queue" icon={Target} />
        <StatCard title="Due Soon" value="2" description="Within 48 hours" trend="neutral" icon={AlertTriangle} />
        <StatCard title="Completed (Week)" value="8" description="+2 from last week" trend="up" icon={CheckCircle} />
        <StatCard title="Avg Turnaround" value="1.8 days" description="-0.4 days improved" trend="up" icon={Timer} />
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
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All <Badge variant="secondary" className="ml-1.5">5</Badge></TabsTrigger>
            <TabsTrigger value="high">High Priority <Badge variant="destructive" className="ml-1.5">2</Badge></TabsTrigger>
            <TabsTrigger value="in-progress">In Progress <Badge variant="info" className="ml-1.5">2</Badge></TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <div className="space-y-2">
              {queue.map((item) => (
                <QueueItem key={item.id} item={item} priorityStyles={priorityStyles} statusStyles={statusStyles} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="high">
            <div className="space-y-2">
              {queue.filter(q => q.priority === "High").map((item) => (
                <QueueItem key={item.id} item={item} priorityStyles={priorityStyles} statusStyles={statusStyles} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="in-progress">
            <div className="space-y-2">
              {queue.filter(q => q.status === "In Progress").map((item) => (
                <QueueItem key={item.id} item={item} priorityStyles={priorityStyles} statusStyles={statusStyles} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
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
  priorityStyles: Record<string, "destructive" | "warning" | "secondary">;
  statusStyles: Record<string, "info" | "outline">;
}

function QueueItem({ item, priorityStyles, statusStyles }: QueueItemProps) {
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
          <Badge variant={priorityStyles[item.priority as keyof typeof priorityStyles]}>
            {item.priority}
          </Badge>
          <Badge variant={statusStyles[item.status as keyof typeof statusStyles]}>
            {item.status}
          </Badge>
        </div>
        <div className="hidden md:block text-right">
          <p className="text-sm font-medium">{item.due}</p>
          <p className={`text-xs ${item.daysLeft <= 2 ? "text-destructive" : "text-muted-foreground"}`}>
            {item.daysLeft} day{item.daysLeft !== 1 ? "s" : ""} left
          </p>
        </div>
      </div>
      <Button variant="outline" size="sm" className="ml-4">
        Open
      </Button>
    </div>
  );
}
