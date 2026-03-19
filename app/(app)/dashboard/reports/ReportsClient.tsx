"use client";

import { useState } from "react";
import { PageHero, StatusBadge } from "@/components/app";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Wallet,
  FileCheck,
  Target,
  TrendingUp,
  Loader2,
  FileSpreadsheet,
  FileType,
} from "lucide-react";
import { LucideIcon } from "lucide-react";

interface ReportsClientProps {
  role?: string;
  productionMode?: boolean;
}

export default function ReportsClient({ role, productionMode }: ReportsClientProps) {
  if (role === "saas_admin") {
    return <SaaSAdminReports productionMode={productionMode} />;
  }
  if (role === "tenant_admin" || role === "fund_manager" || role === "viewer") {
    return <TenantReports productionMode={productionMode} />;
  }
  return <AssessorReports productionMode={productionMode} />;
}

interface Report {
  id: string;
  title: string;
  description: string;
  type: string;
  format: "PDF" | "Excel" | "CSV";
  generated: string;
  size: string;
  icon: LucideIcon;
}

function SaaSAdminReports({ productionMode }: { productionMode?: boolean }) {
  const allReports: Report[] = [
    { id: "r-001", title: "Monthly Usage Summary", description: "Comprehensive overview of platform usage metrics across all tenants", type: "Usage", format: "PDF", generated: "Mar 1, 2026", size: "2.4 MB", icon: BarChart3 },
    { id: "r-002", title: "Tenant Activity Report", description: "Detailed breakdown of user activity and engagement per tenant", type: "Activity", format: "Excel", generated: "Mar 1, 2026", size: "1.8 MB", icon: Users },
    { id: "r-003", title: "Cost Allocation Report", description: "LLM costs and resource usage attributed to each tenant", type: "Financial", format: "PDF", generated: "Feb 28, 2026", size: "3.1 MB", icon: DollarSign },
    { id: "r-004", title: "Assessment Completion Rates", description: "Analysis of proposal assessment turnaround times", type: "Performance", format: "PDF", generated: "Feb 28, 2026", size: "1.2 MB", icon: CheckCircle },
    { id: "r-005", title: "API Response Latency", description: "LLM provider response times and availability metrics", type: "Technical", format: "CSV", generated: "Feb 27, 2026", size: "856 KB", icon: Clock },
    { id: "r-006", title: "Subscription Audit Log", description: "Complete audit trail of subscription changes", type: "Audit", format: "PDF", generated: "Feb 25, 2026", size: "4.2 MB", icon: FileText },
  ];

  const reports = productionMode ? [] : allReports;

  const typeVariants: Record<string, "default" | "info" | "success" | "warning" | "muted"> = {
    Usage: "default",
    Activity: "info",
    Financial: "success",
    Performance: "info",
    Technical: "warning",
    Audit: "muted",
  };

  return (
    <div className="space-y-6">
      <PageHero
        variant="reports"
        title="Reports"
        subtitle="Download and manage platform reports"
        actions={
          !productionMode && (
            <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Report
            </Button>
          )
        }
      />

      {reports.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No reports available</p>
          <p className="text-sm mt-1">Advanced analytics reports are not configured yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => (
            <ReportCard key={report.id} report={report} typeVariants={typeVariants} />
          ))}
        </div>
      )}
    </div>
  );
}

const TENANT_ADVANCED_REPORT_IDS = ["r-102", "r-103", "r-104", "r-106"]; // Fund Allocation, Assessor Performance, Monthly Activity Log, Usage & Cost

function TenantReports({ productionMode }: { productionMode?: boolean }) {
  const allReports: Report[] = [
    { id: "r-101", title: "Proposal Evaluation Reports", description: "Overview of all proposals by status, fund, and assessor", type: "Proposals", format: "PDF", generated: "Mar 1, 2026", size: "1.2 MB", icon: FileText },
    { id: "r-102", title: "Fund Allocation Report", description: "Detailed breakdown of fund usage and remaining capacity", type: "Funds", format: "Excel", generated: "Mar 1, 2026", size: "890 KB", icon: Wallet },
    { id: "r-103", title: "Assessor Performance", description: "Assessment completion rates and review times by assessor", type: "Performance", format: "PDF", generated: "Feb 28, 2026", size: "1.5 MB", icon: Users },
    { id: "r-104", title: "Monthly Activity Log", description: "Complete audit trail of user actions and system events", type: "Audit", format: "CSV", generated: "Feb 28, 2026", size: "2.1 MB", icon: Clock },
    { id: "r-105", title: "Generated Investment Reports", description: "Summary of all approved proposals with funding details", type: "Proposals", format: "PDF", generated: "Feb 25, 2026", size: "3.4 MB", icon: FileCheck },
    { id: "r-106", title: "Usage & Cost Report", description: "LLM usage breakdown and cost attribution", type: "Costs", format: "PDF", generated: "Feb 25, 2026", size: "780 KB", icon: DollarSign },
  ];

  const reports = productionMode
    ? allReports.filter((r) => !TENANT_ADVANCED_REPORT_IDS.includes(r.id))
    : allReports;

  const typeVariants: Record<string, "default" | "info" | "success" | "warning" | "muted"> = {
    Proposals: "default",
    Funds: "success",
    Performance: "info",
    Audit: "muted",
    Costs: "warning",
  };

  return (
    <div className="space-y-6">
      <PageHero
        variant="reports"
        title="Reports"
        subtitle="Download organization reports"
        actions={
          !productionMode && (
            <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Report
            </Button>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <ReportCard key={report.id} report={report} typeVariants={typeVariants} />
        ))}
      </div>
    </div>
  );
}

const ASSESSOR_ADVANCED_REPORT_IDS = ["r-201", "r-203", "r-204"]; // My Performance, Weekly Activity, Score Distribution

function AssessorReports({ productionMode }: { productionMode?: boolean }) {
  const allReports: Report[] = [
    { id: "r-201", title: "My Performance Summary", description: "Your assessment metrics, completion rates, and turnaround times", type: "Performance", format: "PDF", generated: "Mar 1, 2026", size: "420 KB", icon: TrendingUp },
    { id: "r-202", title: "Completed Assessments", description: "List of all proposals you've assessed with scores and outcomes", type: "History", format: "PDF", generated: "Mar 1, 2026", size: "1.1 MB", icon: CheckCircle },
    { id: "r-203", title: "Weekly Activity Log", description: "Summary of your assessment activity for the past week", type: "Activity", format: "PDF", generated: "Feb 28, 2026", size: "280 KB", icon: Clock },
    { id: "r-204", title: "Score Distribution", description: "Analysis of your scoring patterns and consistency metrics", type: "Analytics", format: "PDF", generated: "Feb 25, 2026", size: "350 KB", icon: Target },
  ];

  const reports = productionMode
    ? allReports.filter((r) => !ASSESSOR_ADVANCED_REPORT_IDS.includes(r.id))
    : allReports;

  const typeVariants: Record<string, "default" | "info" | "success" | "warning" | "muted"> = {
    Performance: "default",
    History: "muted",
    Activity: "info",
    Analytics: "success",
  };

  return (
    <div className="space-y-6">
      <PageHero variant="reports" title="My Reports" subtitle="Your assessment reports and analytics" />

      <div className="grid gap-4 sm:grid-cols-2">
        {reports.map((report) => (
          <ReportCard key={report.id} report={report} typeVariants={typeVariants} />
        ))}
      </div>
    </div>
  );
}

function ReportCard({
  report,
  typeVariants,
}: {
  report: Report;
  typeVariants: Record<string, "default" | "info" | "success" | "warning" | "muted">;
}) {
  const [downloading, setDownloading] = useState(false);
  const Icon = report.icon;

  const formatIcons: Record<string, LucideIcon> = {
    PDF: FileType,
    Excel: FileSpreadsheet,
    CSV: FileText,
  };
  const FormatIcon = formatIcons[report.format];

  const handleDownload = () => {
    setDownloading(true);
    setTimeout(() => setDownloading(false), 1500);
  };

  return (
    <Card className="group hover:shadow-md transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted group-hover:bg-primary/10 transition-colors">
            <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <StatusBadge variant={typeVariants[report.type] || "muted"}>
            {report.type}
          </StatusBadge>
        </div>
        <CardTitle className="text-base mt-3 line-clamp-1">{report.title}</CardTitle>
        <CardDescription className="line-clamp-2">{report.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Separator className="mb-4" />
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <p className="text-xs text-muted-foreground">
              Generated: {report.generated}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FormatIcon className="h-3.5 w-3.5" />
              <span>{report.format}</span>
              <span>•</span>
              <span>{report.size}</span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={downloading}
            className="shrink-0"
          >
            {downloading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Downloading
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
