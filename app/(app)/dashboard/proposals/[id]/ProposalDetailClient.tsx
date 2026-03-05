"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { PageHeader, StatusBadge, DataCard, EmptyState } from "@/components/app";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  AlertCircle,
  FileText,
  User,
  Users,
  DollarSign,
  Calendar,
  Building,
  CheckCircle,
  XCircle,
  Clock,
  UserPlus,
  LucideIcon,
  Upload,
  Download,
  Trash2,
  Loader2,
  RefreshCw,
  Globe,
  Target,
  Briefcase,
  FileStack,
  Hash,
  Play,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Award,
  History,
  ShieldCheck,
  Info,
} from "lucide-react";
import type { Proposal, ProposalStatus } from "@/lib/mock/proposals";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Types for fund selection
interface FundOption {
  id: string;
  name: string;
  code?: string;
  status: string;
}

interface FundMandateInfo {
  id: string;
  name: string;
  strategy: string;
  geography: string;
  minTicket: number;
  maxTicket: number;
  status: string;
}

// NEW: Types for fund mandate
interface MandateTemplateFile {
  name: string;
  blobPath: string;
  uploadedAt: string;
  size: number;
}

interface MandateData {
  mandateId: string;
  mandateName: string;
  strategy: string;
  geography: string;
  ticketRange: string;
  version: number;
  status: string;
  notes?: string;
  templateFiles: MandateTemplateFile[];
}

// NEW: Types for evaluation
interface EvaluationReport {
  evaluationId: string;
  evaluatedAt: string;
  evaluatedByEmail: string;
  fitScore: number;
  mandateSummary: string;
  proposalSummary: string;
  strengths: string[];
  risks: string[];
  recommendations: string[];
  confidence: "low" | "medium" | "high";
  model: string;
  inputs: {
    proposalDocuments: number;
    mandateTemplates: number;
    totalCharactersProcessed?: number;
    extractionWarnings?: string[];
  };
  engineType: "stub" | "llm";
}

interface EvaluationMetadata {
  blobPath: string;
  evaluationId: string;
  evaluatedAt: string;
  fitScore: number;
}

// NEW: Types for proposal documents
interface ProposalDocumentBlob {
  blobPath: string;
  filename: string;
  size: number;
  contentType: string;
  uploadedAt: string;
  timestamp: string;
}

// NEW: Format file size helper
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// NEW: Format date helper
function formatDate(dateString: string): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// NEW: Get file type display name
function getFileTypeDisplay(contentType: string): string {
  if (contentType.includes("pdf")) return "PDF";
  if (contentType.includes("word") || contentType.includes("document")) return "DOC";
  if (contentType.includes("excel") || contentType.includes("spreadsheet")) return "XLS";
  if (contentType.includes("powerpoint") || contentType.includes("presentation")) return "PPT";
  if (contentType.includes("image")) return "IMG";
  if (contentType.includes("text/plain")) return "TXT";
  if (contentType.includes("csv")) return "CSV";
  return "FILE";
}

const statusVariants: Record<ProposalStatus, "muted" | "info" | "warning" | "success" | "error"> = {
  New: "muted",
  Assigned: "info",
  "In Review": "warning",
  Approved: "success",
  Declined: "error",
};

const statusIcons: Record<ProposalStatus, LucideIcon> = {
  New: FileText,
  Assigned: UserPlus,
  "In Review": Clock,
  Approved: CheckCircle,
  Declined: XCircle,
};

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(amount);
}

interface CurrentAssignment {
  assignedToUserId: string | null;
  assignedToName: string | null;
  assignedQueueId: string | null;
  assignedQueueName: string | null;
}

interface Assessor {
  id: string;
  name: string;
  email: string;
}

interface Queue {
  id: string;
  name: string;
  description?: string;
}

interface ProposalDetailClientProps {
  proposal: Proposal | null;
  canAssign: boolean;
  canManageDocuments?: boolean;
  currentAssignment?: CurrentAssignment;
  error?: string;
}

export default function ProposalDetailClient({ proposal, canAssign, canManageDocuments = false, currentAssignment, error }: ProposalDetailClientProps) {
  // Document management state
  const [documents, setDocuments] = useState<ProposalDocumentBlob[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Assignment state
  const [assessors, setAssessors] = useState<Assessor[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [selectedAssessor, setSelectedAssessor] = useState<string>("");
  const [selectedQueue, setSelectedQueue] = useState<string>("");
  const [assignmentMode, setAssignmentMode] = useState<"user" | "queue">("user");
  const [assigning, setAssigning] = useState(false);
  const [assignMessage, setAssignMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [assignment, setAssignment] = useState<CurrentAssignment | undefined>(currentAssignment);

  // Load assessors and queues for assignment
  useEffect(() => {
    if (canAssign && proposal) {
      Promise.all([
        fetch("/api/tenant/assessors").then((r) => r.json()),
        fetch("/api/tenant/queues").then((r) => r.json()),
      ]).then(([assessorRes, queueRes]) => {
        if (assessorRes.ok) setAssessors(assessorRes.data.assessors || []);
        if (queueRes.ok) setQueues(queueRes.data.queues || []);
      });
    }
  }, [canAssign, proposal]);

  // Handle assignment
  const handleAssign = async () => {
    if (!proposal) return;
    setAssigning(true);
    setAssignMessage(null);

    try {
      const body: { assignedUserId?: string; queueId?: string } = {};
      if (assignmentMode === "user" && selectedAssessor) {
        body.assignedUserId = selectedAssessor;
      } else if (assignmentMode === "queue" && selectedQueue) {
        body.queueId = selectedQueue;
      } else {
        setAssignMessage({ text: "Please select an assessor or queue", type: "error" });
        setAssigning(false);
        return;
      }

      const res = await fetch(`/api/tenant/proposals/${proposal.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.ok) {
        const assignee = assessors.find((a) => a.id === data.data.assignedToUserId);
        const queue = queues.find((q) => q.id === data.data.assignedQueueId);
        setAssignment({
          assignedToUserId: data.data.assignedToUserId,
          assignedToName: assignee?.name || null,
          assignedQueueId: data.data.assignedQueueId,
          assignedQueueName: queue?.name || null,
        });
        setAssignMessage({ text: "Assignment updated successfully", type: "success" });
        setSelectedAssessor("");
        setSelectedQueue("");
      } else {
        setAssignMessage({ text: data.error || "Assignment failed", type: "error" });
      }
    } catch {
      setAssignMessage({ text: "Network error during assignment", type: "error" });
    }

    setAssigning(false);
  };

  // Fund selection state
  const [funds, setFunds] = useState<FundOption[]>([]);
  const [selectedFundId, setSelectedFundId] = useState<string>("");
  const [fundMandates, setFundMandates] = useState<FundMandateInfo[]>([]);
  const [loadingFunds, setLoadingFunds] = useState(false);
  const [loadingFundMandates, setLoadingFundMandates] = useState(false);

  // Load funds on mount
  useEffect(() => {
    const loadFunds = async () => {
      setLoadingFunds(true);
      try {
        const res = await fetch("/api/tenant/funds");
        const data = await res.json();
        if (data.ok) {
          setFunds(data.data.funds || []);
        }
      } catch {
        console.error("Failed to load funds");
      }
      setLoadingFunds(false);
    };
    loadFunds();
  }, []);

  // Load fund mandates when fund is selected
  useEffect(() => {
    if (!selectedFundId) {
      return;
    }

    const loadFundMandates = async () => {
      setLoadingFundMandates(true);
      try {
        const res = await fetch(`/api/tenant/funds/${selectedFundId}/mandates`);
        const data = await res.json();
        if (data.ok) {
          setFundMandates(data.data.linkedMandates || []);
        } else {
          setFundMandates([]);
        }
      } catch {
        console.error("Failed to load fund mandates");
        setFundMandates([]);
      }
      setLoadingFundMandates(false);
    };
    loadFundMandates();
  }, [selectedFundId]);

  // NEW: Mandate state
  const [mandate, setMandate] = useState<MandateData | null>(null);
  const [mandateLoading, setMandateLoading] = useState(false);
  const [mandateError, setMandateError] = useState<string | null>(null);

  // NEW: Load mandate data
  const loadMandate = useCallback(async (proposalId: string) => {
    setMandateLoading(true);
    setMandateError(null);
    try {
      const res = await fetch(`/api/proposals/${proposalId}/mandate`);
      const data = await res.json();
      if (data.ok && data.data.mandate) {
        setMandate(data.data.mandate);
      } else if (data.data?.message) {
        setMandateError(data.data.message);
      }
    } catch {
      setMandateError("Failed to load mandate information");
    }
    setMandateLoading(false);
  }, []);

  // NEW: Load mandate on mount
  useEffect(() => {
    const id = proposal?.id;
    if (id) {
      queueMicrotask(() => { loadMandate(id); });
    }
  }, [proposal?.id, loadMandate]);

  // NEW: Handle mandate template file download
  const handleMandateFileDownload = (blobName: string) => {
    window.open(
      `/api/tenant/fund-mandates/download?blobName=${encodeURIComponent(blobName)}`,
      "_blank"
    );
  };

  // NEW: Evaluation state
  const [evaluations, setEvaluations] = useState<EvaluationMetadata[]>([]);
  const [latestEvaluation, setLatestEvaluation] = useState<EvaluationReport | null>(null);
  const [evaluationsLoading, setEvaluationsLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationMessage, setEvaluationMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // NEW: Load evaluations
  const loadEvaluations = useCallback(async (proposalId?: string) => {
    const id = proposalId || proposal?.id;
    if (!id) return;
    setEvaluationsLoading(true);
    try {
      const res = await fetch(`/api/proposals/${id}/evaluations?includeLatest=true`);
      const data = await res.json();
      if (data.ok) {
        setEvaluations(data.data.evaluations || []);
        setLatestEvaluation(data.data.latestReport || null);
      }
    } catch {
      console.error("Failed to load evaluations");
    }
    setEvaluationsLoading(false);
  }, [proposal?.id]);

  // NEW: Load evaluations on mount
  useEffect(() => {
    const id = proposal?.id;
    if (id) {
      queueMicrotask(() => { loadEvaluations(id); });
    }
  }, [proposal?.id, loadEvaluations]);

  // NEW: Run evaluation
  const handleRunEvaluation = async () => {
    if (!proposal) return;
    setEvaluating(true);
    setEvaluationMessage(null);

    try {
      const res = await fetch(`/api/proposals/${proposal.id}/evaluate`, {
        method: "POST",
      });

      const data = await res.json();

      if (data.ok) {
        setEvaluationMessage({
          text: `Evaluation completed. Fit Score: ${data.data.report.fitScore}`,
          type: "success",
        });
        setLatestEvaluation(data.data.report);
        await loadEvaluations();
      } else {
        setEvaluationMessage({ text: data.error || "Evaluation failed", type: "error" });
      }
    } catch {
      setEvaluationMessage({ text: "Network error during evaluation", type: "error" });
    }

    setEvaluating(false);
  };

  // NEW: Download evaluation
  const handleDownloadEvaluation = (blobPath: string) => {
    if (!proposal) return;
    window.open(
      `/api/proposals/${proposal.id}/evaluations/download?blobPath=${encodeURIComponent(blobPath)}`,
      "_blank"
    );
  };

  // NEW: Get score color
  const getScoreColor = (score: number): string => {
    if (score >= 85) return "text-emerald-600";
    if (score >= 70) return "text-amber-600";
    return "text-red-600";
  };

  const getScoreBg = (score: number): string => {
    if (score >= 85) return "bg-emerald-100";
    if (score >= 70) return "bg-amber-100";
    return "bg-red-100";
  };

  // NEW: Get confidence color
  const getConfidenceColor = (confidence: "low" | "medium" | "high"): string => {
    if (confidence === "high") return "text-emerald-600 bg-emerald-100";
    if (confidence === "medium") return "text-amber-600 bg-amber-100";
    return "text-red-600 bg-red-100";
  };

  // NEW: Load documents
  const loadDocuments = useCallback(async (proposalId?: string) => {
    const id = proposalId || proposal?.id;
    if (!id) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/proposals/${id}/documents`);
      const data = await res.json();
      if (data.ok) {
        setDocuments(data.data.flat || []);
      } else {
        setMessage({ text: data.error || "Failed to load documents", type: "error" });
      }
    } catch {
      setMessage({ text: "Network error loading documents", type: "error" });
    }
    setLoading(false);
  }, [proposal?.id]);

  // NEW: Load documents on mount
  useEffect(() => {
    const id = proposal?.id;
    if (id) {
      queueMicrotask(() => { loadDocuments(id); });
    }
  }, [proposal?.id, loadDocuments]);

  // NEW: Handle file upload
  const handleUpload = async (file: File) => {
    if (!proposal) return;
    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/proposals/${proposal.id}/documents`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.ok) {
        setMessage({ text: `Uploaded: ${data.data.filename}`, type: "success" });
        await loadDocuments();
      } else {
        setMessage({ text: data.error || "Upload failed", type: "error" });
      }
    } catch {
      setMessage({ text: "Network error during upload", type: "error" });
    }

    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle file download
  const handleDownload = (blobPath: string) => {
    if (!proposal) return;
    window.open(
      `/api/proposals/${proposal.id}/documents/download?key=${encodeURIComponent(blobPath)}`,
      "_blank"
    );
  };

  // Handle file delete
  const handleDelete = async (blobPath: string, filename: string) => {
    if (!proposal) return;
    if (!confirm(`Are you sure you want to delete "${filename}"?`)) return;

    setDeleting(blobPath);
    setMessage(null);

    try {
      const res = await fetch(
        `/api/proposals/${proposal.id}/documents/delete?key=${encodeURIComponent(blobPath)}`,
        { method: "DELETE" }
      );

      const data = await res.json();

      if (data.ok) {
        setMessage({ text: `Deleted: ${filename}`, type: "success" });
        await loadDocuments();
      } else {
        setMessage({ text: data.error || "Delete failed", type: "error" });
      }
    } catch {
      setMessage({ text: "Network error during delete", type: "error" });
    }

    setDeleting(null);
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/proposals">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Proposals
            </Button>
          </Link>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/proposals">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Proposals
            </Button>
          </Link>
        </div>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Proposal not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  const StatusIcon = statusIcons[proposal.status];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/proposals">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Proposals
          </Button>
        </Link>
      </div>

      <PageHeader
        title={proposal.name}
        subtitle={`Proposal ${proposal.id}`}
        actions={
          <div className="flex items-center gap-2">
            {proposal.status === "New" && (
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Assign Assessor
              </Button>
            )}
            {proposal.status === "In Review" && (
              <>
                <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                  <XCircle className="h-4 w-4 mr-2" />
                  Decline
                </Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Proposal Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Proposal ID</p>
                <p className="text-sm text-muted-foreground font-mono">{proposal.id}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Applicant</p>
                <p className="text-sm text-muted-foreground">{proposal.applicant}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Requested Amount</p>
                <p className="text-sm text-muted-foreground">{formatAmount(proposal.amount)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Submitted</p>
                <p className="text-sm text-muted-foreground">{proposal.submittedAt}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status & Assignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Current Status</p>
              <StatusBadge variant={statusVariants[proposal.status]} icon={StatusIcon}>
                {proposal.status}
              </StatusBadge>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Fund</p>
              <p className="text-sm text-muted-foreground">{proposal.fund}</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Select Fund to View Mandates</p>
              <Select
                value={selectedFundId}
                onValueChange={setSelectedFundId}
                disabled={loadingFunds}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={loadingFunds ? "Loading funds..." : "Select a fund"} />
                </SelectTrigger>
                <SelectContent>
                  {funds.map((fund) => (
                    <SelectItem key={fund.id} value={fund.id}>
                      {fund.name} {fund.code ? `(${fund.code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Priority</p>
              <StatusBadge
                variant={
                  proposal.priority === "High" ? "error" :
                  proposal.priority === "Medium" ? "warning" : "muted"
                }
              >
                {proposal.priority}
              </StatusBadge>
            </div>
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Assigned To</p>
                <p className="text-sm text-muted-foreground">
                  {proposal.assignedToName || "Not assigned"}
                </p>
              </div>
            </div>
            {proposal.dueDate && (
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Due Date</p>
                  <p className="text-sm text-muted-foreground">{proposal.dueDate}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fund Mandates Panel - shows when a fund is selected */}
      {selectedFundId && (
        <DataCard
          title={`Mandates for ${funds.find(f => f.id === selectedFundId)?.name || "Selected Fund"}`}
          description="Mandate templates linked to the selected fund (read-only)"
        >
          {loadingFundMandates ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading mandates...</span>
            </div>
          ) : fundMandates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileStack className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No mandates linked to this fund.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mandate</TableHead>
                  <TableHead>Strategy</TableHead>
                  <TableHead>Geography</TableHead>
                  <TableHead>Ticket Range</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fundMandates.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{m.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{m.id}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{m.strategy}</TableCell>
                    <TableCell className="text-muted-foreground">{m.geography}</TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(m.minTicket)} - {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(m.maxTicket)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        variant={m.status === "active" ? "success" : m.status === "draft" ? "warning" : "muted"}
                      >
                        {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                      </StatusBadge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DataCard>
      )}

      {/* Assignments Panel - Tenant Admin Only */}
      {canAssign && (
        <DataCard
          title="Proposal Assignment"
          description="Assign this proposal to an assessor or queue"
        >
          {/* Current Assignment */}
          {assignment && (assignment.assignedToUserId || assignment.assignedQueueId) && (
            <div className="mb-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-1">Current Assignment</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {assignment.assignedToUserId ? (
                  <>
                    <User className="h-4 w-4" />
                    <span>Assigned to: <span className="font-medium text-foreground">{assignment.assignedToName || assignment.assignedToUserId}</span></span>
                  </>
                ) : assignment.assignedQueueId ? (
                  <>
                    <Users className="h-4 w-4" />
                    <span>In queue: <span className="font-medium text-foreground">{assignment.assignedQueueName || assignment.assignedQueueId}</span></span>
                  </>
                ) : null}
              </div>
            </div>
          )}

          {/* Assignment Message */}
          {assignMessage && (
            <div className={`mb-4 px-3 py-2 text-sm rounded-lg ${
              assignMessage.type === "success"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            }`}>
              {assignMessage.text}
            </div>
          )}

          {/* Assignment Mode Tabs */}
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant={assignmentMode === "user" ? "default" : "outline"}
              size="sm"
              onClick={() => setAssignmentMode("user")}
            >
              <User className="h-4 w-4 mr-1" />
              Assign to Assessor
            </Button>
            <Button
              variant={assignmentMode === "queue" ? "default" : "outline"}
              size="sm"
              onClick={() => setAssignmentMode("queue")}
            >
              <Users className="h-4 w-4 mr-1" />
              Assign to Queue
            </Button>
          </div>

          {/* Assignment Form */}
          <div className="flex items-end gap-3">
            {assignmentMode === "user" ? (
              <div className="flex-1">
                <label className="text-sm font-medium mb-1.5 block">Select Assessor</label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={selectedAssessor}
                  onChange={(e) => setSelectedAssessor(e.target.value)}
                >
                  <option value="">Choose an assessor...</option>
                  {assessors.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.email})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex-1">
                <label className="text-sm font-medium mb-1.5 block">Select Queue</label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={selectedQueue}
                  onChange={(e) => setSelectedQueue(e.target.value)}
                >
                  <option value="">Choose a queue...</option>
                  {queues.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Button
              onClick={handleAssign}
              disabled={assigning || (assignmentMode === "user" ? !selectedAssessor : !selectedQueue)}
            >
              {assigning ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4 mr-1" />
              )}
              Assign
            </Button>
          </div>
        </DataCard>
      )}

      {/* Fund Mandate Used Card */}
      <DataCard
        title="Fund Mandate Used"
        description={mandate ? `Mandate template for ${proposal.fund}` : undefined}
        noPadding={!mandateLoading && !mandateError && !!mandate}
      >
        {mandateLoading ? (
          <div className="p-6 text-center text-muted-foreground">
            <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin opacity-50" />
            <p className="text-sm">Loading mandate information...</p>
          </div>
        ) : mandateError ? (
          <div className="p-6 text-center text-muted-foreground">
            <FileStack className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{mandateError}</p>
          </div>
        ) : mandate ? (
          <div>
            {/* Mandate Details */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 p-5 border-b">
              <div className="flex items-start gap-3">
                <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Mandate Name</p>
                  <p className="text-sm font-medium">{mandate.mandateName}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Target className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Strategy</p>
                  <p className="text-sm font-medium">{mandate.strategy}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Geography</p>
                  <p className="text-sm font-medium">{mandate.geography}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Ticket Range</p>
                  <p className="text-sm font-medium">{mandate.ticketRange}</p>
                </div>
              </div>
            </div>

            {/* Version Info */}
            <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/20">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Hash className="h-4 w-4" />
                <span>Version {mandate.version}</span>
                <StatusBadge
                  variant={mandate.status === "active" ? "success" : mandate.status === "draft" ? "warning" : "muted"}
                >
                  {mandate.status}
                </StatusBadge>
              </div>
            </div>

            {/* Template Files */}
            {mandate.templateFiles.length > 0 ? (
              <div>
                <div className="px-5 py-3 border-b bg-muted/10">
                  <p className="text-sm font-medium">Template Files</p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead className="text-right">Size</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mandate.templateFiles.map((file) => (
                      <TableRow key={file.blobPath} className="group">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{file.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatFileSize(file.size)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(file.uploadedAt)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMandateFileDownload(file.blobPath)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                <FileText className="h-6 w-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No template files uploaded yet</p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 text-center text-muted-foreground">
            <FileStack className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No mandate information available</p>
          </div>
        )}
      </DataCard>

      {/* NEW: Proposal Documents Card */}
      <DataCard
        title="Proposal Documents"
        description="Upload and manage documents for this proposal (max 25MB per file)"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadDocuments()}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Refresh
            </Button>
            {canManageDocuments && (
              <>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.txt,.csv"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleUpload(file);
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-1" />
                  )}
                  Upload File
                </Button>
              </>
            )}
          </div>
        }
        noPadding
      >
        {/* NEW: Status message */}
        {message && (
          <div className={`px-6 py-3 text-sm border-b ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
              : "bg-red-50 text-red-700 border-red-100"
          }`}>
            {message.text}
          </div>
        )}

        {/* NEW: Documents list */}
        {loading && documents.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin opacity-50" />
            <p className="text-sm">Loading documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No Documents"
            description="No documents uploaded yet."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Size</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="w-32"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.blobPath} className="group">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium truncate max-w-[200px]" title={doc.filename}>
                        {doc.filename}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {getFileTypeDisplay(doc.contentType)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatFileSize(doc.size)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(doc.uploadedAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(doc.blobPath)}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {canManageDocuments && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(doc.blobPath, doc.filename)}
                          disabled={deleting === doc.blobPath}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Delete"
                        >
                          {deleting === doc.blobPath ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DataCard>

      {/* NEW: Proposal Evaluation Card */}
      <DataCard
        title="Proposal Evaluation"
        description="AI-powered analysis of proposal against fund mandate"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadEvaluations()}
              disabled={evaluationsLoading}
            >
              {evaluationsLoading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={handleRunEvaluation}
              disabled={evaluating}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {evaluating ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-1" />
              )}
              Run Evaluation
            </Button>
          </div>
        }
        noPadding
      >
        {/* Status message */}
        {evaluationMessage && (
          <div className={`px-6 py-3 text-sm border-b ${
            evaluationMessage.type === "success"
              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
              : "bg-red-50 text-red-700 border-red-100"
          }`}>
            {evaluationMessage.text}
          </div>
        )}

        {evaluationsLoading && !latestEvaluation ? (
          <div className="p-6 text-center text-muted-foreground">
            <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin opacity-50" />
            <p className="text-sm">Loading evaluations...</p>
          </div>
        ) : latestEvaluation ? (
          <div>
            {/* NEW: Extraction Warnings Banner */}
            {latestEvaluation.inputs.extractionWarnings && latestEvaluation.inputs.extractionWarnings.length > 0 && (
              <div className="px-5 py-3 bg-amber-50 border-b border-amber-200">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Text Extraction Warnings</p>
                    <ul className="mt-1 text-sm text-amber-700">
                      {latestEvaluation.inputs.extractionWarnings.slice(0, 3).map((warning, i) => (
                        <li key={i}>• {warning}</li>
                      ))}
                      {latestEvaluation.inputs.extractionWarnings.length > 3 && (
                        <li className="text-amber-600">
                          ... and {latestEvaluation.inputs.extractionWarnings.length - 3} more
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Fit Score Header */}
            <div className="flex items-center justify-between p-5 border-b">
              <div className="flex items-center gap-4">
                <div className={`flex items-center justify-center w-16 h-16 rounded-full ${getScoreBg(latestEvaluation.fitScore)}`}>
                  <span className={`text-2xl font-bold ${getScoreColor(latestEvaluation.fitScore)}`}>
                    {latestEvaluation.fitScore}
                  </span>
                </div>
                <div>
                  <p className="text-lg font-semibold">Fit Score</p>
                  <p className="text-sm text-muted-foreground">
                    Based on {latestEvaluation.inputs.proposalDocuments} document(s) and {latestEvaluation.inputs.mandateTemplates} template(s)
                  </p>
                  {/* NEW: Confidence Badge */}
                  {latestEvaluation.confidence && (
                    <div className="flex items-center gap-2 mt-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full ${getConfidenceColor(latestEvaluation.confidence)}`}>
                        {latestEvaluation.confidence.charAt(0).toUpperCase() + latestEvaluation.confidence.slice(1)} Confidence
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <p>Evaluated {formatDate(latestEvaluation.evaluatedAt)}</p>
                <p>by {latestEvaluation.evaluatedByEmail}</p>
                <div className="flex items-center justify-end gap-2 mt-1">
                  {latestEvaluation.engineType === "llm" ? (
                    <span className="inline-block px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded">
                      LLM: {latestEvaluation.model}
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">
                      Stub Engine
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Summaries */}
            <div className="grid md:grid-cols-2 gap-4 p-5 border-b">
              <div>
                <p className="text-sm font-medium mb-2">Mandate Summary</p>
                <p className="text-sm text-muted-foreground">{latestEvaluation.mandateSummary}</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Proposal Summary</p>
                <p className="text-sm text-muted-foreground">{latestEvaluation.proposalSummary}</p>
              </div>
            </div>

            {/* Strengths, Risks, Recommendations */}
            <div className="grid md:grid-cols-3 gap-4 p-5 border-b">
              {/* Strengths */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  <p className="text-sm font-medium">Strengths</p>
                </div>
                <ul className="space-y-2">
                  {latestEvaluation.strengths.map((strength, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Risks */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <p className="text-sm font-medium">Risks</p>
                </div>
                <ul className="space-y-2">
                  {latestEvaluation.risks.map((risk, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recommendations */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="h-4 w-4 text-blue-600" />
                  <p className="text-sm font-medium">Recommendations</p>
                </div>
                <ul className="space-y-2">
                  {latestEvaluation.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Lightbulb className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Previous Evaluations */}
            {evaluations.length > 0 && (
              <div>
                <div className="px-5 py-3 border-b bg-muted/10 flex items-center gap-2">
                  <History className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Evaluation History</p>
                  <span className="text-xs text-muted-foreground">({evaluations.length} total)</span>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Evaluation ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-center">Fit Score</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evaluations.slice(0, 5).map((eval_, i) => (
                      <TableRow key={eval_.blobPath} className="group">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {i === 0 && (
                              <Award className="h-4 w-4 text-amber-500" />
                            )}
                            <span className="font-mono text-sm">{eval_.evaluationId}</span>
                            {i === 0 && (
                              <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                                Latest
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(eval_.evaluatedAt)}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-semibold ${getScoreColor(eval_.fitScore)}`}>
                            {eval_.fitScore}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadEvaluation(eval_.blobPath)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            JSON
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        ) : (
          <EmptyState
            icon={Award}
            title="No Evaluations Yet"
            description="Run your first evaluation to analyze this proposal against the fund mandate."
          />
        )}
      </DataCard>
    </div>
  );
}
