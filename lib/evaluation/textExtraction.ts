import "server-only";

// Text Extraction Helper for Proposal Evaluation
//
// Supported formats:
// - .txt files: Read directly as text
// - .csv files: Read directly as text
// - .pdf files: Extract using pdf-parse
// - .docx files: Extract using mammoth

import { downloadBlob, getDefaultContainer } from "@/lib/storage/azureBlob";
import {
  TEXT_EXTRACTABLE_TYPES,
  BINARY_EXTRACTABLE_TYPES,
  MAX_TOTAL_CHARS,
} from "./types";
import { extractDocxText, extractPdfText } from "@/lib/textExtractor";

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
}

// ─────────────────────────────────────────────────────────────────────────────
// Text Extraction
// ─────────────────────────────────────────────────────────────────────────────

// Extract text from a single blob
async function extractTextFromBlob(
  blobPath: string,
  contentType: string,
  uploadedAt: string
): Promise<DocumentTextResult> {
  const filename = blobPath.split("/").pop() || blobPath;
  const container = getDefaultContainer();

  // Check if plain text extraction is supported (txt, csv)
  if (TEXT_EXTRACTABLE_TYPES.includes(contentType)) {
    try {
      const result = await downloadBlob(container, blobPath);
      
      if (!result) {
        return {
          filename,
          blobPath,
          text: `[File: ${filename}] (download failed)`,
          uploadedAt,
          isPlaceholder: true,
          warning: `Failed to download ${filename}`,
        };
      }

      // Decode as UTF-8 text - don't truncate here, let inputPreparation handle it
      const text = result.buffer.toString("utf-8");

      return {
        filename,
        blobPath,
        text,
        uploadedAt,
        isPlaceholder: false,
      };
    } catch (error) {
      console.error("[textExtraction] Error extracting text:", error);
      return {
        filename,
        blobPath,
        text: `[File: ${filename}] (extraction error)`,
        uploadedAt,
        isPlaceholder: true,
        warning: `Error extracting text from ${filename}`,
      };
    }
  }

  // Check if binary extraction is supported (PDF, DOCX)
  if (BINARY_EXTRACTABLE_TYPES.includes(contentType)) {
    try {
      const result = await downloadBlob(container, blobPath);
      
      if (!result) {
        return {
          filename,
          blobPath,
          text: `[File: ${filename}] (download failed)`,
          uploadedAt,
          isPlaceholder: true,
          warning: `Failed to download ${filename}`,
        };
      }

      let text: string;
      
      // Extract based on content type
      if (contentType === "application/pdf") {
        text = await extractPdfText(result.buffer);
      } else if (
        contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        text = await extractDocxText(result.buffer);
      } else {
        return {
          filename,
          blobPath,
          text: `[File: ${filename}] (unsupported binary type: ${contentType})`,
          uploadedAt,
          isPlaceholder: true,
          warning: `Unsupported binary type for ${filename}`,
        };
      }
      
      // Don't truncate here - let inputPreparation handle it with proper prioritization
      return {
        filename,
        blobPath,
        text,
        uploadedAt,
        isPlaceholder: false,
      };
    } catch (error) {
      console.error("[textExtraction] Error extracting binary text:", error);
      return {
        filename,
        blobPath,
        text: `[File: ${filename}] (extraction error)`,
        uploadedAt,
        isPlaceholder: true,
        warning: `Error extracting text from ${filename}: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  // Unsupported type
  return {
    filename,
    blobPath,
    text: `[File: ${filename}] (unsupported file type: ${contentType})`,
    uploadedAt,
    isPlaceholder: true,
    warning: `Unsupported file type for ${filename}`,
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

// Extract text from all blobs without truncation (truncation handled by inputPreparation)
export async function extractTextFromBlobs(
  blobs: BlobInfo[]
): Promise<{ results: DocumentTextResult[]; warnings: string[] }> {
  const results: DocumentTextResult[] = [];
  const warnings: string[] = [];

  for (const blob of blobs) {
    const result = await extractTextFromBlob(blob.blobPath, blob.contentType, blob.uploadedAt);
    results.push(result);

    if (result.warning) {
      warnings.push(result.warning);
    }
  }

  return { results, warnings };
}

// NEW: Extract content from mandate templates and proposal documents
// Uses inputPreparation for smart prioritization and truncation
export async function extractContentForEvaluation(
  mandateBlobs: BlobInfo[],
  proposalBlobs: BlobInfo[]
): Promise<ExtractedContent> {
  // Import inputPreparation dynamically to avoid circular deps
  const { prepareEvaluationInputs } = await import("./inputPreparation");

  // Extract raw text from all blobs
  const mandateExtraction = await extractTextFromBlobs(mandateBlobs);
  const proposalExtraction = await extractTextFromBlobs(proposalBlobs);

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

  return {
    mandateText: prepared.mandateInput.combinedText,
    proposalText: prepared.proposalInput.combinedText,
    totalCharacters:
      prepared.mandateInput.combinedText.length +
      prepared.proposalInput.combinedText.length,
    extractionWarnings: prepared.allWarnings,
    documentStats: prepared.totalStats,
  };
}
