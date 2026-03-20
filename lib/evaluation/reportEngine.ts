import "server-only";

// Report Engine - Full AI Investment Memo Generation
//
// Loads proposal, mandate, documents, evaluation, validation.
// Generates structured investment report via AI.
// Persists report and supports PDF download.

import {
  uploadBlob,
  listBlobs,
  downloadBlob,
  getDefaultContainer,
} from "@/lib/storage/azureBlob";
import {
  isLLMConfigured,
  getLLMProvider,
} from "@/lib/llm/openaiClient";
import {
  extractContentForEvaluation,
  type BlobInfo,
} from "./textExtraction";
import { listProposalDocuments } from "@/lib/storage/proposalDocuments";
import { listFundMandates } from "@/lib/storage/azure";
import { listFundMandateBlobsByFundId } from "@/lib/storage/azureBlob";
import { listEvaluations, downloadEvaluation } from "./proposalEvaluator";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface InvestmentReport {
  reportId: string;
  proposalId: string;
  title: string;
  generatedAt: string;
  score: number | null;
  confidence: "low" | "medium" | "high";
  summary: string;
  investmentThesis: string;
  strengths: string[];
  risks: string[];
  recommendations: string[];
  validationSummary: string;
  fitSummary: string;
  decision: "Review" | "Invest" | "Pass";
  warnings?: string[];
  rawPayload?: Record<string, unknown>;
}

export interface ReportEngineInput {
  tenantId: string;
  proposalId: string;
  proposalName?: string;
  applicant?: string;
  fundName?: string;
  fundId?: string | null;
  amount?: number;
  generatedByUserId: string;
  generatedByEmail: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Path Utilities
// ─────────────────────────────────────────────────────────────────────────────

function generateReportId(): string {
  return `rep-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildReportPath(tenantId: string, proposalId: string, reportId: string): string {
  return `tenants/${tenantId}/proposals/${proposalId}/reports/${reportId}/report.json`;
}

function getReportsPrefix(tenantId: string, proposalId: string): string {
  return `tenants/${tenantId}/proposals/${proposalId}/reports/`;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Report Prompt
// ─────────────────────────────────────────────────────────────────────────────

const REPORT_SYSTEM_PROMPT = `You are an expert investment analyst preparing an Investment Evaluation Report for an investment committee.

Your task is to produce a professional, investment-committee-friendly report based on the provided inputs.

Guidelines:
- Be objective and thorough
- Use clear, professional language
- If data is missing, explicitly state "Not available" or "Data not provided" - do NOT invent details
- Confidence should reflect the quality and completeness of information
- Decision should be one of: Review, Invest, or Pass

You MUST respond with valid JSON only, no additional text.`;

function buildReportUserPrompt(input: {
  proposalMetadata: string;
  proposalText: string;
  mandateText: string;
  evaluationData: string;
  validationData: string;
  warnings: string[];
}): string {
  const { proposalMetadata, proposalText, mandateText, evaluationData, validationData, warnings } = input;

  let prompt = `## Proposal Metadata
${proposalMetadata}

## Extracted Proposal Document Text
${proposalText || "[No proposal documents or text extraction failed]"}

## Fund Mandate Text
${mandateText || "[No mandate text available]"}

## Latest Evaluation Result
${evaluationData || "[No evaluation has been run yet]"}

## Validation Result
${validationData || "[No validation has been run yet]"}`;

  if (warnings.length > 0) {
    prompt += `

## Warnings (report should acknowledge these)
${warnings.map((w) => `- ${w}`).join("\n")}`;
  }

  prompt += `

## Required Output (JSON only)
Respond with a JSON object:
{
  "summary": "<Executive summary - 2-4 sentences>",
  "investmentThesis": "<Investment thesis - why this opportunity fits or doesn't fit>",
  "validationSummary": "<Summary of validation findings or 'Validation not run'>",
  "fitSummary": "<Fund fit summary - alignment with mandate>",
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "risks": ["<risk 1>", "<risk 2>", ...],
  "recommendations": ["<recommendation 1>", "<recommendation 2>", ...],
  "decision": "<'Review' | 'Invest' | 'Pass'>",
  "confidence": "<'low' | 'medium' | 'high'>",
  "score": <number 0-100 or null if insufficient data>
}`;

  return prompt;
}

// ─────────────────────────────────────────────────────────────────────────────
// LLM Call
// ─────────────────────────────────────────────────────────────────────────────

async function callReportLLM(
  systemPrompt: string,
  userPrompt: string
): Promise<{
  summary: string;
  investmentThesis: string;
  validationSummary: string;
  fitSummary: string;
  strengths: string[];
  risks: string[];
  recommendations: string[];
  decision: "Review" | "Invest" | "Pass";
  confidence: "low" | "medium" | "high";
  score: number | null;
}> {
  const messages = [
    { role: "system" as const, content: systemPrompt },
    { role: "user" as const, content: userPrompt },
  ];

  let rawContent: string;

  if (isAzureOpenAIConfigured()) {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT!.replace(/\/$/, "");
    const apiKey = process.env.AZURE_OPENAI_KEY!;
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT!;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-02-15-preview";
    const config = { endpoint, apiKey, deploymentName, apiVersion };
    const url = `${config.endpoint}/openai/deployments/${config.deploymentName}/chat/completions?api-version=${config.apiVersion}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": config.apiKey,
      },
      body: JSON.stringify({
        messages,
        temperature: 0.3,
        max_tokens: 2500,
      }),
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Azure OpenAI error: ${response.status} - ${errText}`);
    }
    const data = await response.json();
    rawContent = data.choices?.[0]?.message?.content;
    if (!rawContent) throw new Error("No content in Azure OpenAI response");
  } else {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not configured");
    const config = {
      apiKey,
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    };
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: 0.3,
        max_tokens: 2500,
      }),
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI error: ${response.status} - ${errText}`);
    }
    const data = await response.json();
    rawContent = data.choices?.[0]?.message?.content;
    if (!rawContent) throw new Error("No content in OpenAI response");
  }

  let jsonStr = rawContent.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();

  const parsed = JSON.parse(jsonStr) as Record<string, unknown>;

  return {
    summary: String(parsed.summary ?? "Not available"),
    investmentThesis: String(parsed.investmentThesis ?? "Not available"),
    validationSummary: String(parsed.validationSummary ?? "Validation not run"),
    fitSummary: String(parsed.fitSummary ?? "Not available"),
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : [],
    risks: Array.isArray(parsed.risks) ? parsed.risks.map(String) : [],
    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.map(String) : [],
    decision: (parsed.decision === "Invest" || parsed.decision === "Pass" ? parsed.decision : "Review") as "Review" | "Invest" | "Pass",
    confidence: (["low", "medium", "high"].includes(String(parsed.confidence)) ? parsed.confidence : "medium") as "low" | "medium" | "high",
    score: typeof parsed.score === "number" ? parsed.score : null,
  };
}

function isAzureOpenAIConfigured(): boolean {
  return !!(
    process.env.AZURE_OPENAI_ENDPOINT &&
    process.env.AZURE_OPENAI_KEY &&
    process.env.AZURE_OPENAI_DEPLOYMENT
  );
}

// Fallback when LLM not configured - use evaluation data if available
function buildFallbackReport(
  evaluation: { fitScore: number | null; proposalSummary: string; mandateSummary: string; strengths: string[]; risks: string[]; recommendations: string[]; confidence: "low" | "medium" | "high" } | null,
  validation: { score: number; findings: string[] } | null,
  proposalText: string,
  warnings: string[]
): Omit<InvestmentReport, "reportId" | "proposalId" | "title" | "generatedAt"> {
  const score = evaluation?.fitScore ?? null;
  const confidence = evaluation?.confidence ?? "low";

  let decision: "Review" | "Invest" | "Pass" = "Review";
  if (score !== null) {
    if (score >= 75) decision = "Invest";
    else if (score < 50) decision = "Pass";
  }

  const validationSummary = validation
    ? `Validation score: ${validation.score}. Findings: ${validation.findings.join("; ")}`
    : "Validation not run";

  const fitSummary = evaluation?.mandateSummary ?? "No evaluation available";

  return {
    score,
    confidence,
    summary: evaluation?.proposalSummary ?? (proposalText ? `Proposal text available (${proposalText.length} chars). No AI analysis.` : "No proposal documents."),
    investmentThesis: evaluation?.mandateSummary ?? "No mandate or evaluation data.",
    strengths: evaluation?.strengths ?? [],
    risks: evaluation?.risks ?? [],
    recommendations: evaluation?.recommendations ?? [],
    validationSummary,
    fitSummary,
    decision,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Report Generation
// ─────────────────────────────────────────────────────────────────────────────

export async function generateInvestmentReport(input: ReportEngineInput): Promise<InvestmentReport> {
  const {
    tenantId,
    proposalId,
    proposalName,
    applicant,
    fundName,
    fundId,
    amount,
  } = input;

  console.log("[reportEngine] Report generation started for proposal", proposalId);

  const reportId = generateReportId();
  const warnings: string[] = [];

  // 1. Load proposal documents
  const proposalDocsResult = await listProposalDocuments(tenantId, proposalId);
  const proposalDocs = proposalDocsResult.flat.filter((d) => !d.blobPath.includes("/evaluations/"));

  if (proposalDocs.length === 0) {
    console.log("[reportEngine] No proposal documents found");
    throw new Error("Report could not be generated because no proposal documents were found.");
  }

  console.log("[reportEngine] Proposal loaded:", proposalDocs.length, "documents");

  // 2. Load mandate
  let mandateTemplates: Array<{ blobName: string; contentType: string; name: string; uploadedAt: string }> = [];

  if (fundId) {
    try {
      const blobs = await listFundMandateBlobsByFundId(tenantId, fundId);
      mandateTemplates = blobs.map((b) => ({
        blobName: b.blobPath,
        contentType: b.contentType || "application/octet-stream",
        name: b.name,
        uploadedAt: b.uploadedAt,
      }));
      console.log("[reportEngine] Mandate loaded for fundId:", fundId, mandateTemplates.length, "files");
    } catch (err) {
      console.warn("[reportEngine] Error loading mandate for fundId:", fundId, err);
      warnings.push("Could not load fund mandate files.");
    }
  }

  if (mandateTemplates.length === 0) {
    try {
      const all = await listFundMandates({ tenantId });
      if (all.length > 0) {
        const firstKey = all[0].mandateKey;
        mandateTemplates = all.filter((m) => m.mandateKey === firstKey).map((m) => ({
          blobName: m.blobName,
          contentType: m.contentType,
          name: m.name,
          uploadedAt: m.uploadedAt,
        }));
        console.log("[reportEngine] Mandate loaded (fallback):", mandateTemplates.length, "files");
      } else {
        warnings.push("No mandate text available.");
        console.log("[reportEngine] No mandate found");
      }
    } catch {
      warnings.push("No mandate text available.");
    }
  }

  const mandateBlobs: BlobInfo[] = mandateTemplates.map((t) => ({
    blobPath: t.blobName,
    contentType: t.contentType,
    filename: t.name,
    uploadedAt: t.uploadedAt,
  }));

  const proposalBlobs: BlobInfo[] = proposalDocs.map((d) => ({
    blobPath: d.blobPath,
    contentType: d.contentType,
    filename: d.filename,
    uploadedAt: d.uploadedAt,
  }));

  // 3. Extract text
  let proposalText = "";
  let mandateText = "";
  try {
    const extracted = await extractContentForEvaluation(mandateBlobs, proposalBlobs);
    proposalText = extracted.proposalText;
    mandateText = extracted.mandateText;
    if (extracted.extractionWarnings.length > 0) {
      warnings.push(...extracted.extractionWarnings);
    }
    console.log("[reportEngine] Extracted text - proposal:", proposalText.length, "chars, mandate:", mandateText.length, "chars");
  } catch (err) {
    console.error("[reportEngine] Text extraction failed:", err);
    throw new Error("Report could not be generated because text extraction from documents failed.");
  }

  if (proposalText.length === 0) {
    throw new Error("Report could not be generated because no text could be extracted from proposal documents.");
  }

  // 4. Load latest evaluation
  let evaluationData: string | null = null;
  let evaluationReport: Awaited<ReturnType<typeof downloadEvaluation>> = null;
  try {
    const evals = await listEvaluations(tenantId, proposalId, true);
    if (evals.length > 0) {
      evaluationReport = await downloadEvaluation(tenantId, proposalId, evals[0].blobPath);
      if (evaluationReport) {
        evaluationData = JSON.stringify({
          fitScore: evaluationReport.fitScore,
          proposalSummary: evaluationReport.proposalSummary,
          mandateSummary: evaluationReport.mandateSummary,
          strengths: evaluationReport.strengths,
          risks: evaluationReport.risks,
          recommendations: evaluationReport.recommendations,
          confidence: evaluationReport.confidence,
        });
        console.log("[reportEngine] Evaluation found - fitScore:", evaluationReport.fitScore);
      }
    } else {
      warnings.push("Report generated with limited data because evaluation results were unavailable.");
      console.log("[reportEngine] No evaluation found");
    }
  } catch (err) {
    console.warn("[reportEngine] Could not load evaluation:", err);
    warnings.push("Evaluation results were unavailable.");
  }

  // 5. Load validation (from evaluation if present, or we could add a separate validation fetch)
  let validationData: string | null = null;
  if (evaluationReport?.validationSummary) {
    const vs = evaluationReport.validationSummary;
    validationData = JSON.stringify({
      validationScore: vs.validationScore,
      summary: vs.summary,
      findings: vs.findings,
    });
  }

  // 6. Build proposal metadata
  const proposalMetadata = [
    `Proposal ID: ${proposalId}`,
    proposalName && `Name: ${proposalName}`,
    applicant && `Applicant: ${applicant}`,
    fundName && `Fund: ${fundName}`,
    amount != null && `Amount: $${Number(amount).toLocaleString()}`,
  ]
    .filter(Boolean)
    .join("\n");

  // 7. Generate report via AI or fallback
  let reportContent: Omit<InvestmentReport, "reportId" | "proposalId" | "title" | "generatedAt">;

  if (isLLMConfigured()) {
    console.log("[reportEngine] Using LLM provider:", getLLMProvider());
    try {
      const userPrompt = buildReportUserPrompt({
        proposalMetadata,
        proposalText: proposalText.slice(0, 15000),
        mandateText: mandateText.slice(0, 8000),
        evaluationData: evaluationData ?? "",
        validationData: validationData ?? "",
        warnings,
      });

      const llmResult = await callReportLLM(REPORT_SYSTEM_PROMPT, userPrompt);
      console.log("[reportEngine] AI generation success");

      reportContent = {
        ...llmResult,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (err) {
      console.error("[reportEngine] AI generation failure:", err);
      reportContent = buildFallbackReport(
        evaluationReport
          ? {
              fitScore: evaluationReport.fitScore,
              proposalSummary: evaluationReport.proposalSummary,
              mandateSummary: evaluationReport.mandateSummary,
              strengths: evaluationReport.strengths,
              risks: evaluationReport.risks,
              recommendations: evaluationReport.recommendations,
              confidence: evaluationReport.confidence,
            }
          : null,
        evaluationReport?.validationSummary
          ? { score: evaluationReport.validationSummary.validationScore, findings: evaluationReport.validationSummary.findings ?? [] }
          : null,
        proposalText,
        [...warnings, "AI generation failed. Report uses available data only."]
      );
    }
  } else {
    console.log("[reportEngine] No LLM configured - using fallback");
    reportContent = buildFallbackReport(
      evaluationReport
        ? {
            fitScore: evaluationReport.fitScore,
            proposalSummary: evaluationReport.proposalSummary,
            mandateSummary: evaluationReport.mandateSummary,
            strengths: evaluationReport.strengths,
            risks: evaluationReport.risks,
            recommendations: evaluationReport.recommendations,
            confidence: evaluationReport.confidence,
          }
        : null,
      evaluationReport?.validationSummary
        ? { score: evaluationReport.validationSummary.validationScore, findings: evaluationReport.validationSummary.findings ?? [] }
        : null,
      proposalText,
      [...warnings, "No AI configured. Report uses available data only."]
    );
  }

  const report: InvestmentReport = {
    reportId,
    proposalId,
    title: "Investment Evaluation Report",
    generatedAt: new Date().toISOString(),
    ...reportContent,
  };

  // 8. Save report
  await saveReport(tenantId, report);
  console.log("[reportEngine] Report saved:", reportId);

  return report;
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage
// ─────────────────────────────────────────────────────────────────────────────

export async function saveReport(tenantId: string, report: InvestmentReport): Promise<string> {
  const path = buildReportPath(tenantId, report.proposalId, report.reportId);
  const container = getDefaultContainer();
  await uploadBlob({
    container,
    path,
    contentType: "application/json",
    buffer: Buffer.from(JSON.stringify(report, null, 2), "utf-8"),
  });
  return path;
}

export async function getLatestReport(
  tenantId: string,
  proposalId: string
): Promise<InvestmentReport | null> {
  const container = getDefaultContainer();
  const prefix = getReportsPrefix(tenantId, proposalId);
  const blobs = await listBlobs({ container, prefix });
  const reportBlobs = blobs.filter((b) => b.path.endsWith("/report.json"));
  if (reportBlobs.length === 0) return null;
  reportBlobs.sort((a, b) => b.path.localeCompare(a.path));
  const result = await downloadBlob(container, reportBlobs[0].path);
  if (!result) return null;
  try {
    return JSON.parse(result.buffer.toString("utf-8")) as InvestmentReport;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF Generation
// ─────────────────────────────────────────────────────────────────────────────

export async function generateReportPDF(report: InvestmentReport): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  const margin = 50;
  let y = 750;
  const lineHeight = 14;

  function drawSection(title: string, content: string) {
    y -= 8;
    page.drawText(title, { x: margin, y, size: 12, font: boldFont, color: rgb(0.2, 0.2, 0.5) });
    y -= lineHeight;
    const words = content.split(/\s+/);
    let line = "";
    for (const word of words) {
      if ((line + " " + word).length > 80) {
        if (line) {
          page.drawText(line, { x: margin, y, size: 10, font, color: rgb(0, 0, 0) });
          y -= lineHeight;
        }
        line = word;
      } else {
        line = line ? line + " " + word : word;
      }
    }
    if (line) {
      page.drawText(line, { x: margin, y, size: 10, font, color: rgb(0, 0, 0) });
      y -= lineHeight;
    }
    y -= 4;
  }

  // Title
  page.drawText(report.title, { x: margin, y, size: 18, font: boldFont, color: rgb(0.1, 0.1, 0.3) });
  y -= 24;

  page.drawText(`Proposal: ${report.proposalId}`, { x: margin, y, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
  y -= lineHeight;
  page.drawText(`Generated: ${new Date(report.generatedAt).toLocaleString()}`, { x: margin, y, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
  y -= lineHeight;
  page.drawText(`Score: ${report.score ?? "—"}/100  |  Confidence: ${report.confidence}  |  Decision: ${report.decision}`, {
    x: margin,
    y,
    size: 10,
    font: boldFont,
    color: rgb(0.2, 0.2, 0.5),
  });
  y -= 24;

  drawSection("Executive Summary", report.summary);
  drawSection("Investment Thesis", report.investmentThesis);
  drawSection("Validation Summary", report.validationSummary);
  drawSection("Fund Fit Summary", report.fitSummary);
  drawSection("Key Strengths", report.strengths.length > 0 ? report.strengths.map((s, i) => `${i + 1}. ${s}`).join(" ") : "None identified.");
  drawSection("Key Risks", report.risks.length > 0 ? report.risks.map((r, i) => `${i + 1}. ${r}`).join(" ") : "None identified.");
  drawSection("Recommendations", report.recommendations.length > 0 ? report.recommendations.map((r, i) => `${i + 1}. ${r}`).join(" ") : "None.");
  drawSection("Suggested Decision", report.decision);

  if (report.warnings && report.warnings.length > 0) {
    y -= 8;
    page.drawText("Warnings", { x: margin, y, size: 11, font: boldFont, color: rgb(0.6, 0.4, 0) });
    y -= lineHeight;
    report.warnings.forEach((w) => {
      page.drawText(`• ${w}`, { x: margin + 10, y, size: 9, font, color: rgb(0.5, 0.4, 0) });
      y -= lineHeight;
    });
  }

  return doc.save();
}
