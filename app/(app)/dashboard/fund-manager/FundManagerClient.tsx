"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PageHeader, DataCard, EmptyState } from "@/components/app";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  Target,
  FileText,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface FundManagerProposal {
  id: string;
  name: string;
  applicant: string;
  fund: string;
  amount: number;
  status: string;
  priority: string;
  fitScore: number | null;
  validationScore: number | null;
  risks: string[];
  documentCount: number;
  hasMissingData: boolean;
  riskLevel: "low" | "medium" | "high";
}

interface FundManagerData {
  proposals: FundManagerProposal[];
  summary: {
    topRisks: string[];
    commonIssues: string[];
    totalProposals: number;
    readyForReview: number;
    needsAttention: number;
  };
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(amount);
}

function getRiskBadgeVariant(level: "low" | "medium" | "high") {
  switch (level) {
    case "high":
      return "destructive";
    case "medium":
      return "secondary";
    default:
      return "outline";
  }
}

interface FundManagerClientProps {
  isReadOnly?: boolean;
}

export default function FundManagerClient({ isReadOnly = false }: FundManagerClientProps) {
  const { toast } = useToast();
  const [data, setData] = useState<FundManagerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/fund-manager", { credentials: "include" });
      const json = await res.json();
      if (json.ok && json.data) {
        setData(json.data);
      } else {
        toast(`Failed to load: ${json.error || "Unknown error"}`);
      }
    } catch {
      toast("Network error loading fund manager data");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusUpdate = async (proposalId: string, status: "Approved" | "Declined" | "Deferred") => {
    setActioning(proposalId);
    try {
      const res = await fetch(`/api/proposals/${proposalId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (json.ok) {
        toast(`Proposal ${status === "Approved" ? "approved" : status === "Declined" ? "rejected" : "deferred"}`);
        await loadData();
      } else {
        toast(`Failed: ${json.error || "Unknown error"}`);
      }
    } catch {
      toast("Network error");
    } finally {
      setActioning(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Fund Manager Dashboard" subtitle="Decision-making overview for investment committee" />
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Fund Manager Dashboard" subtitle="Decision-making overview for investment committee" />
        <EmptyState
          title="Unable to load data"
          description="There was an error loading the fund manager dashboard. Please try again."
          action={{ label: "Retry", onClick: loadData }}
        />
      </div>
    );
  }

  const readyForReview = data.proposals.filter(
    (p) => p.fitScore !== null && (p.status === "In Review" || p.status === "Assigned")
  );

  const needsAttention = data.proposals.filter(
    (p) =>
      p.riskLevel === "high" ||
      p.hasMissingData ||
      (p.validationScore !== null && p.validationScore < 50)
  );

  const canAct = (p: FundManagerProposal) =>
    !isReadOnly && (p.status === "In Review" || p.status === "Assigned");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fund Manager Dashboard"
        subtitle="Decision-making overview for investment committee"
        actions={
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        }
      />

      {/* AI Summary Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            AI Summary Panel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs font-medium text-muted-foreground">Total Proposals</p>
              <p className="text-2xl font-bold">{data.summary.totalProposals}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs font-medium text-muted-foreground">Ready for IC Review</p>
              <p className="text-2xl font-bold text-emerald-600">{data.summary.readyForReview}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs font-medium text-muted-foreground">Needs Attention</p>
              <p className="text-2xl font-bold text-amber-600">{data.summary.needsAttention}</p>
            </div>
          </div>
          {data.summary.topRisks.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Top Risks Across Deals</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {data.summary.topRisks.map((r, i) => (
                  <li key={i}>• {r}</li>
                ))}
              </ul>
            </div>
          )}
          {data.summary.commonIssues.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Common Issues</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {data.summary.commonIssues.map((issue, i) => (
                  <li key={i}>• {issue}</li>
                ))}
              </ul>
            </div>
          )}
          {data.summary.topRisks.length === 0 && data.summary.commonIssues.length === 0 && (
            <p className="text-sm text-muted-foreground">No significant risks or issues identified across deals.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Ready for IC Review */}
        <div className="lg:col-span-2">
          <DataCard
            title="Ready for IC Review"
            description={`${readyForReview.length} proposals with evaluations`}
            noPadding
          >
            {readyForReview.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No proposals ready for IC review yet.</p>
                <p className="text-sm mt-1">Proposals need to be evaluated and in In Review or Assigned status.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Fund</TableHead>
                    <TableHead className="text-right">Fit</TableHead>
                    <TableHead className="text-right">Validation</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {readyForReview.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Link
                          href={`/dashboard/proposals/${p.id}`}
                          className="font-medium hover:underline"
                        >
                          {p.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{p.applicant}</p>
                      </TableCell>
                      <TableCell>{p.fund}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.fitScore !== null ? (
                          <span
                            className={
                              p.fitScore >= 70
                                ? "text-emerald-600 font-medium"
                                : p.fitScore >= 50
                                ? "text-amber-600"
                                : "text-red-600"
                            }
                          >
                            {p.fitScore}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.validationScore !== null ? (
                          <span
                            className={
                              p.validationScore >= 70
                                ? "text-emerald-600"
                                : p.validationScore >= 50
                                ? "text-amber-600"
                                : "text-red-600"
                            }
                          >
                            {p.validationScore}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRiskBadgeVariant(p.riskLevel)}>{p.riskLevel}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {canAct(p) && (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                              onClick={() => handleStatusUpdate(p.id, "Approved")}
                              disabled={!!actioning}
                            >
                              {actioning === p.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <CheckCircle className="h-3 w-3" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => handleStatusUpdate(p.id, "Declined")}
                              disabled={!!actioning}
                            >
                              <XCircle className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusUpdate(p.id, "Deferred")}
                              disabled={!!actioning}
                            >
                              <Clock className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </DataCard>
        </div>

        {/* Needs Attention */}
        <div>
          <DataCard
            title="Needs Attention"
            description="Deals with low scores, missing data, or high risk"
            noPadding
          >
            {needsAttention.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                <CheckCircle className="h-10 w-10 mx-auto mb-2 text-emerald-500 opacity-70" />
                <p>No deals need immediate attention.</p>
              </div>
            ) : (
              <div className="divide-y">
                {needsAttention.map((p) => (
                  <div
                    key={p.id}
                    className={`p-4 ${
                      p.riskLevel === "high" ? "bg-red-50/70 dark:bg-red-950/20" : "bg-amber-50/50 dark:bg-amber-950/10"
                    }`}
                  >
                    <Link
                      href={`/dashboard/proposals/${p.id}`}
                      className="font-medium hover:underline block"
                    >
                      {p.name}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.applicant} • {p.fund}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {p.hasMissingData && (
                        <Badge variant="destructive" className="text-xs">
                          Missing data
                        </Badge>
                      )}
                      {p.validationScore !== null && p.validationScore < 50 && (
                        <Badge variant="destructive" className="text-xs">
                          Low validation ({p.validationScore})
                        </Badge>
                      )}
                      {p.riskLevel === "high" && (
                        <Badge variant="destructive" className="text-xs">
                          High risk
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DataCard>
        </div>
      </div>

      {/* Full proposals table (cards + table combo) */}
      <DataCard
        title="All Proposals"
        description="Full list with Fit Score, Validation Score, and Risk level"
        noPadding
      >
        {data.proposals.length === 0 ? (
          <EmptyState
            title="No proposals"
            description="There are no proposals in this tenant."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Fund</TableHead>
                <TableHead className="text-right">Fit</TableHead>
                <TableHead className="text-right">Validation</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.proposals.map((p) => (
                <TableRow
                  key={p.id}
                  className={p.riskLevel === "high" ? "bg-red-50/50 dark:bg-red-950/10" : undefined}
                >
                  <TableCell>
                    <Link
                      href={`/dashboard/proposals/${p.id}`}
                      className="font-medium hover:underline"
                    >
                      {p.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{p.applicant}</p>
                  </TableCell>
                  <TableCell>{p.fund}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {p.fitScore !== null ? p.fitScore : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {p.validationScore !== null ? p.validationScore : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRiskBadgeVariant(p.riskLevel)}>{p.riskLevel}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatAmount(p.amount)}
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
