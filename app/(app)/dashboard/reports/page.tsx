import { PageHeader } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  Download,
  Calendar,
  BarChart3,
  Users,
  DollarSign,
  Clock,
  CheckCircle,
} from "lucide-react";

const reports = [
  {
    id: "r-001",
    title: "Monthly Usage Summary",
    description: "Comprehensive overview of platform usage metrics across all tenants",
    type: "Usage",
    format: "PDF",
    generated: "Mar 1, 2026",
    size: "2.4 MB",
    icon: BarChart3,
  },
  {
    id: "r-002",
    title: "Tenant Activity Report",
    description: "Detailed breakdown of user activity and engagement per tenant",
    type: "Activity",
    format: "Excel",
    generated: "Mar 1, 2026",
    size: "1.8 MB",
    icon: Users,
  },
  {
    id: "r-003",
    title: "Cost Allocation Report",
    description: "LLM costs and resource usage attributed to each tenant",
    type: "Financial",
    format: "PDF",
    generated: "Feb 28, 2026",
    size: "3.1 MB",
    icon: DollarSign,
  },
  {
    id: "r-004",
    title: "Assessment Completion Rates",
    description: "Analysis of proposal assessment turnaround times and completion rates",
    type: "Performance",
    format: "PDF",
    generated: "Feb 28, 2026",
    size: "1.2 MB",
    icon: CheckCircle,
  },
  {
    id: "r-005",
    title: "API Response Latency",
    description: "LLM provider response times and availability metrics",
    type: "Technical",
    format: "CSV",
    generated: "Feb 27, 2026",
    size: "856 KB",
    icon: Clock,
  },
  {
    id: "r-006",
    title: "Subscription Audit Log",
    description: "Complete audit trail of subscription changes and configurations",
    type: "Audit",
    format: "PDF",
    generated: "Feb 25, 2026",
    size: "4.2 MB",
    icon: FileText,
  },
];

const typeColors = {
  Usage: "default",
  Activity: "secondary",
  Financial: "success",
  Performance: "info",
  Technical: "warning",
  Audit: "outline",
} as const;

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Download and manage platform reports"
        actions={
          <Button>
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Report
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <Card key={report.id} className="group hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                    <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <Badge variant={typeColors[report.type as keyof typeof typeColors]}>
                    {report.type}
                  </Badge>
                </div>
                <CardTitle className="text-base mt-3">{report.title}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {report.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Separator className="mb-4" />
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Generated: {report.generated}</p>
                    <p>{report.format} • {report.size}</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
