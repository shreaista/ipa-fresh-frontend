"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/app";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";

const STAGES = ["Seed", "Series A", "Series B", "Growth"] as const;
const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx", ".xls", ".xlsx"];
const MAX_FILE_SIZE = 25 * 1024 * 1024;

interface Fund {
  id: string;
  tenantId: string;
  name: string;
  code?: string;
  status: string;
}

async function fetchFunds(): Promise<Fund[]> {
  const res = await fetch("/api/tenant/funds", { credentials: "include" });
  const data = await res.json();
  if (!data.ok || !Array.isArray(data.data?.funds)) return [];
  return data.data.funds.filter((f: Fund) => f.status === "active");
}

function validateFile(file: File): string | null {
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return "Only PDF, DOC, DOCX, XLS, and XLSX files are supported.";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "File size exceeds 25MB limit.";
  }
  return null;
}

export default function NewProposalClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [funds, setFunds] = useState<Fund[]>([]);
  const [fundsLoading, setFundsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    company: "",
    sector: "",
    stage: "" as string,
    amountRequested: "",
    fundId: "",
    description: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const loadFunds = useCallback(async () => {
    setFundsLoading(true);
    const list = await fetchFunds();
    setFunds(list);
    setFundsLoading(false);
  }, []);

  useEffect(() => {
    loadFunds();
  }, [loadFunds]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setFileError(null);
    if (!f) {
      setFile(null);
      return;
    }
    const err = validateFile(f);
    if (err) {
      setFileError(err);
      setFile(null);
      e.target.value = "";
      return;
    }
    setFile(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const name = form.name.trim();
    if (!name) {
      setSubmitError("Proposal name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name,
        company: form.company.trim() || undefined,
        sector: form.sector.trim() || undefined,
        stage: STAGES.includes(form.stage as (typeof STAGES)[number]) ? form.stage : undefined,
        amountRequested: form.amountRequested ? Number(form.amountRequested) : undefined,
        fundId: form.fundId || undefined,
        description: form.description.trim() || undefined,
      };

      const res = await fetch("/api/tenant/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!data.ok || !data.data?.proposal) {
        setSubmitError(data.error || "Failed to create proposal");
        toast(data.error || "Failed to create proposal", "error");
        setIsSubmitting(false);
        return;
      }

      const proposalId = data.data.proposal.id;

      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await fetch(`/api/proposals/${proposalId}/documents`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadData.ok) {
          toast("Proposal created but document upload failed", "error");
        }
      }

      toast("Proposal created successfully");
      router.push("/dashboard/proposals");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      setSubmitError(msg);
      toast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

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
        title="New Proposal"
        subtitle="Create a new funding proposal"
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Proposal Details</CardTitle>
          <CardDescription>
            Fill in the proposal information. Proposal name is required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">
                  Proposal Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => {
                    setForm({ ...form, name: e.target.value });
                    if (submitError) setSubmitError(null);
                  }}
                  placeholder="e.g., AI Healthcare Analytics"
                  className={submitError && !form.name.trim() ? "border-destructive" : ""}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Company Name</Label>
                <Input
                  id="company"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  placeholder="e.g., MediPredict AI"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sector">Sector</Label>
                <Input
                  id="sector"
                  value={form.sector}
                  onChange={(e) => setForm({ ...form, sector: e.target.value })}
                  placeholder="e.g., Artificial Intelligence"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stage">Stage</Label>
                <Select
                  value={form.stage}
                  onValueChange={(v) => setForm({ ...form, stage: v })}
                >
                  <SelectTrigger id="stage">
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amountRequested">Amount Requested ($)</Label>
                <Input
                  id="amountRequested"
                  type="number"
                  min={0}
                  step={1}
                  value={form.amountRequested}
                  onChange={(e) => setForm({ ...form, amountRequested: e.target.value })}
                  placeholder="e.g., 10000000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fundId">Fund</Label>
                <Select
                  value={form.fundId}
                  onValueChange={(v) => setForm({ ...form, fundId: v })}
                  disabled={fundsLoading}
                >
                  <SelectTrigger id="fundId">
                    <SelectValue placeholder={fundsLoading ? "Loading funds..." : "Select fund"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {funds.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                        {f.code ? ` (${f.code})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="e.g., AI platform predicting patient deterioration"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Upload Proposal Document</Label>
              <p className="text-sm text-muted-foreground">
                PDF, DOC, DOCX, XLS, or XLSX. Max 25MB.
              </p>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  onChange={handleFileChange}
                  className="max-w-xs"
                />
                {file && (
                  <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                    {file.name}
                  </span>
                )}
              </div>
              {fileError && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {fileError}
                </p>
              )}
            </div>

            {submitError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting || !form.name.trim()}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Proposal
              </Button>
              <Link href="/dashboard/proposals">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
