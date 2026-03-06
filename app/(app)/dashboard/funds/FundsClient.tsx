"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, StatCard, DataCard, StatusBadge, EmptyState } from "@/components/app";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Wallet,
  Plus,
  LayoutGrid,
  List,
  TrendingUp,
  DollarSign,
  Target,
  MoreHorizontal,
  Settings,
  FileText,
  PauseCircle,
  ScrollText,
  Edit,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Upload,
  Download,
  ChevronDown,
  ChevronUp,
  History,
} from "lucide-react";
import type { FundMandateTemplate, FundMandateStatus } from "@/lib/mock/fundMandates";
import type { Fund } from "@/lib/mock/fundsStore";
import Link from "next/link";

type StatusKey = "active" | "inactive";

const statusVariants: Record<StatusKey, "success" | "warning" | "muted"> = {
  active: "success",
  inactive: "muted",
};

const mandateStatusVariants: Record<FundMandateStatus, "success" | "warning" | "muted"> = {
  active: "success",
  draft: "warning",
  inactive: "muted",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string): string {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "-";
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

interface BlobMandate {
  path: string;
  lastModified: string;
  size: number;
  contentType?: string;
  fileName?: string;
}

interface FundsClientProps {
  funds: Fund[];
  fundMandatesEnabled: boolean;
  canManageFundMandates: boolean;
  mandates: FundMandateTemplate[];
}

export default function FundsClient({ funds: initialFunds, fundMandatesEnabled, canManageFundMandates, mandates }: FundsClientProps) {
  const router = useRouter();
  const [funds] = useState<Fund[]>(initialFunds);
  const [view, setView] = useState<"grid" | "table">("grid");
  const [activeTab, setActiveTab] = useState<"funds" | "mandates">("funds");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreateFundOpen, setIsCreateFundOpen] = useState(false);
  const [, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newFund, setNewFund] = useState({ name: "", code: "" });
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<{ id: string; message: string; type: "success" | "error" } | null>(null);
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());
  const fileInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const [blobMandates, setBlobMandates] = useState<BlobMandate[]>([]);
  const [blobLoading, setBlobLoading] = useState(false);
  const [blobUploadMessage, setBlobUploadMessage] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const blobFileInputRef = useRef<HTMLInputElement>(null);

  const [newMandate, setNewMandate] = useState({
    name: "",
    strategy: "",
    geography: "",
    minTicket: 0,
    maxTicket: 0,
    notes: "",
  });

  const loadBlobMandates = async (fundId: string) => {
    setBlobLoading(true);
    try {
      const res = await fetch(`/api/tenant/funds/${fundId}/mandates`);
      let data: { ok?: boolean; data?: { mandates?: BlobMandate[] }; error?: string } = {};
      try {
        data = await res.json();
      } catch {
        console.error("Failed to parse blob mandates response");
        setBlobLoading(false);
        return;
      }
      if (data.ok && Array.isArray(data.data?.mandates)) {
        setBlobMandates(data.data.mandates);
      } else {
        setBlobMandates([]);
      }
    } catch {
      console.error("Failed to load blob mandates");
    }
    setBlobLoading(false);
  };

  const handleBlobUpload = async (fundId: string, file: File) => {
    setBlobLoading(true);
    setBlobUploadMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/tenant/funds/${fundId}/mandates`, {
        method: "POST",
        body: formData,
      });

      let data: { ok?: boolean; data?: { fileName?: string; blobPath?: string }; error?: string } = {};
      try {
        data = await res.json();
      } catch {
        setBlobUploadMessage({
          message: "Upload failed: Invalid response from server",
          type: "error",
        });
        setBlobLoading(false);
        return;
      }

      if (!res.ok || !data.ok) {
        const errorMessage = typeof data.error === "string" ? data.error : "Upload failed";
        setBlobUploadMessage({
          message: errorMessage,
          type: "error",
        });
      } else {
        const fileName = data.data?.fileName || file.name || "file";
        setBlobUploadMessage({
          message: `Uploaded: ${fileName}`,
          type: "success",
        });
        await loadBlobMandates(fundId);
      }
    } catch {
      setBlobUploadMessage({
        message: "Upload failed",
        type: "error",
      });
    }
    setBlobLoading(false);
    if (blobFileInputRef.current) {
      blobFileInputRef.current.value = "";
    }
  };

  const handleCreateFund = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/tenant/funds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newFund),
      });
      const data = await res.json();
      if (data.ok) {
        setIsCreateFundOpen(false);
        setNewFund({ name: "", code: "" });
        startTransition(() => {
          router.refresh();
        });
      } else {
        alert(data.error || "Failed to create fund");
      }
    } catch {
      alert("Network error");
    }
    setIsSubmitting(false);
  };

  const handleCreateMandate = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/tenant/fund-mandates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMandate),
      });
      const data = await res.json();
      if (data.ok) {
        setIsCreateOpen(false);
        setNewMandate({ name: "", strategy: "", geography: "", minTicket: 0, maxTicket: 0, notes: "" });
        startTransition(() => {
          router.refresh();
        });
      } else {
        alert(data.error || "Failed to create mandate");
      }
    } catch {
      alert("Network error");
    }
    setIsSubmitting(false);
  };

  const handleStatusChange = async (id: string, status: FundMandateStatus) => {
    try {
      const res = await fetch(`/api/tenant/fund-mandates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.ok) {
        startTransition(() => {
          router.refresh();
        });
      } else {
        alert(data.error || "Failed to update status");
      }
    } catch {
      alert("Network error");
    }
  };

  const handleUploadClick = (mandateId: string) => {
    const input = fileInputRefs.current.get(mandateId);
    if (input) {
      input.click();
    }
  };

  const handleFileChange = async (mandateId: string, file: File | null) => {
    if (!file) return;

    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    const allowedExtensions = [".pdf", ".doc", ".docx"];
    if (!allowedExtensions.includes(ext)) {
      setUploadMessage({
        id: mandateId,
        message: "Only PDF, DOC, and DOCX files are supported.",
        type: "error",
      });
      const input = fileInputRefs.current.get(mandateId);
      if (input) input.value = "";
      return;
    }

    setUploadingId(mandateId);
    setUploadMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/tenant/fund-mandates/${mandateId}/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.ok) {
        setUploadMessage({
          id: mandateId,
          message: `Uploaded v${data.data.version}: ${data.data.fileName}`,
          type: "success",
        });
        startTransition(() => {
          router.refresh();
        });
      } else {
        setUploadMessage({
          id: mandateId,
          message: data.error || "Upload failed",
          type: "error",
        });
      }
    } catch {
      setUploadMessage({
        id: mandateId,
        message: "Network error during upload",
        type: "error",
      });
    }

    setUploadingId(null);

    const input = fileInputRefs.current.get(mandateId);
    if (input) {
      input.value = "";
    }
  };

  const handleDownload = (mandateId: string, version: number | "latest") => {
    window.open(`/api/tenant/fund-mandates/${mandateId}/download?version=${version}`, "_blank");
  };

  const toggleVersionsExpanded = (mandateId: string) => {
    setExpandedVersions((prev) => {
      const next = new Set(prev);
      if (next.has(mandateId)) {
        next.delete(mandateId);
      } else {
        next.add(mandateId);
      }
      return next;
    });
  };

  const activeFunds = funds.filter(f => f.status === "active").length;
  const inactiveFunds = funds.filter(f => f.status === "inactive").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Funds"
        subtitle="Manage funding sources and allocations"
        actions={
          activeTab === "funds" ? (
            <Dialog open={isCreateFundOpen} onOpenChange={setIsCreateFundOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Fund
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                  <DialogTitle>Create New Fund</DialogTitle>
                  <DialogDescription>
                    Add a new fund to your organization.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="fundName">Fund Name</Label>
                    <Input
                      id="fundName"
                      value={newFund.name}
                      onChange={(e) => setNewFund({ ...newFund, name: e.target.value })}
                      placeholder="e.g., General Fund 2026"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="fundCode">Code (optional)</Label>
                    <Input
                      id="fundCode"
                      value={newFund.code}
                      onChange={(e) => setNewFund({ ...newFund, code: e.target.value })}
                      placeholder="e.g., GF26"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateFundOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateFund} disabled={isSubmitting || !newFund.name.trim()}>
                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Fund
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : fundMandatesEnabled ? (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Template
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create Fund Mandate Template</DialogTitle>
                  <DialogDescription>
                    Define a new mandate template for fund investments.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={newMandate.name}
                      onChange={(e) => setNewMandate({ ...newMandate, name: e.target.value })}
                      placeholder="e.g., Growth Equity Mandate"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="strategy">Strategy</Label>
                      <Input
                        id="strategy"
                        value={newMandate.strategy}
                        onChange={(e) => setNewMandate({ ...newMandate, strategy: e.target.value })}
                        placeholder="e.g., Growth Equity"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="geography">Geography</Label>
                      <Input
                        id="geography"
                        value={newMandate.geography}
                        onChange={(e) => setNewMandate({ ...newMandate, geography: e.target.value })}
                        placeholder="e.g., North America"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="minTicket">Min Ticket ($)</Label>
                      <Input
                        id="minTicket"
                        type="number"
                        value={newMandate.minTicket}
                        onChange={(e) => setNewMandate({ ...newMandate, minTicket: Number(e.target.value) })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="maxTicket">Max Ticket ($)</Label>
                      <Input
                        id="maxTicket"
                        type="number"
                        value={newMandate.maxTicket}
                        onChange={(e) => setNewMandate({ ...newMandate, maxTicket: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Input
                      id="notes"
                      value={newMandate.notes}
                      onChange={(e) => setNewMandate({ ...newMandate, notes: e.target.value })}
                      placeholder="Additional notes..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateMandate} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Template
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : null
        }
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "funds" | "mandates")}>
        <TabsList>
          <TabsTrigger value="funds">
            <Wallet className="h-4 w-4 mr-2" />
            Funds
          </TabsTrigger>
          <TabsTrigger value="mandates">
            <ScrollText className="h-4 w-4 mr-2" />
            Mandate Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="funds" className="space-y-6 mt-6">

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Funds"
          value={funds.length.toString()}
          description="Funds in your organization"
          icon={Wallet}
        />
        <StatCard
          title="Active Funds"
          value={activeFunds.toString()}
          description="Currently active"
          trend="neutral"
          icon={Target}
        />
        <StatCard
          title="Inactive Funds"
          value={inactiveFunds.toString()}
          description="Paused or closed"
          trend="neutral"
          icon={DollarSign}
        />
        <StatCard
          title="Mandate Templates"
          value={mandates.length.toString()}
          description="Available templates"
          trend="neutral"
          icon={TrendingUp}
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1">
            {funds.length} Funds
          </Badge>
          <span className="text-sm text-muted-foreground">
            {activeFunds} active, {inactiveFunds} inactive
          </span>
        </div>

        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Button
            variant={view === "grid" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 px-3"
            onClick={() => setView("grid")}
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            Cards
          </Button>
          <Button
            variant={view === "table" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 px-3"
            onClick={() => setView("table")}
          >
            <List className="h-4 w-4 mr-2" />
            Table
          </Button>
        </div>
      </div>

      {view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {funds.map((fund) => (
            <Card key={fund.id} className="group hover:shadow-md transition-all duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base truncate">{fund.name}</CardTitle>
                    <CardDescription className="truncate font-mono text-xs">
                      {fund.code || fund.id}
                    </CardDescription>
                  </div>
                  <StatusBadge variant={statusVariants[fund.status]} dot>
                    {fund.status.charAt(0).toUpperCase() + fund.status.slice(1)}
                  </StatusBadge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Created {new Date(fund.createdAt).toLocaleDateString()}
                </div>

                <div className="flex items-center justify-between pt-3 border-t">
                  <Link href={`/dashboard/funds/${fund.id}/mandates`}>
                    <Button variant="outline" size="sm" className="h-8">
                      <ScrollText className="h-3.5 w-3.5 mr-1.5" />
                      Manage Mandates
                    </Button>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 px-2">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Fund
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-amber-600">
                        <PauseCircle className="h-4 w-4 mr-2" />
                        {fund.status === "active" ? "Deactivate" : "Activate"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <DataCard title="All Funds" description={`${funds.length} funds total`} noPadding>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fund</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {funds.map((fund) => (
                <TableRow key={fund.id} className="group">
                  <TableCell>
                    <div>
                      <p className="font-medium">{fund.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{fund.id}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono">
                    {fund.code || "-"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={statusVariants[fund.status]} dot>
                      {fund.status.charAt(0).toUpperCase() + fund.status.slice(1)}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(fund.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Link href={`/dashboard/funds/${fund.id}/mandates`}>
                      <Button variant="outline" size="sm" className="h-7">
                        <ScrollText className="h-3 w-3 mr-1" />
                        Mandates
                      </Button>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Fund
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Settings className="h-4 w-4 mr-2" />
                          Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-amber-600">
                          <PauseCircle className="h-4 w-4 mr-2" />
                          {fund.status === "active" ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataCard>
      )}
        </TabsContent>

        <TabsContent value="mandates" className="space-y-6 mt-6">
          {!fundMandatesEnabled ? (
            <EmptyState
              icon={AlertCircle}
              title="Fund Mandates Not Enabled"
              description="Fund Mandates are not enabled for this tenant. Contact your SaaS Admin to enable this feature."
            />
          ) : mandates.length === 0 ? (
            <EmptyState
              icon={ScrollText}
              title="No Mandate Templates"
              description="Create your first fund mandate template to get started."
              action={{
                label: "Create Template",
                onClick: () => setIsCreateOpen(true),
              }}
            />
          ) : (
            <DataCard title="Fund Mandate Templates" description={`${mandates.length} template${mandates.length !== 1 ? "s" : ""}`} noPadding>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Strategy</TableHead>
                    <TableHead>Geography</TableHead>
                    <TableHead>Ticket Range</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Version</TableHead>
                    <TableHead>Files</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mandates.map((mandate) => (
                    <>
                      <TableRow key={mandate.id} className="group">
                        <TableCell>
                          <div>
                            <p className="font-medium">{mandate.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{mandate.id}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{mandate.strategy}</TableCell>
                        <TableCell className="text-muted-foreground">{mandate.geography}</TableCell>
                        <TableCell className="tabular-nums">
                          {formatCurrency(mandate.minTicket)} - {formatCurrency(mandate.maxTicket)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge variant={mandateStatusVariants[mandate.status]} dot>
                            {mandate.status.charAt(0).toUpperCase() + mandate.status.slice(1)}
                          </StatusBadge>
                        </TableCell>
                        <TableCell className="text-center tabular-nums">
                          <Badge variant="outline">v{mandate.version}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                              className="hidden"
                              ref={(el) => {
                                if (el) fileInputRefs.current.set(mandate.id, el);
                              }}
                              onChange={(e) => handleFileChange(mandate.id, e.target.files?.[0] || null)}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => handleUploadClick(mandate.id)}
                              disabled={uploadingId === mandate.id}
                            >
                              {uploadingId === mandate.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Upload className="h-3 w-3" />
                              )}
                              <span className="ml-1">Upload</span>
                            </Button>
                            {mandate.latestFile && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2"
                                  onClick={() => handleDownload(mandate.id, "latest")}
                                >
                                  <Download className="h-3 w-3" />
                                  <span className="ml-1">v{mandate.latestFile.version}</span>
                                </Button>
                                {mandate.files.length > 1 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2"
                                    onClick={() => toggleVersionsExpanded(mandate.id)}
                                  >
                                    <History className="h-3 w-3" />
                                    <span className="ml-1">{mandate.files.length}</span>
                                    {expandedVersions.has(mandate.id) ? (
                                      <ChevronUp className="h-3 w-3 ml-1" />
                                    ) : (
                                      <ChevronDown className="h-3 w-3 ml-1" />
                                    )}
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                          {uploadMessage?.id === mandate.id && (
                            <p className={`text-xs mt-1 ${uploadMessage.type === "success" ? "text-emerald-600" : "text-red-600"}`}>
                              {uploadMessage.message}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(mandate.updatedAt)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {mandate.status !== "active" && (
                                <DropdownMenuItem onClick={() => handleStatusChange(mandate.id, "active")}>
                                  <CheckCircle className="h-4 w-4 mr-2 text-emerald-600" />
                                  Activate
                                </DropdownMenuItem>
                              )}
                              {mandate.status === "active" && (
                                <DropdownMenuItem onClick={() => handleStatusChange(mandate.id, "inactive")}>
                                  <XCircle className="h-4 w-4 mr-2 text-amber-600" />
                                  Deactivate
                                </DropdownMenuItem>
                              )}
                              {mandate.status === "inactive" && (
                                <DropdownMenuItem onClick={() => handleStatusChange(mandate.id, "draft")}>
                                  <FileText className="h-4 w-4 mr-2" />
                                  Set as Draft
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                      {expandedVersions.has(mandate.id) && mandate.files.length > 0 && (
                        <TableRow key={`${mandate.id}-versions`} className="bg-muted/30">
                          <TableCell colSpan={9}>
                            <div className="py-2 px-4">
                              <p className="text-sm font-medium mb-2">File Version History</p>
                              <div className="space-y-1">
                                {[...mandate.files].reverse().map((file) => (
                                  <div
                                    key={`${mandate.id}-v${file.version}`}
                                    className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-muted/50"
                                  >
                                    <div className="flex items-center gap-4">
                                      <Badge variant="outline" className="text-xs">v{file.version}</Badge>
                                      <span className="font-mono text-xs">{file.fileName}</span>
                                      <span className="text-muted-foreground text-xs">{formatFileSize(file.sizeBytes)}</span>
                                      <span className="text-muted-foreground text-xs">{formatDate(file.uploadedAt)}</span>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2"
                                      onClick={() => handleDownload(mandate.id, file.version)}
                                    >
                                      <Download className="h-3 w-3 mr-1" />
                                      Download
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </DataCard>
          )}

          {/* Azure Blob Storage Mandate Templates */}
          {canManageFundMandates && (
            <Card className="mt-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Azure Blob Mandate Templates</CardTitle>
                    <CardDescription>
                      Upload and manage mandate template files (stored in Azure Blob Storage)
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="hidden"
                      ref={blobFileInputRef}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
                          const allowedExtensions = [".pdf", ".doc", ".docx"];
                          if (!allowedExtensions.includes(ext)) {
                            setBlobUploadMessage({
                              message: "Only PDF, DOC, and DOCX files are supported.",
                              type: "error",
                            });
                            if (blobFileInputRef.current) blobFileInputRef.current.value = "";
                            return;
                          }
                          handleBlobUpload("F-001", file);
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadBlobMandates("F-001")}
                      disabled={blobLoading}
                    >
                      {blobLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Refresh"
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => blobFileInputRef.current?.click()}
                      disabled={blobLoading}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                  </div>
                </div>
                {blobUploadMessage && (
                  <p className={`text-sm mt-2 ${blobUploadMessage.type === "success" ? "text-emerald-600" : "text-red-600"}`}>
                    {blobUploadMessage.message}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {blobMandates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No mandate templates uploaded yet.</p>
                    <p className="text-xs mt-1">Click &quot;Refresh&quot; to load templates or &quot;Upload&quot; to add one.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {blobMandates.map((blob, index) => (
                      <div
                        key={blob.path || `blob-${index}`}
                        className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">
                              {blob.fileName || (typeof blob.path === "string" && blob.path ? blob.path.split("/").pop() : "Unknown file")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(blob.size || 0)} • {formatDate(blob.lastModified || "")}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {blob.contentType?.includes("pdf") ? "PDF" : "DOCX"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
