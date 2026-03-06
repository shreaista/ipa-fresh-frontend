"use client";

import { useState, useRef, useSyncExternalStore, useCallback } from "react";
import { PageHeader, DataCard, EmptyState } from "@/components/app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Upload,
  Download,
  FileText,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface FundMandateBlob {
  name: string;
  mandateKey: string;
  uploadedAt: string;
  blobName: string;
  size: number;
  contentType: string;
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
  const [mandateKey, setMandateKey] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const initialLoadRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFiles = useCallback(async (filterKey?: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const params = new URLSearchParams({ source: "blob" });
      if (filterKey) {
        params.set("mandateKey", filterKey);
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
      loadFiles();
    }
    return null;
  });

  const handleUpload = async (file: File) => {
    if (!mandateKey.trim()) {
      setMessage({ text: "Please enter a mandate key", type: "error" });
      return;
    }

    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    const allowedExtensions = [".pdf", ".doc", ".docx"];
    if (!allowedExtensions.includes(ext)) {
      setMessage({ text: "Only PDF, DOC, and DOCX files are supported.", type: "error" });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("mandateKey", mandateKey.trim());
      formData.append("file", file);

      const res = await fetch("/api/tenant/fund-mandates/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.ok) {
        setMessage({ text: `Uploaded: ${data.data.filename}`, type: "success" });
        await loadFiles();
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
        subtitle="Upload and manage fund mandate template files"
        actions={
          <Button onClick={() => loadFiles()} disabled={loading}>
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
      <DataCard title="Upload New Template" description="Upload PDF, DOC, or DOCX files (max 25MB)">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <Label htmlFor="mandateKey">Mandate Key</Label>
            <Input
              id="mandateKey"
              value={mandateKey}
              onChange={(e) => setMandateKey(e.target.value)}
              placeholder="e.g., growth-equity-2026"
              className="mt-1"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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
              disabled={uploading || !mandateKey.trim()}
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
          title="No Templates Uploaded"
          description="Upload your first fund mandate template to get started."
        />
      ) : (
        <DataCard
          title="Uploaded Templates"
          description={`${files.length} file${files.length !== 1 ? "s" : ""} (newest first)`}
          noPadding
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File Name</TableHead>
                <TableHead>Mandate Key</TableHead>
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
                      <span className="font-medium">{file.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{file.mandateKey}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {file.contentType.includes("pdf")
                      ? "PDF"
                      : file.contentType.includes("word")
                      ? "DOCX"
                      : "DOC"}
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
