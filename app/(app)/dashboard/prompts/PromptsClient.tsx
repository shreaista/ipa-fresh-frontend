"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader, DataCard } from "@/components/app";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Save,
  History,
  Play,
  Loader2,
  Globe,
  Wallet,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Fund } from "@/lib/mock/fundsStore";
import { cn } from "@/lib/utils";

interface PromptVersion {
  id: string;
  content?: string;
  savedAt: string;
}

interface GlobalPrompt {
  key: string;
  content: string;
  versions: { id: string; savedAt: string }[];
}

interface FundPrompt {
  fundId: string;
  key: string;
  content: string;
}

const PROMPT_LABELS: Record<string, string> = {
  evaluation_system: "Evaluation System Prompt",
  validation_system: "Validation System Prompt",
};

function PromptEditor({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      spellCheck={false}
      className={cn(
        "font-mono text-sm w-full min-h-[280px] rounded-lg border border-input bg-[#1e1e1e] text-[#d4d4d4] px-4 py-3 resize-y",
        "placeholder:text-muted-foreground/60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        "selection:bg-primary/30",
        className
      )}
      style={{ tabSize: 2 }}
    />
  );
}

interface PromptsClientProps {
  funds: Fund[];
}

export default function PromptsClient({ funds }: PromptsClientProps) {
  const [globalPrompts, setGlobalPrompts] = useState<GlobalPrompt[]>([]);
  const [fundPrompts, setFundPrompts] = useState<FundPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const [selectedKey, setSelectedKey] = useState<string>("evaluation_system");
  const [selectedFundId, setSelectedFundId] = useState<string>("");
  const [editContent, setEditContent] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  const [versionsOpen, setVersionsOpen] = useState(false);
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  const [testInput, setTestInput] = useState("");
  const [testOutput, setTestOutput] = useState("");
  const [testNote, setTestNote] = useState("");

  const loadPrompts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedFundId) params.set("fundId", selectedFundId);
      const res = await fetch(`/api/tenant/prompts?${params}`);
      const data = await res.json();
      if (data.ok && data.data) {
        setGlobalPrompts(data.data.global ?? []);
        setFundPrompts(data.data.fundSpecific ?? []);
        const gp = data.data.global?.find((p: GlobalPrompt) => p.key === selectedKey);
        const fp = selectedFundId
          ? data.data.fundSpecific?.find((p: FundPrompt) => p.fundId === selectedFundId && p.key === selectedKey)
          : null;
        const content = fp?.content ?? gp?.content ?? "";
        setEditContent(content);
        setHasChanges(false);
      }
    } catch (e) {
      console.error("Failed to load prompts:", e);
    } finally {
      setLoading(false);
    }
  }, [selectedKey, selectedFundId]);

  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  useEffect(() => {
    const gp = globalPrompts.find((p) => p.key === selectedKey);
    const fp = selectedFundId
      ? fundPrompts.find((p) => p.fundId === selectedFundId && p.key === selectedKey)
      : null;
    const content = fp?.content ?? gp?.content ?? "";
    if (!loading) setEditContent(content);
  }, [selectedKey, selectedFundId, globalPrompts, fundPrompts, loading]);

  const loadVersions = useCallback(async () => {
    setLoadingVersions(true);
    try {
      const params = new URLSearchParams({ key: selectedKey });
      if (selectedFundId) params.set("fundId", selectedFundId);
      const res = await fetch(`/api/tenant/prompts/versions?${params}`);
      const data = await res.json();
      if (data.ok && data.data?.versions) {
        setVersions(data.data.versions);
      }
    } catch (e) {
      console.error("Failed to load versions:", e);
    } finally {
      setLoadingVersions(false);
    }
  }, [selectedKey, selectedFundId]);

  useEffect(() => {
    if (versionsOpen) loadVersions();
  }, [versionsOpen, loadVersions]);

  const handleSave = async () => {
    const id = selectedFundId ? `${selectedKey}:${selectedFundId}` : selectedKey;
    setSaving(id);
    try {
      const res = await fetch("/api/tenant/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: selectedKey,
          content: editContent,
          fundId: selectedFundId || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setHasChanges(false);
        await loadPrompts();
        if (versionsOpen) await loadVersions();
      }
    } catch (e) {
      console.error("Failed to save:", e);
    } finally {
      setSaving(null);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestOutput("");
    setTestNote("");
    try {
      const res = await fetch("/api/tenant/prompts/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: editContent,
          userInput: testInput || "Sample proposal text for testing...",
        }),
      });
      const data = await res.json();
      if (data.ok && data.data) {
        setTestOutput(data.data.output ?? "");
        setTestNote(data.data.note ?? "");
      }
    } catch (e) {
      console.error("Failed to test:", e);
      setTestOutput("Error running test.");
    } finally {
      setTesting(false);
    }
  };

  const handleRestoreVersion = (content: string) => {
    setEditContent(content);
    setHasChanges(true);
    setVersionsOpen(false);
  };

  const isFundSpecific = !!selectedFundId;
  const currentPrompt = isFundSpecific
    ? fundPrompts.find((p) => p.fundId === selectedFundId && p.key === selectedKey)
    : globalPrompts.find((p) => p.key === selectedKey);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prompt Management"
        subtitle="Edit and version AI prompts for evaluation and validation"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Global Prompts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Global Prompts
              </CardTitle>
              <CardDescription>System prompts used across all funds</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                {(["evaluation_system", "validation_system"] as const).map((key) => (
                  <Button
                    key={key}
                    variant={selectedKey === key && !selectedFundId ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedFundId("");
                      setSelectedKey(key);
                      setHasChanges(false);
                    }}
                  >
                    {PROMPT_LABELS[key] ?? key}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Fund-specific Prompts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Fund-specific Prompts
              </CardTitle>
              <CardDescription>Override prompts for a specific fund</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Fund</Label>
                <Select
                  value={selectedFundId || "_none"}
                  onValueChange={(v) => {
                    setSelectedFundId(v === "_none" ? "" : v);
                    setHasChanges(false);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select fund (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— Global (no override) —</SelectItem>
                    {funds.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name} {f.code ? `(${f.code})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedFundId && (
                  <div className="flex gap-2 mt-2">
                    {(["evaluation_system", "validation_system"] as const).map((key) => (
                      <Button
                        key={key}
                        variant={selectedKey === key && selectedFundId ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setSelectedKey(key);
                          setHasChanges(false);
                        }}
                      >
                        {PROMPT_LABELS[key] ?? key}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Editor */}
          <DataCard
            title={isFundSpecific ? `Edit: ${PROMPT_LABELS[selectedKey] ?? selectedKey} (${funds.find((f) => f.id === selectedFundId)?.name ?? selectedFundId})` : `Edit: ${PROMPT_LABELS[selectedKey] ?? selectedKey}`}
            description="Code editor style — monospace, dark theme"
            actions={
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVersionsOpen(!versionsOpen)}
                >
                  <History className="h-4 w-4 mr-1" />
                  Version history
                  {versionsOpen ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!hasChanges || !!saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  Save
                </Button>
              </div>
            }
          >
            <PromptEditor
              value={editContent}
              onChange={(v) => {
                setEditContent(v);
                setHasChanges(true);
              }}
              placeholder="Enter your system prompt..."
            />

            {versionsOpen && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium mb-2">Version History</p>
                {loadingVersions ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </div>
                ) : versions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No versions yet. Save to create the first version.</p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {[...versions].reverse().map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 text-sm"
                      >
                        <span className="font-mono text-xs">{v.id}</span>
                        <span className="text-muted-foreground text-xs">
                          {new Date(v.savedAt).toLocaleString()}
                        </span>
                        {v.content !== undefined && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7"
                            onClick={() => handleRestoreVersion(v.content!)}
                          >
                            Restore
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </DataCard>

          {/* Test Prompt */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Test Prompt
              </CardTitle>
              <CardDescription>Run a test with sample input and preview output</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Sample User Input (proposal text)</Label>
                <textarea
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  placeholder="Paste sample proposal text or leave blank for default..."
                  className="w-full min-h-[80px] rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
                />
              </div>
              <Button onClick={handleTest} disabled={testing}>
                {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                Run Test
              </Button>
              {testOutput && (
                <div className="space-y-2">
                  <Label>Output Preview</Label>
                  <pre className="w-full min-h-[120px] max-h-60 overflow-auto rounded-lg border bg-[#1e1e1e] text-[#d4d4d4] p-4 text-xs font-mono whitespace-pre-wrap">
                    {testOutput}
                  </pre>
                  {testNote && (
                    <p className="text-xs text-muted-foreground">{testNote}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tips</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>• Global prompts apply to all evaluations. Fund-specific prompts override for that fund only.</p>
              <p>• Use clear instructions and JSON schema in the prompt for structured outputs.</p>
              <p>• Version history keeps the last 20 saves. Use Restore to revert.</p>
              <p>• Test runs use a simulated response until an LLM endpoint is connected.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
