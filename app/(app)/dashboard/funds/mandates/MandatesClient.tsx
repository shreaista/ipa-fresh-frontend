"use client";

import { useState, useRef, useSyncExternalStore, useCallback, useEffect } from "react";
import { PageHeader, DataCard, EmptyState } from "@/components/app";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Upload,
  Download,
  FileText,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface FundMandateBlob {
  name?: string;
  mandateKey?: string;
  fundId?: string;
  uploadedAt?: string;
  blobName: string;
  size?: number;
  contentType?: string;
}

interface FundOption {
  id: string;
  name: string;
  code?: string;
}

function extractFilenameFromBlobName(blobName: string): string {
  if (!blobName) return "";
  const parts = blobName.split("/");
  return parts[parts.length - 1] || blobName;
}

function getDisplayFileName(blob: FundMandateBlob): string {
  if (blob.name && blob.name.trim()) return blob.name;
  const extracted = extractFilenameFromBlobName(blob.blobName);
  if (extracted && extracted.trim()) return extracted;
  return "Unknown file";
}

function getDisplayContentType(blob: FundMandateBlob): string {
  if (blob.contentType) {
    if (blob.contentType.includes("pdf")) return "PDF";
    if (blob.contentType.includes("word")) return "DOCX";
    if (blob.contentType.includes("msword")) return "DOC";
    if (blob.contentType.includes("spreadsheetml")) return "XLSX";
    if (blob.contentType.includes("ms-excel")) return "XLS";
  }
  const filename = getDisplayFileName(blob).toLowerCase();
  if (filename.endsWith(".pdf")) return "PDF";
  if (filename.endsWith(".docx")) return "DOCX";
  if (filename.endsWith(".doc")) return "DOC";
  if (filename.endsWith(".xlsx")) return "XLSX";
  if (filename.endsWith(".xls")) return "XLS";
  return "FILE";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

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

const emptySubscribe = () => () => {};

export default function MandatesClient() {
  const [files, setFiles] = useState<FundMandateBlob[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [funds, setFunds] = useState<FundOption[]>([]);
  const [selectedFundId, setSelectedFundId] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const initialLoadRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/tenant/funds", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.data?.funds)) {
          setFunds(data.data.funds);
        }
      })
      .catch(() => {});
  }, []);

  const loadFiles = useCallback(async (fundId?: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const params = new URLSearchParams({ source: "blob" });
      if (fundId) {
        params.set("fundId", fundId);
      }
      const res = await fetch(`/api/tenant/fund-mandates?${params}`);
      const data = await res.json();
      if (data.ok) {
        setFiles(data.data.files || []);
      } else {
        setMessage({ text: data.error || "Failed to load files", type: "error" });
      }
    } catch {
      setMessage({ text: "Network error", type: "error" });
    }
    setLoading(false);
  }, []);

  useSyncExternalStore(emptySubscribe, () => {
    if (!initialLoadRef.current) {
      initialLoadRef.current = true;
    }
    return null;
  });

  useEffect(() => {
    if (selectedFundId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch mandate files when fund changes
      void loadFiles(selectedFundId);
    } else {
      setFiles([]);
    }
  }, [selectedFundId, loadFiles]);

  const handleUpload = async (file: File) => {
    if (!selectedFundId) {
      setMessage({ text: "Please select a fund first", type: "error" });
      return;
    }

    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    const allowedExtensions = [".pdf", ".doc", ".docx", ".xls", ".xlsx"];
    if (!allowedExtensions.includes(ext)) {
      setMessage({ text: "Only PDF, DOC, DOCX, XLS, and XLSX files are supported.", type: "error" });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("fundId", selectedFundId);
      formData.append("file", file);

      const res = await fetch("/api/tenant/fund-mandates/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.ok) {
        setMessage({ text: `Uploaded: ${data.data.filename}`, type: "success" });
        await loadFiles(selectedFundId);
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

  const handleDownload = (blobName: string) => {
    window.open(`/api/tenant/fund-mandates/download?blobName=${encodeURIComponent(blobName)}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fund Mandate Templates"
        subtitle="Upload and manage fund mandate template files. Uploaded mandate files are used to evaluate whether proposals fit the fund strategy."
        actions={
          <Button onClick={() => selectedFundId && loadFiles(selectedFundId)} disabled={loading || !selectedFundId}>
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        }
      />

      {/* Upload Section */}
      <DataCard title="Upload New Template" description="Select a fund, then upload PDF, DOC, DOCX, XLS, or XLSX files (max 25MB). Files are automatically associated with the selected fund.">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="fundId">Fund</Label>
            <Select value={selectedFundId} onValueChange={setSelectedFundId}>
              <SelectTrigger id="fundId" className="mt-1">
                <SelectValue placeholder="Select a fund" />
              </SelectTrigger>
              <SelectContent>
                {funds.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                    {f.code ? ` (${f.code})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">Mandate files will be associated with this fund.</p>
          </div>
          <div className="flex gap-2">
            <input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || !selectedFundId}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Select & Upload
            </Button>
          </div>
        </div>
        {message && (
          <p className={`mt-3 text-sm ${message.type === "success" ? "text-emerald-600" : "text-red-600"}`}>
            {message.text}
          </p>
        )}
      </DataCard>

      {/* Files List */}
      {files.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={selectedFundId ? "No Templates for This Fund" : "Select a Fund"}
          description={selectedFundId ? "Upload mandate files for this fund to get started." : "Select a fund above to view or upload mandate templates."}
        />
      ) : (
        <DataCard
          title={`Mandate Files for ${funds.find((f) => f.id === selectedFundId)?.name || "Selected Fund"}`}
          description={`${files.length} file${files.length !== 1 ? "s" : ""} (newest first)`}
          noPadding
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File Name</TableHead>
                <TableHead>Fund</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Size</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((file) => (
                <TableRow key={file.blobName} className="group">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{getDisplayFileName(file)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{funds.find((f) => f.id === (file.fundId || selectedFundId))?.name || file.fundId || "-"}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {getDisplayContentType(file)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatFileSize(file.size || 0)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(file.uploadedAt || "")}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(file.blobName)}
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
        </DataCard>
      )}
    </div>
  );
}
