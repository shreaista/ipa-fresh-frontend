import "server-only";

// NEW: Proposal Evaluation Engine - LLM Implementation
//
// This module provides:
// - Evaluation storage helpers (upload, list, download)
// - LLM-based evaluation using OpenAI
// - Fallback to stub evaluation if OpenAI is not configured
//
// Blob paths:
// - Evaluations: tenants/{tenantId}/proposals/{proposalId}/evaluations/{timestamp}/evaluation.json

import {
  uploadBlob,
  listBlobs,
  downloadBlob,
  getDefaultContainer,
  parseTimestampFromPath,
} from "@/lib/storage/azureBlob";
import { listProposalDocuments } from "@/lib/storage/proposalDocuments";
import { listFundMandates, type FundMandateBlob } from "@/lib/storage/azure";
import {
  runEvaluationWithProvider,
  isLLMConfigured,
  getLLMProvider,
  type RAGInput,
} from "@/lib/llm/openaiClient";
import {
  extractContentForEvaluation,
  type BlobInfo,
} from "./textExtraction";
import { buildRAGEvaluationInput } from "./textChunking";
import { type EvaluationReport } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Re-export Types
// ─────────────────────────────────────────────────────────────────────────────

export type { EvaluationReport } from "./types";

export interface EvaluationMetadata {
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
  timestamp: string;
}

export interface RunEvaluationParams {
  tenantId: string;
  proposalId: string;
  fundName: string;
  mandateKey: string | null;
  evaluatedByUserId: string;
  evaluatedByEmail: string;
}

export interface RunEvaluationResult {
  report: EvaluationReport;
  blobPath: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Path Utilities
// ─────────────────────────────────────────────────────────────────────────────

function buildEvaluationPath(tenantId: string, proposalId: string, evaluationId: string): string {
  return `tenants/${tenantId}/proposals/${proposalId}/evaluations/${evaluationId}/evaluation.json`;
}

// Generate a unique evaluation ID using timestamp format: YYYYMMDDTHHmmssZ
function generateEvaluationId(): string {
  return new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";
}

function getEvaluationsPrefix(tenantId: string, proposalId: string): string {
  return `tenants/${tenantId}/proposals/${proposalId}/evaluations/`;
}

function extractTimestampFromPath(blobPath: string): string {
  const match = blobPath.match(/evaluations\/(\d{8}T\d{6}Z)\//);
  return match ? match[1] : "";
}

export function validateEvaluationBlobPath(
  blobPath: string,
  tenantId: string,
  proposalId: string
): boolean {
  const expectedPrefix = `tenants/${tenantId}/proposals/${proposalId}/evaluations/`;
  return blobPath.startsWith(expectedPrefix) && blobPath.endsWith("/evaluation.json");
}

// ─────────────────────────────────────────────────────────────────────────────
// Evaluation Storage Helpers
// ─────────────────────────────────────────────────────────────────────────────

export async function uploadEvaluationJson(
  tenantId: string,
  proposalId: string,
  report: EvaluationReport
): Promise<string> {
  const container = getDefaultContainer();
  // Use the evaluationId from the report to ensure folder name matches report ID
  const blobPath = buildEvaluationPath(tenantId, proposalId, report.evaluationId);

  console.log(`[proposalEvaluator] Saving evaluation to: ${blobPath}`);

  const jsonContent = JSON.stringify(report, null, 2);
  const buffer = Buffer.from(jsonContent, "utf-8");

  const result = await uploadBlob({
    container,
    path: blobPath,
    contentType: "application/json",
    buffer,
  });

  console.log(`[proposalEvaluator] Evaluation saved: ${blobPath} (${result.sizeBytes} bytes)`);

  return blobPath;
}

function safeParseEvaluationDate(dateStr: string | undefined | null): number {
  if (!dateStr) return 0;
  const parsed = new Date(dateStr).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

export async function listEvaluations(
  tenantId: string,
  proposalId: string,
  loadFullData: boolean = false
): Promise<EvaluationMetadata[]> {
  const container = getDefaultContainer();
  const prefix = getEvaluationsPrefix(tenantId, proposalId);

  const blobs = await listBlobs({ container, prefix });

  const evaluations: EvaluationMetadata[] = [];

  for (const blob of blobs) {
    if (!blob.path.endsWith("/evaluation.json")) continue;

    const extractedId = extractTimestampFromPath(blob.path);
    const parsedDate = parseTimestampFromPath(blob.path);

    const metadata: EvaluationMetadata = {
      blobPath: blob.path,
      evaluationId: extractedId || "",
      evaluatedAt: parsedDate?.toISOString() || blob.lastModified || "",
      fitScore: null,
      timestamp: extractedId || "",
    };

    if (loadFullData) {
      try {
        const result = await downloadBlob(container, blob.path);
        if (result) {
          const report = JSON.parse(result.buffer.toString("utf-8")) as EvaluationReport;
          if (report && typeof report === "object") {
            if (report.evaluationId) {
              metadata.evaluationId = report.evaluationId;
            }
            if (typeof report.fitScore === "number" || report.fitScore === null) {
              metadata.fitScore = report.fitScore;
            }
            if (report.confidence) {
              metadata.confidence = report.confidence;
            }
            if (report.model) {
              metadata.model = report.model;
            }
            if (report.engineType) {
              metadata.engineType = report.engineType;
            }
            if (report.evaluatedAt) {
              metadata.evaluatedAt = report.evaluatedAt;
            }
            if (report.inputs && typeof report.inputs === "object") {
              metadata.inputs = {
                proposalDocuments: typeof report.inputs.proposalDocuments === "number"
                  ? report.inputs.proposalDocuments
                  : 0,
                mandateTemplates: typeof report.inputs.mandateTemplates === "number"
                  ? report.inputs.mandateTemplates
                  : 0,
              };
            }
          }
        }
      } catch (parseError) {
        console.warn(
          `[proposalEvaluator] Skipping malformed evaluation blob: ${blob.path}`,
          parseError
        );
      }
    }

    evaluations.push(metadata);
  }

  evaluations.sort((a, b) => {
    const dateA = safeParseEvaluationDate(a.evaluatedAt);
    const dateB = safeParseEvaluationDate(b.evaluatedAt);
    if (dateA === 0 && dateB === 0) return 0;
    if (dateA === 0) return 1;
    if (dateB === 0) return -1;
    return dateB - dateA;
  });

  return evaluations;
}

export async function downloadEvaluation(
  tenantId: string,
  proposalId: string,
  blobPath: string
): Promise<EvaluationReport | null> {
  if (!validateEvaluationBlobPath(blobPath, tenantId, proposalId)) {
    return null;
  }

  const container = getDefaultContainer();
  const result = await downloadBlob(container, blobPath);

  if (!result) {
    return null;
  }

  try {
    const jsonContent = result.buffer.toString("utf-8");
    return JSON.parse(jsonContent) as EvaluationReport;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Stub Evaluation (Fallback when OpenAI not configured)
// ─────────────────────────────────────────────────────────────────────────────

// Generate stub evaluation when LLM is not available
function generateStubEvaluation(
  proposalDocCount: number,
  mandateTemplateCount: number,
  mandateKey: string | null
): {
  fitScore: number | null;
  mandateSummary: string;
  proposalSummary: string;
  strengths: string[];
  risks: string[];
  recommendations: string[];
  confidence: "low" | "medium" | "high";
  extractionWarnings: string[];
} {
  // If no documents AND no templates, score is not meaningful
  if (proposalDocCount === 0 && mandateTemplateCount === 0) {
    return {
      fitScore: null,
      mandateSummary: "No fund mandate template available for evaluation.",
      proposalSummary: "No proposal documents uploaded yet.",
      strengths: [],
      risks: ["No proposal documents uploaded", "No mandate templates available"],
      recommendations: [
        "Upload proposal documents before running evaluation",
        "Ensure fund mandate templates are configured",
      ],
      confidence: "low",
      extractionWarnings: ["No proposal docs or mandate templates - score not computed (stub)"],
    };
  }

  let fitScore: number = 70;
  if (proposalDocCount >= 2) fitScore += 10;
  if (mandateTemplateCount >= 1) fitScore += 5;
  fitScore = Math.min(fitScore, 95);

  return {
    fitScore,
    mandateSummary: mandateKey
      ? `Fund mandate "${mandateKey}" defines investment criteria. ${mandateTemplateCount} template(s) available.`
      : "No fund mandate template associated with this proposal's fund.",
    proposalSummary: `Proposal contains ${proposalDocCount} document(s) reviewed against mandate criteria.`,
    strengths: [
      "Proposal documentation is complete and well-organized",
      proposalDocCount >= 2 ? "Multiple supporting documents provided" : "Core proposal document submitted",
      mandateTemplateCount >= 1 ? "Clear mandate template available" : "Evaluation performed without mandate constraints",
    ],
    risks: [
      proposalDocCount < 2 ? "Limited documentation may require additional information" : "Standard documentation risk profile",
      mandateTemplateCount === 0 ? "No formal mandate template to validate against" : "Mandate compliance should be verified in detail",
    ],
    recommendations: [
      "Proceed with detailed due diligence review",
      proposalDocCount < 2 ? "Request additional supporting documentation" : "Documentation is sufficient for initial review",
      "Schedule follow-up meeting with applicant if needed",
    ],
    confidence: "low",
    extractionWarnings: [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Evaluation Function
// ─────────────────────────────────────────────────────────────────────────────

export async function runEvaluation(
  params: RunEvaluationParams
): Promise<RunEvaluationResult> {
  const { tenantId, proposalId, fundName, mandateKey, evaluatedByUserId, evaluatedByEmail } = params;

  // NEW: Gather document metadata
  const proposalDocsResult = await listProposalDocuments(tenantId, proposalId);
  const proposalDocs = proposalDocsResult.flat.filter(
    (doc) => !doc.blobPath.includes("/evaluations/")
  );

  let mandateTemplates: FundMandateBlob[] = [];
  if (mandateKey) {
    console.log(`[proposalEvaluator] Loading mandate templates for key: ${mandateKey}`);
    try {
      mandateTemplates = await listFundMandates({ tenantId, mandateKey });
      console.log(
        `[proposalEvaluator] Found ${mandateTemplates.length} mandate template(s) for ${mandateKey}`
      );
      for (const t of mandateTemplates) {
        console.log(`[proposalEvaluator]   - ${t.name} (${t.contentType}, ${t.size} bytes)`);
      }
    } catch (error) {
      console.error("[proposalEvaluator] Error listing mandate templates:", error);
    }
  } else {
    console.log("[proposalEvaluator] No mandateKey provided, skipping mandate template loading");
  }

  // Generate unique evaluation ID - this will be used as folder name and in report
  const evaluationId = generateEvaluationId();
  let report: EvaluationReport;

  // Check if any LLM provider is configured (Azure OpenAI or standard OpenAI)
  if (isLLMConfigured()) {
    const provider = getLLMProvider();
    console.log(`[proposalEvaluator] Using LLM provider: ${provider}`);

    // Extract text content from documents (include uploadedAt for prioritization)
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

    const extractedContent = await extractContentForEvaluation(mandateBlobs, proposalBlobs);

    // Build RAG evaluation input using text chunking and relevance matching
    const ragEvalInput = buildRAGEvaluationInput(
      extractedContent.proposalText,
      extractedContent.mandateText
    );

    // Convert to RAGInput format for LLM
    const ragInput: RAGInput = {
      proposalSummary: ragEvalInput.proposalSummary,
      topMandateSections: ragEvalInput.topMandateSections,
      matchedPairs: ragEvalInput.matchedPairs.map((pair) => ({
        proposalExcerpt: pair.proposalExcerpt,
        mandateExcerpt: pair.mandateExcerpt,
        score: pair.score,
      })),
    };

    // Run LLM evaluation with RAG input (routes to Azure OpenAI or standard OpenAI)
    const llmResult = await runEvaluationWithProvider({
      mandateText: extractedContent.mandateText,
      proposalText: extractedContent.proposalText,
      context: {
        proposalId,
        fundName,
        mandateKey,
      },
      ragInput: ragEvalInput.topMandateSections.length > 0 ? ragInput : undefined,
    });

    if (llmResult.success && llmResult.response) {
      // Build report from LLM response
      // engineType is "azure-openai" when using Azure, "llm" for standard OpenAI
      const engineType = llmResult.provider === "azure-openai" ? "azure-openai" : "llm";

      report = {
        evaluationId,
        proposalId,
        tenantId,
        evaluatedAt: new Date().toISOString(),
        evaluatedByUserId,
        evaluatedByEmail,

        inputs: {
          proposalDocuments: proposalDocs.length,
          mandateTemplates: mandateTemplates.length,
          mandateKey,
          totalCharactersProcessed: extractedContent.totalCharacters,
          extractionWarnings: extractedContent.extractionWarnings,
          // Document processing stats
          processedDocumentsCount: extractedContent.documentStats.processedDocumentsCount,
          truncatedDocumentsCount: extractedContent.documentStats.truncatedDocumentsCount,
          skippedDocumentsCount: extractedContent.documentStats.skippedDocumentsCount,
          // RAG matching metadata
          matchedSectionsCount: ragEvalInput.matchedSectionsCount,
          topMandateSectionsPreview: ragEvalInput.topMandateSectionsPreview,
        },

        fitScore: llmResult.response.fitScore,
        mandateSummary: llmResult.response.mandateSummary,
        proposalSummary: llmResult.response.proposalSummary,
        strengths: llmResult.response.strengths,
        risks: llmResult.response.risks,
        recommendations: llmResult.response.recommendations,
        confidence: llmResult.response.confidence,

        model: llmResult.model,
        version: "2.0.0",
        engineType,
      };
    } else {
      // LLM failed, fall back to stub with error info in extractionWarnings
      console.error("[proposalEvaluator] LLM evaluation failed:", llmResult.error);
      
      const stubResult = generateStubEvaluation(
        proposalDocs.length,
        mandateTemplates.length,
        mandateKey
      );

      report = {
        evaluationId,
        proposalId,
        tenantId,
        evaluatedAt: new Date().toISOString(),
        evaluatedByUserId,
        evaluatedByEmail,

        inputs: {
          proposalDocuments: proposalDocs.length,
          mandateTemplates: mandateTemplates.length,
          mandateKey,
          totalCharactersProcessed: extractedContent.totalCharacters,
          extractionWarnings: [
            ...extractedContent.extractionWarnings,
            ...stubResult.extractionWarnings,
            llmResult.provider === "azure-openai"
              ? `Azure OpenAI call failed: ${llmResult.error}`
              : `OpenAI call failed: ${llmResult.error}`,
          ],
          // Document processing stats
          processedDocumentsCount: extractedContent.documentStats.processedDocumentsCount,
          truncatedDocumentsCount: extractedContent.documentStats.truncatedDocumentsCount,
          skippedDocumentsCount: extractedContent.documentStats.skippedDocumentsCount,
          // RAG matching metadata (even on fallback)
          matchedSectionsCount: ragEvalInput.matchedSectionsCount,
          topMandateSectionsPreview: ragEvalInput.topMandateSectionsPreview,
        },

        fitScore: stubResult.fitScore,
        mandateSummary: stubResult.mandateSummary,
        proposalSummary: stubResult.proposalSummary,
        strengths: stubResult.strengths,
        risks: stubResult.risks,
        recommendations: stubResult.recommendations,
        confidence: stubResult.confidence,

        model: "stub-fallback",
        version: "2.0.0",
        engineType: "stub",
      };
    }
  } else {
    // No LLM provider configured, use stub
    console.warn("[proposalEvaluator] No LLM provider configured, using stub evaluation");

    const stubResult = generateStubEvaluation(
      proposalDocs.length,
      mandateTemplates.length,
      mandateKey
    );

    report = {
      evaluationId,
      proposalId,
      tenantId,
      evaluatedAt: new Date().toISOString(),
      evaluatedByUserId,
      evaluatedByEmail,

      inputs: {
        proposalDocuments: proposalDocs.length,
        mandateTemplates: mandateTemplates.length,
        mandateKey,
        totalCharactersProcessed: 0,
        extractionWarnings: [
          ...stubResult.extractionWarnings,
          "No LLM provider configured (set AZURE_OPENAI_* or OPENAI_API_KEY) - using stub evaluation",
        ],
        // Document processing stats (stub has no documents to process)
        processedDocumentsCount: 0,
        truncatedDocumentsCount: 0,
        skippedDocumentsCount: 0,
      },

      fitScore: stubResult.fitScore,
      mandateSummary: stubResult.mandateSummary,
      proposalSummary: stubResult.proposalSummary,
      strengths: stubResult.strengths,
      risks: stubResult.risks,
      recommendations: stubResult.recommendations,
      confidence: stubResult.confidence,

      model: "stub",
      version: "2.0.0",
      engineType: "stub",
    };
  }

  // NEW: Save evaluation to blob storage
  const blobPath = await uploadEvaluationJson(tenantId, proposalId, report);

  return {
    report,
    blobPath,
  };
}
