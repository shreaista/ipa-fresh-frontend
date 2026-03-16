"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
import { ArrowLeft, Loader2, AlertCircle, X } from "lucide-react";
import {
  fetchFundsFromApi,
  filterActiveFundsForProposal,
  type FundOption,
} from "@/lib/api/funds";
import type { Fund } from "@/lib/mock/fundsStore";

const STAGES = [
  "Seed",
  "Series A",
  "Series B",
  "Growth",
  "Late Stage",
  "Grant / Nonprofit",
] as const;

const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx", ".xls", ".xlsx"];
const MAX_FILE_SIZE = 25 * 1024 * 1024;

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

interface NewProposalClientProps {
  initialFunds: Fund[];
}

export default function NewProposalClient({ initialFunds }: NewProposalClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const clientDataAuthoritativeRef = useRef(false);

  const activeFromInitial = useMemo(
    () => filterActiveFundsForProposal(initialFunds as FundOption[]),
    [initialFunds]
  );
  const [funds, setFunds] = useState<FundOption[]>(() => activeFromInitial);
  const [fundsLoading, setFundsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: "",
    company: "",
    sector: "",
    stage: "" as string,
    geography: "",
    businessModel: "",
    amountRequested: "",
    fundId: "",
    description: "",
  });
  const [files, setFiles] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);

  const loadFunds = useCallback(async () => {
    setFundsLoading(true);
    const result = await fetchFundsFromApi();
    if (result.ok && result.funds) {
      const active = filterActiveFundsForProposal(result.funds);
      const dropdownOptions = active.map((f) => ({ id: f.id, name: f.name, code: f.code }));
      console.log(
        "[NewProposal] Client fetch: endpoint /api/tenant/funds, raw count:",
        result.funds.length,
        "active count:",
        active.length,
        "dropdown options:",
        dropdownOptions
      );
      if (active.length > 0) {
        setFunds(active);
        clientDataAuthoritativeRef.current = true;
      } else {
        console.warn("[NewProposal] Client fetch returned 0 active funds, keeping SSR data to avoid overwriting with empty");
      }
    } else {
      console.warn("[NewProposal] Client fetch failed, keeping existing funds. Error:", result.error);
    }
    setFundsLoading(false);
  }, []);

  useEffect(() => {
    console.log(
      "[NewProposal] Initial funds from SSR: count:",
      initialFunds.length,
      "active:",
      activeFromInitial.length,
      "ids:",
      activeFromInitial.map((f) => f.id)
    );
    if (!clientDataAuthoritativeRef.current) {
      setFunds(activeFromInitial);
    }
  }, [initialFunds, activeFromInitial]);

  useEffect(() => {
    loadFunds();
  }, [loadFunds]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files ?? []);
    setFileErrors([]);

    const validFiles: File[] = [];
    const errors: string[] = [];

    for (const f of selectedFiles) {
      const err = validateFile(f);
      if (err) {
        errors.push(`${f.name}: ${err}`);
      } else {
        validFiles.push(f);
      }
    }

    if (errors.length > 0) {
      setFileErrors(errors);
    }
    setFiles((prev) => [...prev, ...validFiles]);
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setFileErrors([]);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!form.name.trim()) {
      errors.name = "Proposal name is required";
    }

    if (!form.company.trim()) {
      errors.company = "Company / Applicant name is required";
    }

    const amount = form.amountRequested ? Number(form.amountRequested) : NaN;
    if (!form.amountRequested.trim()) {
      errors.amountRequested = "Requested amount is required";
    } else if (Number.isNaN(amount) || amount < 0) {
      errors.amountRequested = "Requested amount must be a valid positive number";
    }

    if (!form.fundId) {
      errors.fundId = "Fund is required";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setFieldErrors({});

    if (!validateForm()) {
      setSubmitError("Please fix the validation errors before submitting.");
      toast("Please fix the validation errors", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        company: form.company.trim(),
        sector: form.sector.trim() || undefined,
        stage: STAGES.includes(form.stage as (typeof STAGES)[number]) ? form.stage : undefined,
        geography: form.geography.trim() || undefined,
        businessModel: form.businessModel.trim() || undefined,
        amountRequested: Number(form.amountRequested),
        fundId: form.fundId,
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

      if (files.length > 0) {
        let uploadFailed = false;
        for (const file of files) {
          const formData = new FormData();
          formData.append("file", file);
          const uploadRes = await fetch(`/api/proposals/${proposalId}/documents`, {
            method: "POST",
            credentials: "include",
            body: formData,
          });
          const uploadData = await uploadRes.json();
          if (!uploadData.ok) {
            uploadFailed = true;
          }
        }
        if (uploadFailed) {
          toast("Proposal created but some document uploads failed", "error");
        }
      }

      toast("Proposal created successfully");
      router.push(`/dashboard/proposals/${proposalId}`);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      setSubmitError(msg);
      toast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasFieldError = (field: string) => !!fieldErrors[field];

  const selectContentProps = {
    position: "popper" as const,
    sideOffset: 4,
    collisionPadding: 12,
    className: "z-[200]",
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
        subtitle="Create a new funding proposal linked to a fund"
      />

      <Card className="max-w-2xl overflow-visible">
        <CardHeader>
          <CardTitle>Proposal Details</CardTitle>
          <CardDescription>
            Fill in the proposal information. Fields marked with * are required.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-visible">
          <form onSubmit={handleSubmit} className="space-y-6 overflow-visible">
            <div className="grid gap-5 sm:grid-cols-2 overflow-visible">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">
                  Proposal Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => {
                    setForm({ ...form, name: e.target.value });
                    if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: "" }));
                    if (submitError) setSubmitError(null);
                  }}
                  placeholder="e.g., AI Healthcare Analytics"
                  className={hasFieldError("name") ? "border-destructive" : ""}
                />
                {fieldErrors.name && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="company">
                  Company / Applicant Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="company"
                  value={form.company}
                  onChange={(e) => {
                    setForm({ ...form, company: e.target.value });
                    if (fieldErrors.company) setFieldErrors((p) => ({ ...p, company: "" }));
                  }}
                  placeholder="e.g., MediPredict AI"
                  className={hasFieldError("company") ? "border-destructive" : ""}
                />
                {fieldErrors.company && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {fieldErrors.company}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="amountRequested">
                  Requested Amount ($) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="amountRequested"
                  type="number"
                  min={0}
                  step={1}
                  value={form.amountRequested}
                  onChange={(e) => {
                    setForm({ ...form, amountRequested: e.target.value });
                    if (fieldErrors.amountRequested) setFieldErrors((p) => ({ ...p, amountRequested: "" }));
                  }}
                  placeholder="e.g., 1000000"
                  className={hasFieldError("amountRequested") ? "border-destructive" : ""}
                />
                {fieldErrors.amountRequested && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {fieldErrors.amountRequested}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="fundId">
                  Fund <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.fundId}
                  onValueChange={(v) => {
                    setForm({ ...form, fundId: v });
                    if (fieldErrors.fundId) setFieldErrors((p) => ({ ...p, fundId: "" }));
                  }}
                  disabled={fundsLoading}
                >
                  <SelectTrigger id="fundId" className={hasFieldError("fundId") ? "border-destructive" : ""}>
                    <SelectValue placeholder={fundsLoading ? "Loading funds..." : "Select fund"} />
                  </SelectTrigger>
                  <SelectContent {...selectContentProps}>
                    {funds.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                        {f.code ? ` (${f.code})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {funds.length === 0 && !fundsLoading && (
                  <p className="text-sm text-muted-foreground">No active funds available. Create a fund first.</p>
                )}
                {fieldErrors.fundId && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {fieldErrors.fundId}
                  </p>
                )}
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
                <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v })}>
                  <SelectTrigger id="stage">
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent {...selectContentProps}>
                    {STAGES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="geography">Geography</Label>
                <Input
                  id="geography"
                  value={form.geography}
                  onChange={(e) => setForm({ ...form, geography: e.target.value })}
                  placeholder="e.g., North America"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessModel">Business Model</Label>
                <Input
                  id="businessModel"
                  value={form.businessModel}
                  onChange={(e) => setForm({ ...form, businessModel: e.target.value })}
                  placeholder="e.g., B2B SaaS"
                />
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
              <Label>Upload Proposal Documents</Label>
              <p className="text-sm text-muted-foreground">
                PDF, DOC, DOCX, XLS, or XLSX. Max 25MB per file. You can select multiple files.
              </p>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  onChange={handleFileChange}
                  className="max-w-xs"
                  multiple
                />
              </div>
              {files.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {files.map((f, i) => (
                    <li key={`${f.name}-${i}`} className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground truncate max-w-[280px]">{f.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeFile(i)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              {fileErrors.length > 0 && (
                <div className="space-y-1">
                  {fileErrors.map((err, i) => (
                    <p key={i} className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {err}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {submitError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  fundsLoading ||
                  !form.name.trim() ||
                  !form.company.trim() ||
                  !form.amountRequested.trim() ||
                  !form.fundId
                }
              >
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
