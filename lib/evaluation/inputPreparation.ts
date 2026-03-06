import "server-only";

// Input Preparation for Proposal Evaluation
//
// This module handles intelligent combination of multiple document texts
// with prioritization, truncation, and tracking of what was processed.
//
// Features:
// - Prioritizes newest documents first (by uploadedAt timestamp)
// - Enforces total character limit while preserving useful content
// - Tracks processed, truncated, and skipped documents

import { MAX_TOTAL_CHARS, MAX_CHARS_PER_DOC } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface DocumentInput {
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

export interface PreparedInput {
  combinedText: string;
  stats: DocumentProcessingStats;
  warnings: string[];
  documents: Array<{
    filename: string;
    status: "processed" | "truncated" | "skipped";
    originalLength?: number;
    processedLength?: number;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

function parseUploadedAt(dateStr: string | undefined): number {
  if (!dateStr) return 0;
  const parsed = new Date(dateStr).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function sortByNewest(documents: DocumentInput[]): DocumentInput[] {
  return [...documents].sort((a, b) => {
    const dateA = parseUploadedAt(a.uploadedAt);
    const dateB = parseUploadedAt(b.uploadedAt);
    return dateB - dateA;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Preparation Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Prepares document texts for evaluation by:
 * 1. Sorting by newest upload first
 * 2. Applying character limits while preserving content
 * 3. Tracking what was processed, truncated, or skipped
 *
 * @param documents Array of document inputs with extracted text
 * @param maxTotalChars Maximum total characters for combined output
 * @param maxPerDoc Maximum characters per individual document
 * @returns Prepared input with combined text and processing stats
 */
export function prepareDocumentInputs(
  documents: DocumentInput[],
  maxTotalChars: number = MAX_TOTAL_CHARS,
  maxPerDoc: number = MAX_CHARS_PER_DOC
): PreparedInput {
  const warnings: string[] = [];
  const processedDocs: PreparedInput["documents"] = [];
  const textParts: string[] = [];
  let totalCharsUsed = 0;
  let processedCount = 0;
  let truncatedCount = 0;
  let skippedCount = 0;

  // Sort documents by newest first
  const sortedDocs = sortByNewest(documents);

  for (const doc of sortedDocs) {
    // Skip placeholder documents (failed extraction)
    if (doc.isPlaceholder) {
      skippedCount++;
      processedDocs.push({
        filename: doc.filename,
        status: "skipped",
      });
      if (doc.warning) {
        warnings.push(doc.warning);
      }
      continue;
    }

    const remainingBudget = maxTotalChars - totalCharsUsed;

    // No budget left - skip remaining documents
    if (remainingBudget <= 0) {
      skippedCount++;
      processedDocs.push({
        filename: doc.filename,
        status: "skipped",
        originalLength: doc.text.length,
      });
      continue;
    }

    // Calculate how much of this document we can include
    const docMaxChars = Math.min(maxPerDoc, remainingBudget);
    const originalLength = doc.text.length;
    let processedText = doc.text;
    let status: "processed" | "truncated" = "processed";

    if (originalLength > docMaxChars) {
      processedText = doc.text.substring(0, docMaxChars);
      status = "truncated";
      truncatedCount++;
      warnings.push(
        `${doc.filename} was truncated from ${originalLength.toLocaleString()} to ${docMaxChars.toLocaleString()} characters`
      );
    } else {
      processedCount++;
    }

    // Add document separator and text
    textParts.push(`--- ${doc.filename} ---\n${processedText}`);
    totalCharsUsed += processedText.length;

    processedDocs.push({
      filename: doc.filename,
      status,
      originalLength,
      processedLength: processedText.length,
    });

    // Propagate any existing warnings from extraction
    if (doc.warning && !warnings.includes(doc.warning)) {
      warnings.push(doc.warning);
    }
  }

  // Add summary warning if documents were skipped due to limit
  const skippedDueToLimit = processedDocs.filter(
    (d) => d.status === "skipped" && d.originalLength !== undefined
  ).length;

  if (skippedDueToLimit > 0) {
    warnings.push(
      `Reached character limit, skipped ${skippedDueToLimit} file(s): ` +
        processedDocs
          .filter((d) => d.status === "skipped" && d.originalLength !== undefined)
          .map((d) => d.filename)
          .join(", ")
    );
  }

  // Build combined text
  const combinedText =
    textParts.length > 0 ? textParts.join("\n\n") : "No documents available.";

  return {
    combinedText,
    stats: {
      processedDocumentsCount: processedCount,
      truncatedDocumentsCount: truncatedCount,
      skippedDocumentsCount: skippedCount,
    },
    warnings,
    documents: processedDocs,
  };
}

/**
 * Prepares both mandate and proposal documents for evaluation.
 * Splits the character budget: 40% for mandate, 60% for proposal.
 *
 * @param mandateDocs Mandate template documents
 * @param proposalDocs Proposal documents
 * @param totalBudget Total character budget (default MAX_TOTAL_CHARS)
 * @returns Combined prepared inputs for both document sets
 */
export function prepareEvaluationInputs(
  mandateDocs: DocumentInput[],
  proposalDocs: DocumentInput[],
  totalBudget: number = MAX_TOTAL_CHARS
): {
  mandateInput: PreparedInput;
  proposalInput: PreparedInput;
  totalStats: DocumentProcessingStats;
  allWarnings: string[];
} {
  // Split budget: 40% mandate, 60% proposal
  const mandateBudget = Math.floor(totalBudget * 0.4);
  const proposalBudget = totalBudget - mandateBudget;

  const mandateInput = prepareDocumentInputs(mandateDocs, mandateBudget);
  const proposalInput = prepareDocumentInputs(proposalDocs, proposalBudget);

  // Aggregate stats
  const totalStats: DocumentProcessingStats = {
    processedDocumentsCount:
      mandateInput.stats.processedDocumentsCount +
      proposalInput.stats.processedDocumentsCount,
    truncatedDocumentsCount:
      mandateInput.stats.truncatedDocumentsCount +
      proposalInput.stats.truncatedDocumentsCount,
    skippedDocumentsCount:
      mandateInput.stats.skippedDocumentsCount +
      proposalInput.stats.skippedDocumentsCount,
  };

  // Combine warnings with category prefixes for clarity
  const allWarnings: string[] = [];

  if (mandateInput.warnings.length > 0) {
    allWarnings.push(...mandateInput.warnings.map((w) => `[Mandate] ${w}`));
  }
  if (proposalInput.warnings.length > 0) {
    allWarnings.push(...proposalInput.warnings.map((w) => `[Proposal] ${w}`));
  }

  return {
    mandateInput,
    proposalInput,
    totalStats,
    allWarnings,
  };
}
