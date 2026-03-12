import "server-only";

// Text Extraction Helper for Proposal Evaluation
//
// This module coordinates document extraction for evaluation.
// Uses the documentExtractionClient abstraction for actual extraction.
// Uses inputPreparation for smart prioritization and truncation.

import { MAX_TOTAL_CHARS } from "./types";
import {
  extractDocumentsFromBlobs,
  type BatchExtractionInput,
} from "@/lib/extraction/documentExtractionClient";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface DocumentTextResult {
  filename: string;
  blobPath: string;
  text: string;
  uploadedAt: string;
  isPlaceholder: boolean;
  warning?: string;
}

export interface DocumentProcessingStats {
  processedDocumentsCount: number;
  truncatedDocumentsCount: number;
  skippedDocumentsCount: number;
}

export interface ExtractedContent {
  mandateText: string;
  proposalText: string;
  totalCharacters: number;
  extractionWarnings: string[];
  documentStats: DocumentProcessingStats;
  // Chunk metadata (optional for backwards compatibility)
  proposalChunksUsed?: number;
  mandateChunksUsed?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Text Extraction (using documentExtractionClient)
// ─────────────────────────────────────────────────────────────────────────────

// Convert BlobInfo to BatchExtractionInput
function toBatchInput(blob: BlobInfo): BatchExtractionInput {
  return {
    fileName: blob.filename,
    blobPath: blob.blobPath,
    contentType: blob.contentType,
    uploadedAt: blob.uploadedAt,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Extraction Functions
// ─────────────────────────────────────────────────────────────────────────────

export interface BlobInfo {
  blobPath: string;
  contentType: string;
  filename: string;
  uploadedAt: string;
}

// Extract text from all blobs using the extraction client
// Truncation is handled by inputPreparation
export async function extractTextFromBlobs(
  blobs: BlobInfo[]
): Promise<{ results: DocumentTextResult[]; warnings: string[] }> {
  const inputs = blobs.map(toBatchInput);
  const batchResults = await extractDocumentsFromBlobs(inputs);

  const results: DocumentTextResult[] = batchResults.map((r) => ({
    filename: r.fileName,
    blobPath: r.blobPath,
    text: r.text,
    uploadedAt: r.uploadedAt,
    isPlaceholder: r.isPlaceholder,
    warning: r.warnings.length > 0 ? r.warnings.join("; ") : undefined,
  }));

  const warnings = batchResults.flatMap((r) => r.warnings);

  return { results, warnings };
}

// Extract content from mandate templates and proposal documents
// Uses documentExtractionClient for extraction (routes to Python extractor)
// Uses inputPreparation for smart prioritization and truncation
export async function extractContentForEvaluation(
  mandateBlobs: BlobInfo[],
  proposalBlobs: BlobInfo[]
): Promise<ExtractedContent> {
  // Import inputPreparation dynamically to avoid circular deps
  const { prepareEvaluationInputs } = await import("./inputPreparation");

  // Log extraction start
  console.log(
    `[textExtraction] Starting extraction: ${mandateBlobs.length} mandate template(s), ${proposalBlobs.length} proposal document(s)`
  );

  // Extract raw text from mandate templates
  if (mandateBlobs.length > 0) {
    console.log("[textExtraction] Extracting mandate template text...");
    for (const blob of mandateBlobs) {
      console.log(`[textExtraction]   - ${blob.filename} (${blob.contentType})`);
    }
  } else {
    console.log("[textExtraction] No mandate templates to extract");
  }

  const mandateExtraction = await extractTextFromBlobs(mandateBlobs);

  // Log mandate extraction results
  const mandateChars = mandateExtraction.results.reduce((sum, r) => sum + r.text.length, 0);
  console.log(
    `[textExtraction] Mandate extraction complete: ${mandateChars} characters from ${mandateExtraction.results.length} file(s)`
  );
  if (mandateExtraction.warnings.length > 0) {
    console.log(`[textExtraction] Mandate warnings: ${mandateExtraction.warnings.join("; ")}`);
  }

  // Extract raw text from proposal documents
  if (proposalBlobs.length > 0) {
    console.log("[textExtraction] Extracting proposal document text...");
  }

  const proposalExtraction = await extractTextFromBlobs(proposalBlobs);

  // Log proposal extraction results
  const proposalChars = proposalExtraction.results.reduce((sum, r) => sum + r.text.length, 0);
  console.log(
    `[textExtraction] Proposal extraction complete: ${proposalChars} characters from ${proposalExtraction.results.length} file(s)`
  );

  // Convert DocumentTextResult to DocumentInput format for inputPreparation
  const mandateDocs = mandateExtraction.results.map((r) => ({
    filename: r.filename,
    blobPath: r.blobPath,
    text: r.text,
    uploadedAt: r.uploadedAt,
    isPlaceholder: r.isPlaceholder,
    warning: r.warning,
  }));

  const proposalDocs = proposalExtraction.results.map((r) => ({
    filename: r.filename,
    blobPath: r.blobPath,
    text: r.text,
    uploadedAt: r.uploadedAt,
    isPlaceholder: r.isPlaceholder,
    warning: r.warning,
  }));

  // Use inputPreparation for smart prioritization and truncation
  const prepared = prepareEvaluationInputs(mandateDocs, proposalDocs, MAX_TOTAL_CHARS);

  // Log final prepared content stats
  const totalChars =
    prepared.mandateInput.combinedText.length +
    prepared.proposalInput.combinedText.length;

  console.log(
    `[textExtraction] Extraction complete - mandate: ${prepared.mandateInput.combinedText.length} chars, proposal: ${prepared.proposalInput.combinedText.length} chars, total: ${totalChars} chars`
  );
  console.log(
    `[textExtraction] Document stats - processed: ${prepared.totalStats.processedDocumentsCount}, truncated: ${prepared.totalStats.truncatedDocumentsCount}, skipped: ${prepared.totalStats.skippedDocumentsCount}`
  );

  // Log chunk stats if available
  if (prepared.proposalChunksUsed !== undefined || prepared.mandateChunksUsed !== undefined) {
    console.log(
      `[textExtraction] Chunks used - mandate: ${prepared.mandateChunksUsed ?? 0}, proposal: ${prepared.proposalChunksUsed ?? 0}`
    );
  }

  if (prepared.allWarnings.length > 0) {
    console.log(`[textExtraction] All warnings: ${prepared.allWarnings.length}`);
  }

  return {
    mandateText: prepared.mandateInput.combinedText,
    proposalText: prepared.proposalInput.combinedText,
    totalCharacters: totalChars,
    extractionWarnings: prepared.allWarnings,
    documentStats: prepared.totalStats,
    proposalChunksUsed: prepared.proposalChunksUsed,
    mandateChunksUsed: prepared.mandateChunksUsed,
  };
}
