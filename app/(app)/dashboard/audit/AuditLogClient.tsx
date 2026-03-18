"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PageHeader, DataCard } from "@/components/app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  History,
  Loader2,
  RefreshCw,
  Filter,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  actorUserId: string;
  actorEmail?: string;
  tenantId: string | null;
  resourceType: string;
  resourceId: string;
  details?: Record<string, unknown>;
}

const ACTION_LABELS: Record<string, string> = {
  "proposal.status_update": "Status Update",
  "proposal.evaluate": "Evaluation",
  "proposal_document.upload": "Document Upload",
  "proposal_document.delete": "Document Delete",
  "proposal_document.download": "Document Download",
  "proposal.assign_to_assessor": "Assign to Assessor",
  "proposal.assign_to_queue": "Assign to Queue",
  "proposal.memo_generated": "Memo Generated",
  "fund_mandate.upload": "Mandate Upload",
  "fund_mandate.download": "Mandate Download",
  "fund_mandate.create": "Mandate Create",
  "queue.create": "Queue Create",
  "queue.update": "Queue Update",
  "queue.delete": "Queue Delete",
};

function formatAction(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(/_/g, " ").replace(/\./g, " → ");
}

function formatTimestamp(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleString();
  } catch {
    return ts;
  }
}

function getBeforeAfter(details?: Record<string, unknown>): { before: string; after: string } {
  if (!details) return { before: "—", after: "—" };
  const before = details.before != null ? String(details.before) : "—";
  const after = details.after != null ? String(details.after) : "—";
  return { before, after };
}

function getProposalId(entry: AuditEntry): string {
  if (entry.resourceType === "proposal" || entry.resourceType === "proposal_document" || entry.resourceType === "proposal_evaluation" || entry.resourceType === "proposal_memo") {
    return entry.resourceId;
  }
  return (entry.details?.proposalId as string) ?? "—";
}

function getRowHighlight(
  entry: AuditEntry,
  overrides: { statusChanges: boolean; deletions: boolean; evaluations: boolean }
): string {
  if (overrides.statusChanges && entry.action === "proposal.status_update") {
    return "bg-amber-50/70 dark:bg-amber-950/20";
  }
  if (overrides.deletions && (entry.action === "proposal_document.delete" || entry.action === "queue.delete")) {
    return "bg-red-50/70 dark:bg-red-950/20";
  }
  if (overrides.evaluations && (entry.action === "proposal.evaluate" || entry.action === "proposal.memo_generated")) {
    return "bg-emerald-50/50 dark:bg-emerald-950/20";
  }
  return "";
}

export default function AuditLogClient() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<{ id: string; email: string }[]>([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [userId, setUserId] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [proposalIdFilter, setProposalIdFilter] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(true);

  const [highlightStatus, setHighlightStatus] = useState(true);
  const [highlightDeletions, setHighlightDeletions] = useState(true);
  const [highlightEvaluations, setHighlightEvaluations] = useState(false);

  const loadAudit = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", `${startDate}T00:00:00.000Z`);
      if (endDate) params.set("endDate", `${endDate}T23:59:59.999Z`);
      if (userId) params.set("userId", userId);
      if (actionFilter) params.set("action", actionFilter);
      if (proposalIdFilter) params.set("proposalId", proposalIdFilter);
      params.set("limit", "100");

      const res = await fetch(`/api/tenant/audit?${params}`);
      const data = await res.json();
      if (data.ok && data.data) {
        setEntries(data.data.entries ?? []);
        setTotal(data.data.total ?? 0);
        setUsers(data.data.users ?? []);
      }
    } catch (e) {
      console.error("Failed to load audit log:", e);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, userId, actionFilter, proposalIdFilter]);

  useEffect(() => {
    loadAudit();
  }, [loadAudit]);

  const actions = Array.from(new Set(entries.map((e) => e.action))).sort();
  const allActions = [...new Set([...Object.keys(ACTION_LABELS), ...actions])].sort();

  const highlightOverrides = {
    statusChanges: highlightStatus,
    deletions: highlightDeletions,
    evaluations: highlightEvaluations,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        subtitle="Track user actions and system events"
        actions={
          <Button variant="outline" size="sm" onClick={loadAudit} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      {/* Filters */}
      <Card>
        <CardHeader className="py-4">
          <button
            type="button"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="flex items-center justify-between w-full text-left"
          >
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
            {filtersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </CardHeader>
        {filtersOpen && (
          <CardContent className="pt-0 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-2">
                <Label>Date from</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Date to</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>User</Label>
                <Select value={userId || "_all"} onValueChange={(v) => setUserId(v === "_all" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">All users</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Action type</Label>
                <Select value={actionFilter || "_all"} onValueChange={(v) => setActionFilter(v === "_all" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">All actions</SelectItem>
                    {allActions.map((a) => (
                      <SelectItem key={a} value={a}>
                        {formatAction(a)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Proposal ID</Label>
                <Input
                  placeholder="e.g. P-101"
                  value={proposalIdFilter}
                  onChange={(e) => setProposalIdFilter(e.target.value)}
                />
              </div>
            </div>
            <Button size="sm" onClick={loadAudit} disabled={loading}>
              Apply
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Highlight overrides */}
      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-base">Highlight overrides</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id="highlight-status"
                checked={highlightStatus}
                onCheckedChange={setHighlightStatus}
              />
              <Label htmlFor="highlight-status" className="font-normal cursor-pointer">
                Status changes <span className="text-amber-600">(amber)</span>
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="highlight-deletions"
                checked={highlightDeletions}
                onCheckedChange={setHighlightDeletions}
              />
              <Label htmlFor="highlight-deletions" className="font-normal cursor-pointer">
                Deletions <span className="text-red-600">(red)</span>
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="highlight-evaluations"
                checked={highlightEvaluations}
                onCheckedChange={setHighlightEvaluations}
              />
              <Label htmlFor="highlight-evaluations" className="font-normal cursor-pointer">
                Evaluations / Memos <span className="text-emerald-600">(green)</span>
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <DataCard
        title="Audit entries"
        description={`${total} entries`}
        noPadding
      >
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <History className="h-12 w-12 mb-4 opacity-50" />
            <p>No audit entries found.</p>
            <p className="text-sm mt-1">Try adjusting filters or perform some actions.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Proposal ID</TableHead>
                <TableHead>Before</TableHead>
                <TableHead>After</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => {
                const { before, after } = getBeforeAfter(entry.details);
                const proposalId = getProposalId(entry);
                return (
                  <TableRow
                    key={entry.id}
                    className={cn(getRowHighlight(entry, highlightOverrides))}
                  >
                    <TableCell className="font-medium">
                      {formatAction(entry.action)}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{entry.actorEmail ?? entry.actorUserId ?? "—"}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatTimestamp(entry.timestamp)}
                    </TableCell>
                    <TableCell>
                      {proposalId !== "—" ? (
                        <Link
                          href={`/dashboard/proposals/${proposalId}`}
                          className="text-primary hover:underline font-mono text-sm"
                        >
                          {proposalId}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {before}
                    </TableCell>
                    <TableCell className="text-sm">
                      {after}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </DataCard>
    </div>
  );
}
