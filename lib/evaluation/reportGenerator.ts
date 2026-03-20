import "server-only";

// Report Generator - Standalone AI report from proposal + mandate text
//
// Combines proposal extracted text and fund mandate text, calls OpenAI to generate
// summary, strengths, risks, recommendation, and score. Stores result and generates PDF.

import {
  uploadBlob,
  listBlobs,
  downloadBlob,
  getDefaultContainer,
} from "@/lib/storage/azureBlob";
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
import { generateMemoPDF, uploadMemoPDF, type MemoInput } from "./memoGenerator";
import type { EvaluationReport } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface GeneratedReport {
  reportId: string;
  blobPath: string;
  report: EvaluationReport;
  memoBlobPath: string;
  memoId: string;
  generatedAt: string;
}

export interface GenerateReportParams {
  tenantId: string;
  proposalId: string;
  proposalName?: string;
  applicant?: string;
  fundName?: string;
  fundId: string | null;
  amount?: number;
  generatedByUserId: string;
  generatedByEmail: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Path Utilities
// ─────────────────────────────────────────────────────────────────────────────

function generateReportId(): string {
  return new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";
}

function buildReportPath(tenantId: string, proposalId: string, reportId: string): string {
  return `tenants/${tenantId}/proposals/${proposalId}/reports/${reportId}/report.json`;
}

function getReportsPrefix(tenantId: string, proposalId: string): string {
  return `tenants/${tenantId}/proposals/${proposalId}/reports/`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Report Generation
// ─────────────────────────────────────────────────────────────────────────────

export async function generateReport(params: GenerateReportParams): Promise<GeneratedReport> {
  const {
    tenantId,
    proposalId,
    proposalName,
    applicant,
    fundName,
    fundId,
    amount,
    generatedByUserId,
    generatedByEmail,
  } = params;

  const reportId = generateReportId();

  // Import storage helpers for loading docs and mandates
  const { listProposalDocuments } = await import("@/lib/storage/proposalDocuments");
  const { listFundMandates } = await import("@/lib/storage/azure");
  const { listFundMandateBlobsByFundId } = await import("@/lib/storage/azureBlob");

  // Load proposal documents
  const proposalDocsResult = await listProposalDocuments(tenantId, proposalId);
  const proposalDocs = proposalDocsResult.flat.filter(
    (doc) => !doc.blobPath.includes("/evaluations/")
  );

  if (proposalDocs.length === 0) {
    throw new Error("No proposal documents found. Upload documents first.");
  }

  // Load mandate templates (same logic as proposalEvaluator)
  let mandateTemplates: Array<{
    name: string;
    mandateKey: string;
    uploadedAt: string;
    blobName: string;
    size: number;
    contentType: string;
  }> = [];

  if (fundId) {
    try {
      const blobs = await listFundMandateBlobsByFundId(tenantId, fundId);
      mandateTemplates = blobs.map((b) => ({
        name: b.name,
        mandateKey: b.fundId,
        uploadedAt: b.uploadedAt,
        blobName: b.blobPath,
        size: b.size,
        contentType: b.contentType || "application/octet-stream",
      }));
    } catch (error) {
      console.error("[reportGenerator] Error loading mandate for fundId:", fundId, error);
    }
  }

  if (mandateTemplates.length === 0) {
    try {
      const allMandates = await listFundMandates({ tenantId });
      if (allMandates.length > 0) {
        const firstKey = allMandates[0].mandateKey;
        mandateTemplates = allMandates
          .filter((m) => m.mandateKey === firstKey)
          .map((m) => ({
            name: m.name,
            mandateKey: m.mandateKey,
            uploadedAt: m.uploadedAt,
            blobName: m.blobName,
            size: m.size,
            contentType: m.contentType,
          }));
      }
    } catch {
      // ignore
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

  const extractedContent = await extractContentForEvaluation(mandateBlobs, proposalBlobs);

  if (extractedContent.proposalText.length === 0) {
    throw new Error("Could not extract text from proposal documents.");
  }

  let report: EvaluationReport;

  if (isLLMConfigured()) {
    const provider = getLLMProvider();
    console.log("[reportGenerator] Using LLM provider:", provider);

    const ragEvalInput = buildRAGEvaluationInput(
      extractedContent.proposalText,
      extractedContent.mandateText
    );

    const ragInput: RAGInput = {
      proposalSummary: ragEvalInput.proposalSummary,
      topMandateSections: ragEvalInput.topMandateSections,
      matchedPairs: ragEvalInput.matchedPairs.map((pair) => ({
        proposalExcerpt: pair.proposalExcerpt,
        mandateExcerpt: pair.mandateExcerpt,
        score: pair.score,
      })),
    };

    const llmResult = await runEvaluationWithProvider({
      mandateText: extractedContent.mandateText,
      proposalText: extractedContent.proposalText,
      context: {
        proposalId,
        fundName: fundName || "Unknown",
        mandateKey: fundId || null,
      },
      ragInput: ragEvalInput.topMandateSections.length > 0 ? ragInput : undefined,
    });

    if (!llmResult.success || !llmResult.response) {
      throw new Error(llmResult.error || "Failed to generate report from AI");
    }

    const engineType = llmResult.provider === "azure-openai" ? "azure-openai" : "llm";
    const { parseScoringInput, computeScoringSafe } = await import("./scoringModel");

    const scoringInput = parseScoringInput(llmResult.response.scoringInput);
    const evaluationContent = {
      proposalSummary: llmResult.response.proposalSummary,
      mandateSummary: llmResult.response.mandateSummary,
      strengths: llmResult.response.strengths,
      risks: llmResult.response.risks,
      recommendations: llmResult.response.recommendations,
    };
    const scoringResult = computeScoringSafe(
      scoringInput,
      llmResult.response.fitScore,
      evaluationContent
    );

    const finalScore =
      scoringResult.scoringMethod === "structured"
        ? scoringResult.finalScore
        : llmResult.response.fitScore;

    report = {
      evaluationId: reportId,
      proposalId,
      tenantId,
      evaluatedAt: new Date().toISOString(),
      evaluatedByUserId: generatedByUserId,
      evaluatedByEmail: generatedByEmail,

      inputs: {
        proposalDocuments: proposalDocs.length,
        mandateTemplates: mandateTemplates.length,
        mandateKey: fundId || null,
        totalCharactersProcessed: extractedContent.totalCharacters,
        extractionWarnings: extractedContent.extractionWarnings,
        processedDocumentsCount: extractedContent.documentStats.processedDocumentsCount,
        truncatedDocumentsCount: extractedContent.documentStats.truncatedDocumentsCount,
        skippedDocumentsCount: extractedContent.documentStats.skippedDocumentsCount,
        proposalChunksUsed: extractedContent.proposalChunksUsed,
        mandateChunksUsed: extractedContent.mandateChunksUsed,
        matchedPairsCount: extractedContent.matchedPairsCount,
        relevanceMethod: extractedContent.relevanceMethod,
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

      structuredScores: scoringResult.structuredScores,
      scoringMethod: scoringResult.scoringMethod,

      model: llmResult.model,
      version: "2.0.0",
      engineType,
    };
  } else {
    throw new Error("No LLM configured. Set OPENAI_API_KEY or Azure OpenAI environment variables.");
  }

  // Store report JSON in blob storage
  const reportBlobPath = buildReportPath(tenantId, proposalId, reportId);
  const container = getDefaultContainer();
  await uploadBlob({
    container,
    path: reportBlobPath,
    contentType: "application/json",
    buffer: Buffer.from(JSON.stringify(report, null, 2), "utf-8"),
  });

  // Generate PDF from report
  const memoInput: MemoInput = {
    proposalId,
    proposalName,
    applicant,
    fundName,
    amount,
    fitScore: report.fitScore,
    proposalSummary: report.proposalSummary,
    mandateSummary: report.mandateSummary,
    strengths: report.strengths,
    risks: report.risks,
    recommendations: report.recommendations,
    confidence: report.confidence,
    structuredScores: report.structuredScores,
    evaluatedAt: report.evaluatedAt,
    evaluatedByEmail: report.evaluatedByEmail,
  };

  const pdfBytes = await generateMemoPDF(memoInput);
  const { blobPath: memoBlobPath, memoId } = await uploadMemoPDF(
    tenantId,
    proposalId,
    pdfBytes,
    report.fitScore
  );

  return {
    reportId,
    blobPath: reportBlobPath,
    report,
    memoBlobPath,
    memoId,
    generatedAt: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Report Storage Helpers
// ─────────────────────────────────────────────────────────────────────────────

export async function getLatestReport(
  tenantId: string,
  proposalId: string
): Promise<EvaluationReport | null> {
  const container = getDefaultContainer();
  const prefix = getReportsPrefix(tenantId, proposalId);

  const blobs = await listBlobs({ container, prefix });

  const reportBlobs = blobs.filter((b) => b.path.endsWith("/report.json"));
  if (reportBlobs.length === 0) return null;

  // Sort by path (newest first - report ID is timestamp-based)
  reportBlobs.sort((a, b) => b.path.localeCompare(a.path));

  const latest = reportBlobs[0];
  const result = await downloadBlob(container, latest.path);
  if (!result) return null;

  try {
    return JSON.parse(result.buffer.toString("utf-8")) as EvaluationReport;
  } catch {
    return null;
  }
}
