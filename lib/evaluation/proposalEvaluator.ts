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
import { listFundMandateBlobsByFundId } from "@/lib/storage/azureBlob";
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
import { runProposalValidation } from "./proposalValidation";
import { buildRAGEvaluationInput } from "./textChunking";
import { type EvaluationReport } from "./types";
import {
  parseScoringInput,
  computeScoringSafe,
  createFallbackScoring,
  type ScoringResult,
} from "./scoringModel";

// ─────────────────────────────────────────────────────────────────────────────
// Re-export Types
// ─────────────────────────────────────────────────────────────────────────────

export type { EvaluationReport } from "./types";

export interface EvaluationMetadata {
  blobPath: string;
  evaluationId: string;
  evaluatedAt: string;
  fitScore: number | null;
  validationScore?: number;
  confidence?: "low" | "medium" | "high";
  model?: string;
  engineType?: "stub" | "llm" | "azure-openai";
  inputs?: {
    proposalDocuments: number;
    mandateTemplates: number;
  };
  risks?: string[];
  timestamp: string;
}

export interface RunEvaluationParams {
  tenantId: string;
  proposalId: string;
  fundName: string;
  fundId: string | null;
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
            if (report.validationSummary && typeof report.validationSummary.validationScore === "number") {
              metadata.validationScore = report.validationSummary.validationScore;
            }
            if (report.risks && Array.isArray(report.risks)) {
              metadata.risks = report.risks;
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
  const { tenantId, proposalId, fundName, fundId, evaluatedByUserId, evaluatedByEmail } = params;
  let { mandateKey } = params;

  console.log(`[proposalEvaluator] Starting evaluation for proposal ${proposalId}`);
  console.log(`[proposalEvaluator] tenantId=${tenantId}, fundName=${fundName}, fundId=${fundId || "(none)"}, mandateKey=${mandateKey || "(none)"}`);

  // Gather document metadata
  const proposalDocsResult = await listProposalDocuments(tenantId, proposalId);
  const proposalDocs = proposalDocsResult.flat.filter(
    (doc) => !doc.blobPath.includes("/evaluations/")
  );

  // Load mandate templates: prefer fundId-based storage, fallback to mandateKey
  let mandateTemplates: FundMandateBlob[] = [];
  let mandateLoadFallbackReason: string | null = null;

  // Step 1: Try fundId-based storage (tenants/{tenantId}/funds/{fundId}/mandates/)
  if (fundId) {
    console.log(`[proposalEvaluator] Loading mandate templates for fundId: ${fundId}`);
    try {
      const blobs = await listFundMandateBlobsByFundId(tenantId, fundId);
      mandateTemplates = blobs.map((b) => ({
        name: b.name,
        mandateKey: b.fundId,
        uploadedAt: b.uploadedAt,
        blobName: b.blobPath,
        size: b.size,
        contentType: b.contentType,
      }));
      if (mandateTemplates.length > 0) {
        console.log(
          `[proposalEvaluator] Found ${mandateTemplates.length} template(s) for fundId: ${fundId}`
        );
        for (const t of mandateTemplates) {
          console.log(`[proposalEvaluator]   - ${t.name} (${t.contentType}, ${t.size} bytes, blobPath: ${t.blobName})`);
        }
      } else {
        mandateLoadFallbackReason = `No mandate files uploaded for this fund`;
      }
    } catch (error) {
      console.error("[proposalEvaluator] Error listing mandate templates for fundId:", fundId, error);
      mandateLoadFallbackReason = `Error loading mandate files for fund: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  }

  // Step 2: Fallback to mandateKey-based storage (backward compatibility)
  if (mandateTemplates.length === 0 && mandateKey) {
    console.log(`[proposalEvaluator] Fallback: loading mandate templates for mandateKey: ${mandateKey}`);
    try {
      mandateTemplates = await listFundMandates({ tenantId, mandateKey });
      if (mandateTemplates.length > 0) {
        console.log(`[proposalEvaluator] Found ${mandateTemplates.length} template(s) for mandateKey: ${mandateKey}`);
      }
    } catch (error) {
      console.error("[proposalEvaluator] Error listing mandate templates for mandateKey:", mandateKey, error);
    }
  }

  // Step 3: Fallback - list all mandate templates for tenant (POC-friendly)
  if (mandateTemplates.length === 0) {
    console.log("[proposalEvaluator] Fallback: listing all mandate templates for tenant...");
    try {
      const allMandates = await listFundMandates({ tenantId });
      if (allMandates.length > 0) {
        const firstMandateKey = allMandates[0].mandateKey;
        mandateTemplates = allMandates.filter((m) => m.mandateKey === firstMandateKey);
        if (!mandateKey && firstMandateKey) {
          mandateKey = firstMandateKey;
        }
        console.log(`[proposalEvaluator] Fallback: found ${mandateTemplates.length} template(s)`);
      } else {
        mandateLoadFallbackReason = mandateLoadFallbackReason || "No mandate templates uploaded for this tenant";
      }
    } catch (error) {
      console.error("[proposalEvaluator] Error listing all mandate templates:", error);
      mandateLoadFallbackReason = mandateLoadFallbackReason || `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  }

  // Log final mandate loading result
  if (mandateTemplates.length > 0) {
    const totalSize = mandateTemplates.reduce((sum, t) => sum + t.size, 0);
    console.log(
      `[proposalEvaluator] Mandate template loading complete: ${mandateTemplates.length} template(s), ${totalSize} bytes total`
    );
  } else {
    console.log(
      `[proposalEvaluator] Mandate template loading complete: 0 templates. Fallback reason: ${mandateLoadFallbackReason || "Unknown"}`
    );
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

    // Step: Validate Proposal (runs before fund evaluation)
    console.log("[proposalEvaluator] Proposal validation started");
    const validationSummary = await runProposalValidation(extractedContent.proposalText);
    console.log(
      `[proposalEvaluator] Validation complete: score=${validationSummary.validationScore}, confidence=${validationSummary.confidence}, findings=${validationSummary.findings.length}`
    );

    // Log extraction results summary
    console.log(`[proposalEvaluator] Extraction complete - mandate: ${extractedContent.mandateText.length} chars, proposal: ${extractedContent.proposalText.length} chars`);
    
    // Add mandate load fallback reason to warnings if we didn't get any mandate text
    if (mandateLoadFallbackReason && extractedContent.mandateText.length === 0) {
      extractedContent.extractionWarnings.push(mandateLoadFallbackReason);
    }

    // Fund evaluation (mandate comparison)
    console.log("[proposalEvaluator] Fund evaluation started");
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

      // Parse scoring input from LLM response; infer from evaluation content if LLM did not provide it
      const scoringInput = parseScoringInput(llmResult.response.scoringInput);
      const evaluationContent = {
        proposalSummary: llmResult.response.proposalSummary,
        mandateSummary: llmResult.response.mandateSummary,
        strengths: llmResult.response.strengths,
        risks: llmResult.response.risks,
        recommendations: llmResult.response.recommendations,
      };
      const scoringResult: ScoringResult = computeScoringSafe(
        scoringInput,
        llmResult.response.fitScore,
        evaluationContent
      );

      // Use structured final score if structured scoring succeeded, otherwise use LLM score
      const finalScore = scoringResult.scoringMethod === "structured"
        ? scoringResult.finalScore
        : llmResult.response.fitScore;

      console.log(
        `[proposalEvaluator] Scoring complete: method=${scoringResult.scoringMethod}, finalScore=${finalScore}`
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
          extractionWarnings: extractedContent.extractionWarnings,
          // Document processing stats
          processedDocumentsCount: extractedContent.documentStats.processedDocumentsCount,
          truncatedDocumentsCount: extractedContent.documentStats.truncatedDocumentsCount,
          skippedDocumentsCount: extractedContent.documentStats.skippedDocumentsCount,
          // Chunk-based processing stats
          proposalChunksUsed: extractedContent.proposalChunksUsed,
          mandateChunksUsed: extractedContent.mandateChunksUsed,
          // Relevance matching metadata
          matchedPairsCount: extractedContent.matchedPairsCount,
          relevanceMethod: extractedContent.relevanceMethod,
          // RAG matching metadata
          matchedSectionsCount: ragEvalInput.matchedSectionsCount,
          topMandateSectionsPreview: ragEvalInput.topMandateSectionsPreview,
        },

        fitScore: finalScore,
        mandateSummary: llmResult.response.mandateSummary,
        proposalSummary: llmResult.response.proposalSummary,
        strengths: llmResult.response.strengths,
        risks: llmResult.response.risks,
        recommendations: llmResult.response.recommendations,
        confidence: llmResult.response.confidence,

        // Structured scoring
        structuredScores: scoringResult.structuredScores,
        scoringMethod: scoringResult.scoringMethod,

        model: llmResult.model,
        version: "2.0.0",
        engineType,

        validationSummary: {
          validationScore: validationSummary.validationScore,
          confidence: validationSummary.confidence,
          summary: validationSummary.summary,
          step: validationSummary.step,
          checks: validationSummary.checks,
          findings: validationSummary.findings,
          heuristic: {
            signals: validationSummary.heuristic.signals,
            heuristicScoreAfterPenalties: validationSummary.heuristic.heuristicScoreAfterPenalties,
            penalties: validationSummary.heuristic.penalties,
          },
          llm: validationSummary.llm
            ? {
                stage: validationSummary.llm.stage,
                businessModelClarity: validationSummary.llm.businessModelClarity,
                competitorPresence: validationSummary.llm.competitorPresence,
              }
            : undefined,
          warnings: validationSummary.warnings,
        },
      };
    } else {
      // LLM failed, fall back to stub with error info in extractionWarnings
      console.error("[proposalEvaluator] LLM evaluation failed:", llmResult.error);
      
      const stubResult = generateStubEvaluation(
        proposalDocs.length,
        mandateTemplates.length,
        mandateKey
      );

      // Build extraction warnings
      const llmFailedWarnings: string[] = [...extractedContent.extractionWarnings, ...stubResult.extractionWarnings];
      if (mandateLoadFallbackReason && extractedContent.mandateText.length === 0) {
        llmFailedWarnings.push(mandateLoadFallbackReason);
      }
      llmFailedWarnings.push(
        llmResult.provider === "azure-openai"
          ? `Azure OpenAI call failed: ${llmResult.error}`
          : `OpenAI call failed: ${llmResult.error}`
      );

      // Create fallback scoring from stub fit score
      const fallbackScoring = stubResult.fitScore !== null
        ? createFallbackScoring(stubResult.fitScore)
        : createFallbackScoring(50); // Default mid-range score for null

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
          extractionWarnings: llmFailedWarnings,
          // Document processing stats
          processedDocumentsCount: extractedContent.documentStats.processedDocumentsCount,
          truncatedDocumentsCount: extractedContent.documentStats.truncatedDocumentsCount,
          skippedDocumentsCount: extractedContent.documentStats.skippedDocumentsCount,
          // Chunk-based processing stats
          proposalChunksUsed: extractedContent.proposalChunksUsed,
          mandateChunksUsed: extractedContent.mandateChunksUsed,
          // Relevance matching metadata (even on fallback)
          matchedPairsCount: extractedContent.matchedPairsCount,
          relevanceMethod: extractedContent.relevanceMethod,
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

        // Structured scoring (fallback)
        structuredScores: fallbackScoring.structuredScores,
        scoringMethod: fallbackScoring.scoringMethod,

        model: "stub-fallback",
        version: "2.0.0",
        engineType: "stub",

        validationSummary: {
          validationScore: validationSummary.validationScore,
          confidence: validationSummary.confidence,
          summary: validationSummary.summary,
          step: validationSummary.step,
          checks: validationSummary.checks,
          findings: validationSummary.findings,
          heuristic: {
            signals: validationSummary.heuristic.signals,
            heuristicScoreAfterPenalties: validationSummary.heuristic.heuristicScoreAfterPenalties,
            penalties: validationSummary.heuristic.penalties,
          },
          llm: validationSummary.llm
            ? {
                stage: validationSummary.llm.stage,
                businessModelClarity: validationSummary.llm.businessModelClarity,
                competitorPresence: validationSummary.llm.competitorPresence,
              }
            : undefined,
          warnings: validationSummary.warnings,
        },
      };
    }
  } else {
    // No LLM provider configured, use stub
    console.warn("[proposalEvaluator] No LLM provider configured, using stub evaluation");

    // Still run proposal validation (heuristic-only when no LLM)
    let validationSummary: Awaited<ReturnType<typeof runProposalValidation>>;
    if (proposalDocs.length > 0) {
      const proposalBlobsForValidation: BlobInfo[] = proposalDocs.map((d) => ({
        blobPath: d.blobPath,
        contentType: d.contentType,
        filename: d.filename,
        uploadedAt: d.uploadedAt,
      }));
      const { extractContentForEvaluation: extractForValidation } = await import(
        "./textExtraction"
      );
      const extracted = await extractForValidation([], proposalBlobsForValidation);
      validationSummary = await runProposalValidation(extracted.proposalText);
    } else {
      validationSummary = await runProposalValidation("");
    }

    const stubResult = generateStubEvaluation(
      proposalDocs.length,
      mandateTemplates.length,
      mandateKey
    );

    // Build extraction warnings including mandate load issues
    const stubExtractionWarnings: string[] = [...stubResult.extractionWarnings];
    if (mandateLoadFallbackReason && mandateTemplates.length === 0) {
      stubExtractionWarnings.push(mandateLoadFallbackReason);
    }
    stubExtractionWarnings.push("No LLM provider configured (set AZURE_OPENAI_* or OPENAI_API_KEY) - using stub evaluation");

    // Create fallback scoring from stub fit score
    const fallbackScoring = stubResult.fitScore !== null
      ? createFallbackScoring(stubResult.fitScore)
      : createFallbackScoring(50); // Default mid-range score for null

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
        extractionWarnings: stubExtractionWarnings,
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

      // Structured scoring (fallback)
      structuredScores: fallbackScoring.structuredScores,
      scoringMethod: fallbackScoring.scoringMethod,

      model: "stub",
      version: "2.0.0",
      engineType: "stub",

      validationSummary: {
        validationScore: validationSummary.validationScore,
        confidence: validationSummary.confidence,
        summary: validationSummary.summary,
        step: validationSummary.step,
        checks: validationSummary.checks,
        findings: validationSummary.findings,
        heuristic: {
          signals: validationSummary.heuristic.signals,
          heuristicScoreAfterPenalties: validationSummary.heuristic.heuristicScoreAfterPenalties,
          penalties: validationSummary.heuristic.penalties,
        },
        llm: validationSummary.llm
          ? {
              stage: validationSummary.llm.stage,
              businessModelClarity: validationSummary.llm.businessModelClarity,
              competitorPresence: validationSummary.llm.competitorPresence,
            }
          : undefined,
        warnings: validationSummary.warnings,
      },
    };
  }

  console.log("[proposalEvaluator] Fund evaluation complete, saving report");
  // NEW: Save evaluation to blob storage
  const blobPath = await uploadEvaluationJson(tenantId, proposalId, report);

  return {
    report,
    blobPath,
  };
}
