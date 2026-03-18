"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { PageHeader, StatusBadge, DataCard, EmptyState } from "@/components/app";
import { Badge } from "@/components/ui/badge";
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
  Eye,
  FileOutput,
  GitCompare,
  HelpCircle,
  Pencil,
  Save,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import type { Proposal, ProposalStatus } from "@/lib/mock/proposals";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

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

// Types for structured scoring
interface StructuredScores {
  sectorFit: number; // 0 to 25
  geographyFit: number; // 0 to 20
  stageFit: number; // 0 to 15
  ticketSizeFit: number; // 0 to 15
  riskAdjustment: number; // -20 to 0
}

// Types for evaluation
interface EvaluationReport {
  evaluationId: string;
  evaluatedAt: string;
  evaluatedByEmail: string;
  fitScore: number | null;
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
    processedDocumentsCount?: number;
    truncatedDocumentsCount?: number;
    skippedDocumentsCount?: number;
  };
  engineType: "stub" | "llm" | "azure-openai";
  // Structured scoring (optional for backward compatibility)
  structuredScores?: StructuredScores;
  scoringMethod?: "structured" | "fallback";
  // Proposal Validation (runs before fund evaluation)
  validationSummary?: {
    validationScore: number;
    confidence?: "low" | "medium" | "high";
    summary?: string;
    step?: string;
    checks?: Record<string, { status: "found" | "partial" | "missing"; detail: string }>;
    findings?: string[];
    heuristic?: {
      signals: {
        hasRevenue: boolean;
        hasForecast: boolean;
        hasForecast12m: boolean;
        hasForecast24m: boolean;
        hasForecast48m: boolean;
        stage: "pre-revenue" | "revenue" | "growth" | "unknown";
        hasIP: boolean;
        hasCompetitors: boolean;
      };
      heuristicScoreAfterPenalties: number;
      penalties: string[];
    };
    llm?: {
      stage: "pre-revenue" | "revenue" | "growth" | "unknown";
      businessModelClarity: "clear" | "partial" | "unclear" | "unknown";
      competitorPresence: "identified" | "mentioned" | "none" | "unknown";
    };
    warnings?: string[];
  };
}

interface EvaluationMetadata {
  blobPath: string;
  evaluationId: string;
  evaluatedAt: string;
  fitScore: number | null;
  confidence?: "low" | "medium" | "high";
  model?: string;
  engineType?: "stub" | "llm" | "azure-openai";
  inputs?: {
    proposalDocuments: number;
    mandateTemplates: number;
  };
}

interface MemoMetadata {
  blobPath: string;
  memoId: string;
  generatedAt: string;
  fileName: string;
  format: "pdf" | "text";
  versionNumber?: number;
  isLatest?: boolean;
}

interface SimilarDeal {
  proposalId: string;
  fitScore: number | null;
  similarityScore: number;
  summary: string;
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
  Deferred: "muted",
};

const statusIcons: Record<ProposalStatus, LucideIcon> = {
  New: FileText,
  Assigned: UserPlus,
  "In Review": Clock,
  Approved: CheckCircle,
  Declined: XCircle,
  Deferred: Clock,
};

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(amount);
}

function MemoSection({
  title,
  icon: Icon,
  content,
  explainKey,
  explainContent,
  expanded,
  onToggle,
}: {
  title: string;
  icon: LucideIcon;
  content: React.ReactNode;
  explainKey: string;
  explainContent: string;
  expanded: Record<string, boolean>;
  onToggle: (key: string) => void;
}) {
  const isExpanded = expanded[explainKey];
  return (
    <section>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-base font-semibold">{title}</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground h-8 gap-1"
          onClick={() => onToggle(explainKey)}
        >
          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          Explain this
        </Button>
      </div>
      <div className="mt-3 pl-10 text-sm leading-relaxed">
        {typeof content === "string" ? <p className="text-foreground">{content}</p> : content}
      </div>
      {isExpanded && (
        <div className="mt-3 pl-10 rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          {explainContent}
        </div>
      )}
    </section>
  );
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
  isReadOnly?: boolean;
  currentAssignment?: CurrentAssignment;
  error?: string;
}

export default function ProposalDetailClient({ proposal, canAssign, canManageDocuments = false, isReadOnly = false, currentAssignment, error }: ProposalDetailClientProps) {
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

  // Load funds on mount and pre-select if proposal has a linked fund
  useEffect(() => {
    const loadFunds = async () => {
      setLoadingFunds(true);
      try {
        const res = await fetch("/api/tenant/funds");
        const data = await res.json();
        if (data.ok) {
          const fundList = data.data.funds || [];
          setFunds(fundList);
          // Pre-select fund if proposal.fund matches a fund name (one-time on load)
          if (proposal?.fund && fundList.length > 0) {
            const match = fundList.find(
              (f: FundOption) =>
                f.name === proposal.fund || (f.code && `${f.name} (${f.code})` === proposal.fund)
            );
            if (match) {
              setSelectedFundId(match.id);
            }
          }
        }
      } catch {
        console.error("Failed to load funds");
      }
      setLoadingFunds(false);
    };
    loadFunds();
  }, [proposal?.id, proposal?.fund]);

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
  const [displayedEvaluation, setDisplayedEvaluation] = useState<EvaluationReport | null>(null);
  const [viewingHistorical, setViewingHistorical] = useState(false);
  const [evaluationsLoading, setEvaluationsLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationMessage, setEvaluationMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Proposal validation (simple validate endpoint)
  const [validationResult, setValidationResult] = useState<{ ok?: boolean; data?: { score: number; findings: string[] } } | null>(null);
  const [validating, setValidating] = useState(false);

  // Extracted content preview
  const [extractedContent, setExtractedContent] = useState<{ documents: { filename: string; text: string; isPlaceholder?: boolean; warning?: string }[]; combinedText: string } | null>(null);
  const [extractLoading, setExtractLoading] = useState(false);

  // Analyst inline editing
  const [analystSummary, setAnalystSummary] = useState("");
  const [analystNotes, setAnalystNotes] = useState("");
  const [editingSummary, setEditingSummary] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);

  // Explain AI dialog
  const [explainAiOpen, setExplainAiOpen] = useState(false);

  // Expandable "Explain this" sections in AI Memo
  const [memoExpanded, setMemoExpanded] = useState<Record<string, boolean>>({});

  // Helper to sort evaluations by evaluatedAt DESC (newest first)
  const sortEvaluationsDesc = (evals: EvaluationMetadata[]): EvaluationMetadata[] => {
    return [...evals].sort((a, b) => {
      const dateA = new Date(a.evaluatedAt).getTime();
      const dateB = new Date(b.evaluatedAt).getTime();
      return dateB - dateA;
    });
  };

  // NEW: Load evaluations - always resets to show latest evaluation
  const loadEvaluations = useCallback(async (proposalId?: string) => {
    const id = proposalId || proposal?.id;
    if (!id) return;
    setEvaluationsLoading(true);
    
    // Clear stale state before fetching
    setViewingHistorical(false);
    
    try {
      const res = await fetch(`/api/proposals/${id}/evaluations?includeLatest=true`);
      const data = await res.json();
      if (data.ok) {
        // Sort evaluations client-side as defensive measure
        const sortedEvaluations = sortEvaluationsDesc(data.data.evaluations || []);
        setEvaluations(sortedEvaluations);
        
        // Always set latest evaluation from server response
        const latestReport = data.data.latestReport || null;
        setLatestEvaluation(latestReport);
        
        // Always display the latest evaluation (no stale state)
        setDisplayedEvaluation(latestReport);
        setViewingHistorical(false);
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

  // Run proposal validation (simple keyword check)
  const handleValidateProposal = async () => {
    const id = proposal?.id;
    if (!id) return;
    setValidating(true);
    setValidationResult(null);
    try {
      const res = await fetch(`/api/proposals/${id}/validate`, {
        method: "POST",
      });
      const data = await res.json();
      setValidationResult(data);
    } catch {
      setEvaluationMessage({ text: "Network error during validation", type: "error" });
    }
    setValidating(false);
  };

  // Load extracted content for preview
  const loadExtractedContent = useCallback(async () => {
    const id = proposal?.id;
    if (!id) return;
    setExtractLoading(true);
    try {
      const res = await fetch(`/api/proposals/${id}/extract`);
      const data = await res.json();
      if (data.ok && data.data) {
        setExtractedContent(data.data);
      }
    } catch {
      setExtractedContent(null);
    }
    setExtractLoading(false);
  }, [proposal?.id]);

  // Load extracted content when proposal/documents change; defer to avoid sync setState in effect
  useEffect(() => {
    const shouldLoad = Boolean(proposal?.id && documents.length > 0);
    queueMicrotask(() => {
      if (shouldLoad) {
        loadExtractedContent();
      } else {
        setExtractedContent(null);
      }
    });
  }, [proposal?.id, documents.length, loadExtractedContent]);

  // Derived analyst summary: when not editing, show evaluation summary; when editing, show local draft
  const displayedSummary =
    editingSummary ? analystSummary : (displayedEvaluation?.proposalSummary ?? "");

  // NEW: Run evaluation
  const handleRunEvaluation = async () => {
    if (!proposal) return;
    setEvaluating(true);
    setEvaluationMessage(null);
    
    // Clear stale evaluation state before running new evaluation
    setViewingHistorical(false);

    try {
      const res = await fetch(`/api/proposals/${proposal.id}/evaluate`, {
        method: "POST",
      });

      const data = await res.json();

      if (data.ok) {
        const newReport = data.data.report;
        setEvaluationMessage({
          text: `Evaluation completed. Fit Score: ${newReport.fitScore}`,
          type: "success",
        });
        
        // Immediately set the new evaluation as displayed (clear old state)
        setLatestEvaluation(newReport);
        setDisplayedEvaluation(newReport);
        setViewingHistorical(false);
        
        // Then reload the full list from server to sync evaluation history
        await loadEvaluations();
      } else {
        setEvaluationMessage({ text: data.error || "Evaluation failed", type: "error" });
      }
    } catch {
      setEvaluationMessage({ text: "Network error during evaluation", type: "error" });
    }

    setEvaluating(false);
  };

  // Download evaluation JSON
  const handleDownloadEvaluation = (blobPath: string) => {
    if (!proposal) return;
    window.open(
      `/api/proposals/${proposal.id}/evaluations/download?blobPath=${encodeURIComponent(blobPath)}`,
      "_blank"
    );
  };

  // Memo generation state
  const [generatingMemo, setGeneratingMemo] = useState(false);
  const [memos, setMemos] = useState<MemoMetadata[]>([]);
  const [latestMemoBlobPath, setLatestMemoBlobPath] = useState<string | null>(null);
  const [latestMemoFileName, setLatestMemoFileName] = useState<string | null>(null);
  const [latestMemoGeneratedAt, setLatestMemoGeneratedAt] = useState<string | null>(null);
  const [memoCount, setMemoCount] = useState(0);
  const [memoMessage, setMemoMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Load memos on mount and when proposal changes
  const loadMemos = useCallback(async (proposalId?: string) => {
    const id = proposalId || proposal?.id;
    if (!id) return;
    try {
      const res = await fetch(`/api/proposals/${id}/memo`);
      const data = await res.json();
      if (data.ok) {
        const memoList = data.data.memos || [];
        setMemos(memoList);
        setMemoCount(data.data.memoCount ?? memoList.length);
        setLatestMemoBlobPath(data.data.latestMemoBlobPath ?? memoList[0]?.blobPath ?? null);
        setLatestMemoFileName(data.data.latestMemoFileName ?? memoList[0]?.fileName ?? null);
        setLatestMemoGeneratedAt(data.data.latestMemoGeneratedAt ?? memoList[0]?.generatedAt ?? null);
      }
    } catch {
      console.error("Failed to load memos");
    }
  }, [proposal?.id]);

  useEffect(() => {
    const id = proposal?.id;
    if (id) {
      queueMicrotask(() => { loadMemos(id); });
    }
  }, [proposal?.id, loadMemos]);

  // Generate investment memo
  const handleGenerateMemo = async () => {
    if (!proposal) return;
    setGeneratingMemo(true);
    setMemoMessage(null);

    try {
      const res = await fetch(`/api/proposals/${proposal.id}/memo`, {
        method: "POST",
      });

      const data = await res.json();

      if (data.ok) {
        setMemoMessage({
          text: "Report generated successfully",
          type: "success",
        });
        await loadMemos();
      } else {
        setMemoMessage({ text: data.error || "Failed to generate report", type: "error" });
      }
    } catch {
      setMemoMessage({ text: "Network error during report generation", type: "error" });
    }

    setGeneratingMemo(false);
  };

  // Download memo (latest by default, or specific blobPath for history)
  const handleDownloadMemo = (blobPath?: string) => {
    if (!proposal) return;
    const path = blobPath ?? latestMemoBlobPath;
    if (!path) return;
    window.open(
      `/api/proposals/${proposal.id}/memo?blobPath=${encodeURIComponent(path)}`,
      "_blank"
    );
  };

  // Similar Deals state
  const [similarDeals, setSimilarDeals] = useState<SimilarDeal[]>([]);
  const [similarDealsLoading, setSimilarDealsLoading] = useState(false);

  const loadSimilarDeals = useCallback(async (proposalId?: string) => {
    const id = proposalId || proposal?.id;
    if (!id || !displayedEvaluation) return;
    setSimilarDealsLoading(true);
    try {
      const res = await fetch(`/api/proposals/${id}/similar`);
      const data = await res.json();
      if (data.ok && data.data.similar) {
        setSimilarDeals(data.data.similar);
      } else {
        setSimilarDeals([]);
      }
    } catch {
      setSimilarDeals([]);
    }
    setSimilarDealsLoading(false);
  }, [proposal?.id, displayedEvaluation]);

  useEffect(() => {
    if (displayedEvaluation && proposal?.id) {
      queueMicrotask(() => { loadSimilarDeals(proposal.id); });
    } else {
      queueMicrotask(() => { setSimilarDeals([]); });
    }
  }, [displayedEvaluation, proposal?.id, loadSimilarDeals]);

  // View a specific evaluation (load it into the main panel)
  const handleViewEvaluation = async (blobPath: string, isLatest: boolean = false) => {
    if (!proposal) return;
    setEvaluationsLoading(true);
    try {
      const res = await fetch(
        `/api/proposals/${proposal.id}/evaluations/download?blobPath=${encodeURIComponent(blobPath)}`
      );
      if (res.ok) {
        const report = await res.json();
        setDisplayedEvaluation(report);
        setViewingHistorical(!isLatest);
      }
    } catch {
      console.error("Failed to load evaluation");
    }
    setEvaluationsLoading(false);
  };

  // Reset to show the latest evaluation
  const handleShowLatest = () => {
    if (latestEvaluation) {
      setDisplayedEvaluation(latestEvaluation);
      setViewingHistorical(false);
    }
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
        setMessage({ text: "Document deleted", type: "success" });
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
        subtitle={`Analyst Workspace · ${proposal.id}`}
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

        <Card className="overflow-visible">
          <CardHeader>
            <CardTitle className="text-base">Status & Assignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 overflow-visible">
            <div>
              <p className="text-sm font-medium mb-2">Current Status</p>
              <StatusBadge variant={statusVariants[proposal.status]} icon={StatusIcon}>
                {proposal.status}
              </StatusBadge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Selected Fund</p>
              {proposal.fund ? (
                <p className="text-sm text-muted-foreground">{proposal.fund}</p>
              ) : (
                <p className="text-sm text-amber-600">Select a fund before evaluation.</p>
              )}
              <p className="text-xs text-muted-foreground">This is the fund against which the proposal will be evaluated.</p>
            </div>
            <div className="space-y-2 overflow-visible pt-1">
              <p className="text-sm font-medium">Select Fund to view mandates</p>
              <Select
                value={selectedFundId}
                onValueChange={setSelectedFundId}
                disabled={loadingFunds}
              >
                <SelectTrigger className="w-full min-h-10">
                  <SelectValue placeholder={loadingFunds ? "Loading funds..." : "Select a fund"} />
                </SelectTrigger>
                <SelectContent className="z-[100]" position="popper" sideOffset={4} collisionPadding={8}>
                  {funds.map((fund) => (
                    <SelectItem key={fund.id} value={fund.id}>
                      {fund.name} {fund.code ? `(${fund.code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="pt-2">
              <p className="text-sm font-medium mb-2">Review Priority</p>
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
                <p className="text-sm font-medium">Reviewer</p>
                <p className="text-sm text-muted-foreground">
                  {proposal.assignedToName || "Not assigned"}
                </p>
                <p className="text-xs text-muted-foreground">Optional. Assign a reviewer if needed.</p>
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

      {/* Mandate Files Panel - shows when a fund is selected */}
      {selectedFundId && (
        <DataCard
          title={`Mandate Files for This Fund: ${funds.find(f => f.id === selectedFundId)?.name || "Selected Fund"}`}
          description="These files define the investment criteria used during evaluation."
        >
          {loadingFundMandates ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading mandates...</span>
            </div>
          ) : fundMandates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileStack className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="font-medium">No mandate files found for this fund.</p>
              <p className="text-sm mt-2">Upload one in Funds &gt; Mandates.</p>
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

      {/* Optional workflow section */}
      {canAssign && (
        <DataCard
          title="Review Queue & Reviewer"
          description="Optional. Use this only for team workflow."
          className="border-dashed border-amber-200/60 bg-amber-50/30"
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
              Assign Reviewer
            </Button>
            <Button
              variant={assignmentMode === "queue" ? "default" : "outline"}
              size="sm"
              onClick={() => setAssignmentMode("queue")}
            >
              <Users className="h-4 w-4 mr-1" />
              Assign to Review Queue
            </Button>
          </div>

          {/* Assignment Form */}
          <div className="flex items-end gap-3">
            {assignmentMode === "user" ? (
              <div className="flex-1">
                <label className="text-sm font-medium mb-1.5 block">Select Reviewer</label>
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
                <label className="text-sm font-medium mb-1.5 block">Select Review Queue</label>
                <p className="text-xs text-muted-foreground mb-1">Optional. Use this only for team workflow.</p>
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

      {/* Mandate Used for Evaluation Card */}
      <DataCard
        title="Mandate Used for Evaluation"
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

      {/* Analyst Workspace Tabs */}
      <Tabs defaultValue="documents" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="validation" className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            Validation
          </TabsTrigger>
          <TabsTrigger value="evaluation" className="gap-2">
            <Target className="h-4 w-4" />
            Evaluation
          </TabsTrigger>
          <TabsTrigger value="memo" className="gap-2">
            <FileOutput className="h-4 w-4" />
            AI Memo
          </TabsTrigger>
        </TabsList>

        {/* Documents Tab: Upload Panel + Extracted Data Preview */}
        <TabsContent value="documents" className="space-y-6 mt-4">
      {/* NEW: Proposal Documents Card */}
      <DataCard
        title="Proposal Documents"
        description="Upload and manage documents for this proposal. Supported: PDF, DOC, DOCX, XLS, XLSX (max 25MB)"
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
                  accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
                      const allowedExtensions = [".pdf", ".doc", ".docx", ".xls", ".xlsx"];
                      if (!allowedExtensions.includes(ext)) {
                        setMessage({ text: "Only PDF, DOC, DOCX, XLS, and XLSX files are supported.", type: "error" });
                        if (fileInputRef.current) fileInputRef.current.value = "";
                        return;
                      }
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
                  Upload Proposal Documents
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

      {/* Extracted Data Preview */}
      <DataCard
        title="Extracted Data Preview"
        description="Parsed content from uploaded documents"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={loadExtractedContent}
            disabled={extractLoading || documents.length === 0}
          >
            {extractLoading ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            Refresh
          </Button>
        }
      >
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">Upload documents to see extracted content.</p>
        ) : extractLoading && !extractedContent ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Extracting...</span>
          </div>
        ) : extractedContent ? (
          <div className="space-y-4">
            {extractedContent.documents.map((doc, i) => (
              <div key={i} className="rounded-lg border bg-muted/20 p-4">
                <p className="text-sm font-medium mb-2">{doc.filename}</p>
                {doc.warning && (
                  <p className="text-xs text-amber-600 mb-2">⚠ {doc.warning}</p>
                )}
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap max-h-48 overflow-y-auto font-sans">
                  {doc.text || "(No text extracted)"}
                </pre>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Click Refresh to extract content.</p>
        )}
      </DataCard>
        </TabsContent>

        {/* Validation Tab */}
        <TabsContent value="validation" className="space-y-6 mt-4">
          <DataCard
            title="Proposal Validation Summary"
            description="Run validation to check proposal completeness"
            actions={
              <Button
                size="sm"
                variant="outline"
                onClick={handleValidateProposal}
                disabled={validating || documents.length === 0}
              >
                {validating ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4 mr-1" />
                )}
                Validate Proposal
              </Button>
            }
          >
            {validationResult?.ok && validationResult?.data ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-full ${
                    validationResult.data.score >= 70 ? "bg-emerald-100" :
                    validationResult.data.score >= 50 ? "bg-amber-100" : "bg-red-100"
                  }`}>
                    <span className={`text-lg font-bold ${
                      validationResult.data.score >= 70 ? "text-emerald-700" :
                      validationResult.data.score >= 50 ? "text-amber-700" : "text-red-700"
                    }`}>
                      {validationResult.data.score}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Validation Score</p>
                    <p className="text-xs text-muted-foreground">Based on revenue, forecast, and competitor presence</p>
                  </div>
                </div>
                {(validationResult.data.findings || []).length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Findings</p>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                      {(validationResult.data.findings || []).map((f: string, i: number) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {documents.length === 0
                  ? "Upload proposal documents first, then run validation."
                  : "Click Validate Proposal to run validation checks."}
              </p>
            )}
          </DataCard>
          {displayedEvaluation?.validationSummary && (
            <DataCard title="Validation from Evaluation" description="From latest fund evaluation">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Score:</span>
                  <span className={displayedEvaluation.validationSummary.validationScore >= 70 ? "text-emerald-600" : "text-amber-600"}>
                    {displayedEvaluation.validationSummary.validationScore}
                  </span>
                </div>
                {displayedEvaluation.validationSummary.findings && displayedEvaluation.validationSummary.findings.length > 0 && (
                  <ul className="list-disc pl-5 text-sm text-muted-foreground">
                    {displayedEvaluation.validationSummary.findings.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                )}
              </div>
            </DataCard>
          )}
        </TabsContent>

        {/* Evaluation Tab */}
        <TabsContent value="evaluation" className="mt-4 space-y-6">
      {/* Proposal Validation Summary - above Proposal Evaluation */}
      {(displayedEvaluation?.validationSummary || (validationResult?.ok && validationResult?.data)) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Proposal Validation Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Score + Confidence */}
            <div className="flex items-center gap-6">
              <div
                className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full ${
                  (displayedEvaluation?.validationSummary?.validationScore ?? validationResult?.data?.score ?? 0) >= 70
                    ? "bg-emerald-100"
                    : (displayedEvaluation?.validationSummary?.validationScore ?? validationResult?.data?.score ?? 0) >= 50
                    ? "bg-amber-100"
                    : "bg-red-100"
                }`}
              >
                <span
                  className={`text-2xl font-bold ${
                    (displayedEvaluation?.validationSummary?.validationScore ?? validationResult?.data?.score ?? 0) >= 70
                      ? "text-emerald-700"
                      : (displayedEvaluation?.validationSummary?.validationScore ?? validationResult?.data?.score ?? 0) >= 50
                      ? "text-amber-700"
                      : "text-red-700"
                  }`}
                >
                  {displayedEvaluation?.validationSummary?.validationScore ?? validationResult?.data?.score ?? 0}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Score</p>
                <p className="text-xl font-bold tabular-nums">
                  {displayedEvaluation?.validationSummary?.validationScore ?? validationResult?.data?.score ?? 0}
                </p>
                {displayedEvaluation?.validationSummary?.confidence && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Confidence: <span className="capitalize font-medium">{displayedEvaluation.validationSummary.confidence}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Grid of checks - only when we have full validation from evaluation */}
            {displayedEvaluation?.validationSummary?.checks && Object.keys(displayedEvaluation.validationSummary.checks).length > 0 && (
              <div>
                <p className="text-sm font-medium mb-3">Validation Checks</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(["revenue", "forecast", "stage", "ip", "competitors", "businessModel"] as const).map((key) => {
                    const check = displayedEvaluation!.validationSummary!.checks![key];
                    if (!check) return null;
                    const isFound = check.status === "found";
                    const isPartial = check.status === "partial";
                    const isMissing = check.status === "missing";
                    const StatusIcon = isFound ? CheckCircle : isPartial ? AlertTriangle : XCircle;
                    const statusColor = isFound ? "text-emerald-600" : isPartial ? "text-amber-600" : "text-red-600";
                    const borderColor = isFound ? "border-emerald-200 bg-emerald-50/50" : isPartial ? "border-amber-200 bg-amber-50/50" : "border-red-200 bg-red-50/50";
                    const labels: Record<string, string> = {
                      revenue: "Revenue",
                      forecast: "Forecast",
                      stage: "Stage",
                      ip: "IP",
                      competitors: "Competitors",
                      businessModel: "Business Model",
                    };
                    return (
                      <div key={key} className={`flex items-start gap-3 rounded-lg border p-3 ${borderColor}`}>
                        <StatusIcon className={`h-5 w-5 shrink-0 mt-0.5 ${statusColor}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{labels[key] || key}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{check.detail}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Key Findings */}
            {((displayedEvaluation?.validationSummary?.findings?.length ?? 0) > 0 || (validationResult?.data?.findings?.length ?? 0) > 0) && (
              <div>
                <p className="text-sm font-medium mb-2">Key Findings</p>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  {(displayedEvaluation?.validationSummary?.findings ?? validationResult?.data?.findings ?? []).map((f: string, i: number) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* AI Summary paragraph */}
            {displayedEvaluation?.validationSummary?.summary && (
              <div>
                <p className="text-sm font-medium mb-2">AI Summary</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {displayedEvaluation.validationSummary.summary}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* NEW: Proposal Evaluation Card */}
      <DataCard
        title="Proposal Evaluation"
        description="AI-powered analysis of proposal against fund mandate"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await Promise.all([
                  loadEvaluations(),
                  loadDocuments(),
                  loadMemos(),
                  displayedEvaluation ? loadSimilarDeals() : Promise.resolve(),
                ]);
              }}
              disabled={evaluationsLoading || loading}
            >
              {evaluationsLoading || loading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Refresh
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleValidateProposal}
              disabled={validating || isReadOnly}
              className="border-slate-300"
            >
              {validating ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4 mr-1" />
              )}
              Validate Proposal
            </Button>
            <Button
              size="sm"
              onClick={handleRunEvaluation}
              disabled={evaluating || isReadOnly}
              className="bg-primary hover:bg-primary-hover"
            >
              {evaluating ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-1" />
              )}
              Evaluate Proposal
            </Button>
            {/* Report Generation Buttons */}
            {displayedEvaluation ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateMemo}
                  disabled={generatingMemo || isReadOnly}
                  className="border-amber-300 text-amber-700 hover:bg-amber-50"
                >
                  {generatingMemo ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <FileOutput className="h-4 w-4 mr-1" />
                  )}
                  Generate Evaluation Report
                </Button>
                {latestMemoBlobPath && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadMemo()}
                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download Report
                  </Button>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground" title="Run evaluation first to generate a report.">
                <Button
                  size="sm"
                  variant="outline"
                  disabled
                  className="border-muted-foreground/30 opacity-60 cursor-not-allowed"
                >
                  <FileOutput className="h-4 w-4 mr-1" />
                  Generate Evaluation Report
                </Button>
                <span className="hidden sm:inline">Run evaluation first to generate a report.</span>
              </div>
            )}
          </div>
        }
        noPadding
      >
        {/* Memo status message */}
        {memoMessage && (
          <div className={`px-6 py-3 text-sm border-b ${
            memoMessage.type === "success"
              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
              : "bg-red-50 text-red-700 border-red-100"
          }`}>
            {memoMessage.text}
          </div>
        )}

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

        {evaluationsLoading && !displayedEvaluation ? (
          <div className="p-6 text-center text-muted-foreground">
            <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin opacity-50" />
            <p className="text-sm">Loading evaluations...</p>
          </div>
        ) : displayedEvaluation ? (
          <div>
            {/* Historical evaluation warning banner */}
            {viewingHistorical && (
              <div className="px-5 py-3 bg-blue-50 border-b border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-2">
                    <History className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">Viewing Historical Evaluation</p>
                      <p className="text-sm text-blue-700">This is not the most recent evaluation. Click &quot;Show Latest&quot; to view the newest one.</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShowLatest}
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    Show Latest
                  </Button>
                </div>
              </div>
            )}

            {/* Warning Banner: No documents/templates */}
            {displayedEvaluation.inputs.proposalDocuments === 0 && displayedEvaluation.inputs.mandateTemplates === 0 && (
              <div className="px-5 py-3 bg-amber-50 border-b border-amber-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">No documents or templates available</p>
                    <p className="text-sm text-amber-700">Score is not meaningful yet. Upload proposal documents and configure mandate templates.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Extraction Warnings Banner */}
            {displayedEvaluation.inputs.extractionWarnings && displayedEvaluation.inputs.extractionWarnings.length > 0 && (
              <div className="px-5 py-3 bg-amber-50 border-b border-amber-200">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-800">Text Extraction Warnings</p>
                    <ul className="mt-1 text-sm text-amber-700">
                      {displayedEvaluation.inputs.extractionWarnings.slice(0, 3).map((warning, i) => (
                        <li key={i}>• {warning}</li>
                      ))}
                      {displayedEvaluation.inputs.extractionWarnings.length > 3 && (
                        <li className="text-amber-600">
                          ... and {displayedEvaluation.inputs.extractionWarnings.length - 3} more
                        </li>
                      )}
                    </ul>
                    {/* Document Processing Stats */}
                    {(displayedEvaluation.inputs.processedDocumentsCount !== undefined ||
                      displayedEvaluation.inputs.truncatedDocumentsCount !== undefined ||
                      displayedEvaluation.inputs.skippedDocumentsCount !== undefined) && (
                      <div className="mt-2 flex flex-wrap gap-3 text-xs">
                        {displayedEvaluation.inputs.processedDocumentsCount !== undefined &&
                          displayedEvaluation.inputs.processedDocumentsCount > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                              {displayedEvaluation.inputs.processedDocumentsCount} processed
                            </span>
                          )}
                        {displayedEvaluation.inputs.truncatedDocumentsCount !== undefined &&
                          displayedEvaluation.inputs.truncatedDocumentsCount > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                              {displayedEvaluation.inputs.truncatedDocumentsCount} truncated
                            </span>
                          )}
                        {displayedEvaluation.inputs.skippedDocumentsCount !== undefined &&
                          displayedEvaluation.inputs.skippedDocumentsCount > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-100 text-red-700">
                              {displayedEvaluation.inputs.skippedDocumentsCount} skipped
                            </span>
                          )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Showing latest evaluation indicator */}
            {!viewingHistorical && (
              <div className="px-5 py-2 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span className="text-sm text-emerald-700">Showing latest evaluation</span>
              </div>
            )}

            {/* Memo Status section */}
            {(latestMemoBlobPath || memoCount > 0) && (
              <div className="px-5 py-3 border-b bg-muted/5">
                <p className="text-xs font-medium text-muted-foreground mb-2">Report Status</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  {latestMemoFileName && (
                    <span className="flex items-center gap-1.5">
                      <FileOutput className="h-3.5 w-3.5 text-muted-foreground" />
                      {latestMemoFileName}
                    </span>
                  )}
                  {latestMemoGeneratedAt && (
                    <span className="text-muted-foreground">
                      {formatDate(latestMemoGeneratedAt)}
                    </span>
                  )}
                  <span className="text-muted-foreground">
                    {memoCount} report{memoCount !== 1 ? "s" : ""} available
                  </span>
                </div>
                {/* Memo History */}
                {memos.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Report History</p>
                    <div className="space-y-1.5">
                      {memos.map((m) => (
                        <div
                          key={m.blobPath}
                          className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/30 group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-muted-foreground text-xs shrink-0">
                              {formatDate(m.generatedAt)}
                            </span>
                            <span className="text-sm truncate" title={m.fileName}>
                              {m.fileName}
                            </span>
                            {m.isLatest && (
                              <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded shrink-0">
                                Latest
                              </span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            onClick={() => handleDownloadMemo(m.blobPath)}
                          >
                            <Download className="h-3.5 w-3.5 mr-1" />
                            Download
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Fit Score Header (Fund Evaluation) */}
            <div className="flex items-center justify-between p-5 border-b">
              <div className="flex items-center gap-4">
                {/* Show "—" when no docs/templates, otherwise show score */}
                {displayedEvaluation.inputs.proposalDocuments === 0 && displayedEvaluation.inputs.mandateTemplates === 0 ? (
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-100">
                    <span className="text-2xl font-bold text-gray-400">—</span>
                  </div>
                ) : (
                  <div className={`flex items-center justify-center w-16 h-16 rounded-full ${displayedEvaluation.fitScore !== null ? getScoreBg(displayedEvaluation.fitScore) : 'bg-gray-100'}`}>
                    <span className={`text-2xl font-bold ${displayedEvaluation.fitScore !== null ? getScoreColor(displayedEvaluation.fitScore) : 'text-gray-400'}`}>
                      {displayedEvaluation.fitScore !== null ? displayedEvaluation.fitScore : "—"}
                    </span>
                  </div>
                )}
                <div>
                  <p className="text-lg font-semibold">
                    {displayedEvaluation.inputs.proposalDocuments === 0 && displayedEvaluation.inputs.mandateTemplates === 0
                      ? "Insufficient Inputs"
                      : "Fit Score"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Based on {displayedEvaluation.inputs.proposalDocuments} document(s) and {displayedEvaluation.inputs.mandateTemplates} template(s)
                  </p>
                  {/* Confidence Badge */}
                  {displayedEvaluation.confidence && (
                    <div className="flex items-center gap-2 mt-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full ${getConfidenceColor(displayedEvaluation.confidence)}`}>
                        {displayedEvaluation.confidence.charAt(0).toUpperCase() + displayedEvaluation.confidence.slice(1)} Confidence
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <p>Evaluated {formatDate(displayedEvaluation.evaluatedAt)}</p>
                <p>by {displayedEvaluation.evaluatedByEmail}</p>
                <div className="flex items-center justify-end gap-2 mt-1">
                  {displayedEvaluation.engineType === "azure-openai" ? (
                    <span className="inline-block px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                      Azure OpenAI: {displayedEvaluation.model}
                    </span>
                  ) : displayedEvaluation.engineType === "llm" ? (
                    <span className="inline-block px-2 py-0.5 text-xs bg-primary/10 text-primary rounded">
                      LLM: {displayedEvaluation.model}
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">
                      Stub Engine
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Structured Scores Section */}
            {displayedEvaluation.structuredScores && (
              <div className="p-5 border-b bg-muted/10">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium">Score Breakdown</p>
                  {displayedEvaluation.scoringMethod && (
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      displayedEvaluation.scoringMethod === "structured" 
                        ? "bg-emerald-100 text-emerald-700" 
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {displayedEvaluation.scoringMethod === "structured" ? "AI-Scored" : "Estimated"}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {/* Sector Fit */}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Sector Fit</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${(displayedEvaluation.structuredScores.sectorFit / 25) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium tabular-nums w-12 text-right">
                        {displayedEvaluation.structuredScores.sectorFit}/25
                      </span>
                    </div>
                  </div>
                  
                  {/* Geography Fit */}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Geography Fit</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${(displayedEvaluation.structuredScores.geographyFit / 20) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium tabular-nums w-12 text-right">
                        {displayedEvaluation.structuredScores.geographyFit}/20
                      </span>
                    </div>
                  </div>
                  
                  {/* Stage Fit */}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Stage Fit</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${(displayedEvaluation.structuredScores.stageFit / 15) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium tabular-nums w-12 text-right">
                        {displayedEvaluation.structuredScores.stageFit}/15
                      </span>
                    </div>
                  </div>
                  
                  {/* Ticket Size Fit */}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Ticket Size Fit</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${(displayedEvaluation.structuredScores.ticketSizeFit / 15) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium tabular-nums w-12 text-right">
                        {displayedEvaluation.structuredScores.ticketSizeFit}/15
                      </span>
                    </div>
                  </div>
                  
                  {/* Risk Adjustment */}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Risk Adjustment</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            displayedEvaluation.structuredScores.riskAdjustment === 0 
                              ? "bg-emerald-500" 
                              : displayedEvaluation.structuredScores.riskAdjustment >= -10 
                                ? "bg-amber-500" 
                                : "bg-red-500"
                          }`}
                          style={{ width: `${((20 + displayedEvaluation.structuredScores.riskAdjustment) / 20) * 100}%` }}
                        />
                      </div>
                      <span className={`text-sm font-medium tabular-nums w-12 text-right ${
                        displayedEvaluation.structuredScores.riskAdjustment < 0 ? "text-red-600" : "text-emerald-600"
                      }`}>
                        {displayedEvaluation.structuredScores.riskAdjustment}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Summaries - inline editable */}
            <div className="grid md:grid-cols-2 gap-4 p-5 border-b">
              <div>
                <p className="text-sm font-medium mb-2">Mandate Summary</p>
                <p className="text-sm text-muted-foreground">{displayedEvaluation.mandateSummary}</p>
              </div>
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-sm font-medium">Proposal Summary</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7"
                    onClick={() => {
                      setEditingSummary(true);
                      setAnalystSummary(displayedEvaluation.proposalSummary || "");
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Edit
                  </Button>
                </div>
                {editingSummary ? (
                  <div className="space-y-2">
                    <Textarea
                      value={analystSummary}
                      onChange={(e) => setAnalystSummary(e.target.value)}
                      className="min-h-[100px] text-sm"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => setEditingSummary(false)}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={() => setEditingSummary(false)}>
                        <Save className="h-3.5 w-3.5 mr-1" />
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{displayedSummary}</p>
                )}
              </div>
            </div>
            {/* Analyst Notes - inline editable */}
            <div className="p-5 border-b">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-sm font-medium">Analyst Notes</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7"
                  onClick={() => setEditingNotes(true)}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  {analystNotes ? "Edit" : "Add"}
                </Button>
              </div>
              {editingNotes ? (
                <div className="space-y-2">
                  <Textarea
                    value={analystNotes}
                    onChange={(e) => setAnalystNotes(e.target.value)}
                    placeholder="Add your notes..."
                    className="min-h-[80px] text-sm"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditingNotes(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={() => setEditingNotes(false)}>
                      <Save className="h-3.5 w-3.5 mr-1" />
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{analystNotes || "No notes yet."}</p>
              )}
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
                  {displayedEvaluation.strengths.map((strength, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Risks */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <p className="text-sm font-medium">Risks</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setExplainAiOpen(true)}
                  >
                    <HelpCircle className="h-3.5 w-3.5 mr-1" />
                    Explain AI
                  </Button>
                </div>
                <ul className="space-y-2">
                  {displayedEvaluation.risks.map((risk, i) => (
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
                  {displayedEvaluation.recommendations.map((rec, i) => (
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
                <div className="px-5 py-3 border-b bg-muted/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium">Evaluation History</p>
                      <span className="text-xs text-muted-foreground">({evaluations.length} total)</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Main panel displays the {viewingHistorical ? "selected" : "latest"} evaluation. Click &quot;View&quot; to see older evaluations.
                  </p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Evaluation ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-center">Fit Score</TableHead>
                      <TableHead className="w-40"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evaluations.slice(0, 5).map((eval_, i) => (
                      <TableRow 
                        key={eval_.blobPath} 
                        className={`group ${displayedEvaluation?.evaluationId === eval_.evaluationId ? "bg-primary/5" : ""}`}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {i === 0 && (
                              <Award className="h-4 w-4 text-amber-500" />
                            )}
                            <span className="font-mono text-sm">{eval_.evaluationId}</span>
                            {i === 0 && (
                              <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                Latest
                              </span>
                            )}
                            {displayedEvaluation?.evaluationId === eval_.evaluationId && i !== 0 && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                                Viewing
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(eval_.evaluatedAt)}
                        </TableCell>
                        <TableCell className="text-center">
                          {eval_.fitScore !== null ? (
                            <span className={`font-semibold ${getScoreColor(eval_.fitScore)}`}>
                              {eval_.fitScore}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewEvaluation(eval_.blobPath, i === 0)}
                              title="View details"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadEvaluation(eval_.blobPath)}
                              title="Download JSON"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Similar Deals */}
            <div className="border-t">
              <div className="px-5 py-3 bg-muted/5">
                <div className="flex items-center gap-2">
                  <GitCompare className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Similar Deals</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Previously evaluated proposals with similar mandate fit and characteristics.
                </p>
              </div>
              {similarDealsLoading ? (
                <div className="px-5 py-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading similar deals...
                </div>
              ) : similarDeals.length === 0 ? (
                <div className="px-5 py-4 text-sm text-muted-foreground">
                  No similar deals found. Run evaluations on more proposals to see comparisons.
                </div>
              ) : (
                <div className="divide-y">
                  {similarDeals.map((deal) => (
                    <div
                      key={deal.proposalId}
                      className="px-5 py-3 flex items-start justify-between gap-4 hover:bg-muted/20"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/dashboard/proposals/${deal.proposalId}`}
                            className="font-mono text-sm font-medium text-primary hover:underline"
                          >
                            {deal.proposalId}
                          </Link>
                          {deal.fitScore !== null && (
                            <span className={`text-sm font-semibold ${getScoreColor(deal.fitScore)}`}>
                              {deal.fitScore}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {Math.round(deal.similarityScore * 100)}% similar
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {deal.summary}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6">
            {documents.length === 0 && (
              <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">No documents uploaded</p>
                    <p className="text-sm text-amber-700">Upload a PDF, DOC, or DOCX document to run meaningful evaluation.</p>
                  </div>
                </div>
              </div>
            )}
            <EmptyState
              icon={Award}
              title="No Evaluations Yet"
              description="Run your first evaluation to analyze this proposal against the fund mandate."
            />
          </div>
        )}
      </DataCard>
        </TabsContent>

        {/* AI Memo Tab */}
        <TabsContent value="memo" className="space-y-6 mt-4">
          {memoMessage && (
            <div className={`px-4 py-3 rounded-lg text-sm ${
              memoMessage.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {memoMessage.text}
            </div>
          )}

          {displayedEvaluation ? (
            <>
              {/* Premium AI Memo Document */}
              <Card className="overflow-hidden">
                {/* Memo Header */}
                <div className="border-b bg-muted/20 px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold tracking-tight">Investment Committee Memo</h2>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {proposal?.name} · {proposal?.applicant}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={displayedEvaluation.confidence === "high" ? "success" : displayedEvaluation.confidence === "medium" ? "warning" : "secondary"}
                        className="capitalize"
                      >
                        {displayedEvaluation.confidence} Confidence
                      </Badge>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={handleGenerateMemo} disabled={generatingMemo}>
                          {generatingMemo ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileOutput className="h-4 w-4" />}
                        </Button>
                        {latestMemoBlobPath && (
                          <Button size="sm" variant="outline" onClick={() => handleDownloadMemo()}>
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Memo Body - Document Style */}
                <div className="px-6 py-6 space-y-8 max-w-3xl">
                  {/* 1. Executive Summary */}
                  <MemoSection
                    title="Executive Summary"
                    icon={Sparkles}
                    content={displayedEvaluation.proposalSummary}
                    explainKey="exec-summary"
                    explainContent="This summary is generated by the AI from the proposal documents and mandate alignment. It captures the core opportunity and fit."
                    expanded={memoExpanded}
                    onToggle={(key) => setMemoExpanded((p) => ({ ...p, [key]: !p[key] }))}
                  />

                  {/* 2. Investment Highlights */}
                  <MemoSection
                    title="Investment Highlights"
                    icon={TrendingUp}
                    content={
                      (displayedEvaluation.strengths?.length ?? 0) > 0 ? (
                      <ul className="space-y-2">
                        {(displayedEvaluation.strengths ?? []).map((s, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                      ) : (
                        <p className="text-muted-foreground italic">No highlights identified.</p>
                      )
                    }
                    explainKey="highlights"
                    explainContent="These highlights are derived from the AI's analysis of mandate alignment, sector fit, and proposal strengths."
                    expanded={memoExpanded}
                    onToggle={(key) => setMemoExpanded((p) => ({ ...p, [key]: !p[key] }))}
                  />

                  {/* 3. Key Risks (with source references) */}
                  <MemoSection
                    title="Key Risks"
                    icon={AlertTriangle}
                    content={
                      (displayedEvaluation.risks?.length ?? 0) > 0 ? (
                      <ul className="space-y-3">
                        {(displayedEvaluation.risks ?? []).map((risk, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                            <div>
                              <span>{risk}</span>
                              <p className="text-xs text-muted-foreground mt-1 italic">Source: AI evaluation · Proposal analysis</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                      ) : (
                        <p className="text-muted-foreground italic">No risks identified.</p>
                      )
                    }
                    explainKey="risks"
                    explainContent="Risks are identified through mandate comparison, sector analysis, and qualitative assessment of the proposal materials."
                    expanded={memoExpanded}
                    onToggle={(key) => setMemoExpanded((p) => ({ ...p, [key]: !p[key] }))}
                  />

                  {/* 4. Financial Overview */}
                  <MemoSection
                    title="Financial Overview"
                    icon={DollarSign}
                    content={
                      <div className="space-y-3">
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-muted-foreground">Requested Amount</span>
                          <span className="font-medium">{proposal ? formatAmount(proposal.amount) : "—"}</span>
                        </div>
                        {displayedEvaluation.structuredScores && (
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="flex justify-between text-sm py-1">
                              <span className="text-muted-foreground">Sector Fit</span>
                              <span>{displayedEvaluation.structuredScores.sectorFit}/25</span>
                            </div>
                            <div className="flex justify-between text-sm py-1">
                              <span className="text-muted-foreground">Ticket Size Fit</span>
                              <span>{displayedEvaluation.structuredScores.ticketSizeFit}/15</span>
                            </div>
                          </div>
                        )}
                      </div>
                    }
                    explainKey="financial"
                    explainContent="Financial metrics are extracted from proposal documents. Score breakdown reflects mandate alignment."
                    expanded={memoExpanded}
                    onToggle={(key) => setMemoExpanded((p) => ({ ...p, [key]: !p[key] }))}
                  />

                  {/* 5. Recommendation */}
                  <MemoSection
                    title="Recommendation"
                    icon={Target}
                    content={
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
                            (displayedEvaluation.fitScore ?? 0) >= 70 ? "bg-emerald-100" :
                            (displayedEvaluation.fitScore ?? 0) >= 50 ? "bg-amber-100" : "bg-red-100"
                          }`}>
                            <span className={`text-lg font-bold ${
                              (displayedEvaluation.fitScore ?? 0) >= 70 ? "text-emerald-700" :
                              (displayedEvaluation.fitScore ?? 0) >= 50 ? "text-amber-700" : "text-red-700"
                            }`}>
                              {displayedEvaluation.fitScore ?? "—"}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">
                              {(displayedEvaluation.fitScore ?? 0) >= 70 ? "Proceed" :
                               (displayedEvaluation.fitScore ?? 0) >= 50 ? "Proceed with conditions" : "Defer or decline"}
                            </p>
                            <p className="text-sm text-muted-foreground">Fit Score: {displayedEvaluation.fitScore ?? "—"}/100</p>
                          </div>
                        </div>
                        <ul className="space-y-2 mt-3">
                          {(displayedEvaluation.recommendations ?? []).slice(0, 3).map((r, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    }
                    explainKey="recommendation"
                    explainContent="The recommendation is based on fit score, mandate alignment, and identified strengths and risks."
                    expanded={memoExpanded}
                    onToggle={(key) => setMemoExpanded((p) => ({ ...p, [key]: !p[key] }))}
                  />
                </div>
              </Card>

              {/* Report History */}
              {memos.length > 0 && (
                <DataCard title="Report History" description="Generated PDF reports">
                  <div className="space-y-1.5">
                    {memos.map((m) => (
                      <div key={m.blobPath} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/30">
                        <span className="text-sm truncate">{m.fileName}</span>
                        <Button variant="ghost" size="sm" onClick={() => handleDownloadMemo(m.blobPath)}>
                          <Download className="h-3.5 w-3.5 mr-1" />
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                </DataCard>
              )}
            </>
          ) : (
            <DataCard
              title="AI Memo"
              description="Run an evaluation to generate the investment memo"
              actions={
                <Button size="sm" disabled>
                  <FileOutput className="h-4 w-4 mr-1" />
                  Generate Report
                </Button>
              }
            >
              <div className="py-12 text-center">
                <FileOutput className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-sm font-medium">No evaluation yet</p>
                <p className="text-sm text-muted-foreground mt-1">Run a fund evaluation first to generate the AI memo.</p>
              </div>
            </DataCard>
          )}
        </TabsContent>
      </Tabs>

      {/* Explain AI Dialog */}
      <Dialog open={explainAiOpen} onOpenChange={setExplainAiOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Why AI Flagged These Risks
            </DialogTitle>
            <DialogDescription>
              The AI evaluates proposals against the fund mandate and identifies potential concerns based on sector fit, geography, stage, ticket size, and qualitative analysis.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {displayedEvaluation?.risks?.map((risk, i) => (
              <div key={i} className="rounded-lg border bg-muted/20 p-3">
                <p className="text-sm font-medium mb-1">Risk {i + 1}</p>
                <p className="text-sm text-muted-foreground">{risk}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  This risk was identified based on the proposal content and mandate criteria. Review the full evaluation for detailed context.
                </p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
