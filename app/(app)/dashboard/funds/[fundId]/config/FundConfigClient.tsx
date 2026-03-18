"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { PageHeader, DataCard } from "@/components/app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select";
import {
  ArrowLeft,
  Building2,
  Lightbulb,
  Briefcase,
  Globe,
  DollarSign,
  Shield,
  Sparkles,
  Save,
  Loader2,
} from "lucide-react";
import type { Fund } from "@/lib/mock/fundsStore";

const SECTOR_OPTIONS: MultiSelectOption[] = [
  { value: "healthcare", label: "Healthcare" },
  { value: "fintech", label: "Fintech" },
  { value: "enterprise-saas", label: "Enterprise SaaS" },
  { value: "consumer", label: "Consumer" },
  { value: "climate", label: "Climate / Clean Tech" },
  { value: "edtech", label: "EdTech" },
  { value: "ai-ml", label: "AI / ML" },
  { value: "infrastructure", label: "Infrastructure" },
  { value: "marketplace", label: "Marketplace" },
  { value: "other", label: "Other" },
];

const GEOGRAPHY_OPTIONS: MultiSelectOption[] = [
  { value: "north-america", label: "North America" },
  { value: "europe", label: "Europe" },
  { value: "uk", label: "UK" },
  { value: "apac", label: "Asia-Pacific" },
  { value: "latam", label: "Latin America" },
  { value: "africa", label: "Africa" },
  { value: "global", label: "Global" },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

interface FundConfigClientProps {
  fund: Fund;
}

export default function FundConfigClient({ fund }: FundConfigClientProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Fund Details
  const [name, setName] = useState(fund.name);
  const [code, setCode] = useState(fund.code ?? "");
  const [active, setActive] = useState(fund.status === "active");

  // Investment Thesis
  const [thesis, setThesis] = useState("");

  // Sector Preferences
  const [sectors, setSectors] = useState<string[]>([]);

  // Geography
  const [geographies, setGeographies] = useState<string[]>([]);

  // Ticket Size
  const [minTicket, setMinTicket] = useState(100000);
  const [maxTicket, setMaxTicket] = useState(5000000);

  // Risk Tolerance (0–100, higher = more risk-tolerant)
  const [riskTolerance, setRiskTolerance] = useState([50]);

  // Toggles
  const [aiEvaluationEnabled, setAiEvaluationEnabled] = useState(true);
  const [requireMandateMatch, setRequireMandateMatch] = useState(true);
  const [autoValidateProposals, setAutoValidateProposals] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    // Simulate save – add API call when backend is ready
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const aiPreview = useMemo(() => {
    const parts: string[] = [];
    parts.push(`The AI will evaluate proposals against **${name || fund.name}**`);
    if (thesis.trim()) {
      parts.push(`Investment thesis: ${thesis.slice(0, 150)}${thesis.length > 150 ? "…" : ""}`);
    }
    if (sectors.length > 0) {
      const labels = sectors.map((v) => SECTOR_OPTIONS.find((o) => o.value === v)?.label ?? v);
      parts.push(`Sector focus: ${labels.join(", ")}`);
    }
    if (geographies.length > 0) {
      const labels = geographies.map((v) => GEOGRAPHY_OPTIONS.find((o) => o.value === v)?.label ?? v);
      parts.push(`Geography: ${labels.join(", ")}`);
    }
    parts.push(`Ticket size: ${formatCurrency(minTicket)} – ${formatCurrency(maxTicket)}`);
    const riskLabel = riskTolerance[0] < 33 ? "Conservative" : riskTolerance[0] < 66 ? "Moderate" : "Aggressive";
    parts.push(`Risk tolerance: ${riskLabel} (${riskTolerance[0]}/100)`);
    if (requireMandateMatch) {
      parts.push("Mandate alignment is required for a positive fit score.");
    }
    if (aiEvaluationEnabled) {
      parts.push("AI will generate fit scores, strengths, risks, and recommendations.");
    }
    return parts;
  }, [name, fund.name, thesis, sectors, geographies, minTicket, maxTicket, riskTolerance, requireMandateMatch, aiEvaluationEnabled]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Fund Configuration: ${fund.name}`}
        subtitle="Configure investment criteria and AI evaluation settings"
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/funds/${fund.id}/mandates`}>
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Mandates
              </Button>
            </Link>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {saved ? "Saved" : "Save"}
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Fund Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Fund Details
              </CardTitle>
              <CardDescription>Basic fund information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Fund Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Growth Fund 2026" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Code</Label>
                  <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g., GF26" />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label htmlFor="active">Fund Active</Label>
                  <p className="text-sm text-muted-foreground">Accept new proposals for this fund</p>
                </div>
                <Switch id="active" checked={active} onCheckedChange={setActive} />
              </div>
            </CardContent>
          </Card>

          {/* Investment Thesis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Investment Thesis
              </CardTitle>
              <CardDescription>Core investment strategy and focus areas</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={thesis}
                onChange={(e) => setThesis(e.target.value)}
                placeholder="Describe the fund's investment thesis, target stage, and key focus areas..."
                className="min-h-[120px]"
              />
            </CardContent>
          </Card>

          {/* Sector Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Sector Preferences
              </CardTitle>
              <CardDescription>Preferred sectors (multi-select)</CardDescription>
            </CardHeader>
            <CardContent>
              <MultiSelect options={SECTOR_OPTIONS} value={sectors} onChange={setSectors} placeholder="Select sectors..." />
            </CardContent>
          </Card>

          {/* Geography */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Geography
              </CardTitle>
              <CardDescription>Target regions (multi-select)</CardDescription>
            </CardHeader>
            <CardContent>
              <MultiSelect options={GEOGRAPHY_OPTIONS} value={geographies} onChange={setGeographies} placeholder="Select regions..." />
            </CardContent>
          </Card>

          {/* Ticket Size */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Ticket Size
              </CardTitle>
              <CardDescription>Minimum and maximum investment amount</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="minTicket">Min Ticket ($)</Label>
                  <Input
                    id="minTicket"
                    type="number"
                    min={0}
                    value={minTicket}
                    onChange={(e) => setMinTicket(Number(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxTicket">Max Ticket ($)</Label>
                  <Input
                    id="maxTicket"
                    type="number"
                    min={0}
                    value={maxTicket}
                    onChange={(e) => setMaxTicket(Number(e.target.value) || 0)}
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Range: {formatCurrency(minTicket)} – {formatCurrency(maxTicket)}
              </p>
            </CardContent>
          </Card>

          {/* Risk Tolerance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Risk Tolerance
              </CardTitle>
              <CardDescription>How much risk the fund is willing to accept (0 = conservative, 100 = aggressive)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Risk Level</span>
                  <span className="text-sm text-muted-foreground tabular-nums">{riskTolerance[0]}/100</span>
                </div>
                <Slider value={riskTolerance} onValueChange={setRiskTolerance} max={100} step={5} className="w-full" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Conservative</span>
                  <span>Moderate</span>
                  <span>Aggressive</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Toggles */}
          <Card>
            <CardHeader>
              <CardTitle>Evaluation Settings</CardTitle>
              <CardDescription>Configure how AI evaluates proposals for this fund</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label htmlFor="aiEval">AI Evaluation</Label>
                  <p className="text-sm text-muted-foreground">Use AI to score and analyze proposals</p>
                </div>
                <Switch id="aiEval" checked={aiEvaluationEnabled} onCheckedChange={setAiEvaluationEnabled} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label htmlFor="mandateMatch">Require Mandate Match</Label>
                  <p className="text-sm text-muted-foreground">Proposals must align with mandate to pass</p>
                </div>
                <Switch id="mandateMatch" checked={requireMandateMatch} onCheckedChange={setRequireMandateMatch} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label htmlFor="autoValidate">Auto-validate Proposals</Label>
                  <p className="text-sm text-muted-foreground">Run validation when documents are uploaded</p>
                </div>
                <Switch id="autoValidate" checked={autoValidateProposals} onCheckedChange={setAutoValidateProposals} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Preview - Sticky sidebar */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-6">
            <DataCard
              title="How AI will evaluate deals for this fund"
              description="Preview based on your configuration"
              className="border-primary/20 bg-primary/5"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-sm font-medium">AI Evaluation Preview</span>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {aiPreview.map((line, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{line.replace(/\*\*(.*?)\*\*/g, "$1")}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground pt-2 border-t">
                  Save your configuration to apply these settings. The AI uses mandate documents and this config when evaluating proposals.
                </p>
              </div>
            </DataCard>
          </div>
        </div>
      </div>
    </div>
  );
}
