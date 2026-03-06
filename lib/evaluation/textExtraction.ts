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
  MAX_CHARS_PER_DOC,
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
  isPlaceholder: boolean;
  warning?: string;
}

export interface ExtractedContent {
  mandateText: string;
  proposalText: string;
  totalCharacters: number;
  extractionWarnings: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Text Extraction
// ─────────────────────────────────────────────────────────────────────────────

// Extract text from a single blob
async function extractTextFromBlob(
  blobPath: string,
  contentType: string
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
          isPlaceholder: true,
          warning: `Failed to download ${filename}`,
        };
      }

      // Decode as UTF-8 text
      const text = result.buffer.toString("utf-8");
      
      // Truncate if too long
      const truncatedText = text.substring(0, MAX_CHARS_PER_DOC);
      const wasTruncated = text.length > MAX_CHARS_PER_DOC;

      return {
        filename,
        blobPath,
        text: truncatedText,
        isPlaceholder: false,
        warning: wasTruncated
          ? `${filename} was truncated from ${text.length} to ${MAX_CHARS_PER_DOC} characters`
          : undefined,
      };
    } catch (error) {
      console.error("[textExtraction] Error extracting text:", error);
      return {
        filename,
        blobPath,
        text: `[File: ${filename}] (extraction error)`,
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
          isPlaceholder: true,
          warning: `Unsupported binary type for ${filename}`,
        };
      }
      
      // Truncate if too long
      const truncatedText = text.substring(0, MAX_CHARS_PER_DOC);
      const wasTruncated = text.length > MAX_CHARS_PER_DOC;

      return {
        filename,
        blobPath,
        text: truncatedText,
        isPlaceholder: false,
        warning: wasTruncated
          ? `${filename} was truncated from ${text.length} to ${MAX_CHARS_PER_DOC} characters`
          : undefined,
      };
    } catch (error) {
      console.error("[textExtraction] Error extracting binary text:", error);
      return {
        filename,
        blobPath,
        text: `[File: ${filename}] (extraction error)`,
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
}

// NEW: Extract text from multiple blobs with character limit
export async function extractTextFromBlobs(
  blobs: BlobInfo[],
  maxTotalChars: number = MAX_TOTAL_CHARS
): Promise<{ results: DocumentTextResult[]; warnings: string[] }> {
  const results: DocumentTextResult[] = [];
  const warnings: string[] = [];
  let totalChars = 0;

  for (const blob of blobs) {
    // Stop if we've hit the character limit
    if (totalChars >= maxTotalChars) {
      warnings.push(`Reached character limit, skipped ${blobs.length - results.length} file(s)`);
      break;
    }

    const result = await extractTextFromBlob(blob.blobPath, blob.contentType);
    
    // Truncate to fit within remaining budget
    const remainingChars = maxTotalChars - totalChars;
    if (result.text.length > remainingChars) {
      result.text = result.text.substring(0, remainingChars);
      if (!result.isPlaceholder) {
        result.warning = `${result.filename} was truncated to fit character limit`;
      }
    }

    totalChars += result.text.length;
    results.push(result);

    if (result.warning) {
      warnings.push(result.warning);
    }
  }

  return { results, warnings };
}

// NEW: Combine extracted texts into a single string
export function combineExtractedTexts(results: DocumentTextResult[]): string {
  if (results.length === 0) {
    return "No documents available.";
  }

  return results
    .map((r) => `--- ${r.filename} ---\n${r.text}`)
    .join("\n\n");
}

// NEW: Extract content from mandate templates and proposal documents
export async function extractContentForEvaluation(
  mandateBlobs: BlobInfo[],
  proposalBlobs: BlobInfo[]
): Promise<ExtractedContent> {
  const allWarnings: string[] = [];

  // Split character budget between mandate and proposal (40% mandate, 60% proposal)
  const mandateBudget = Math.floor(MAX_TOTAL_CHARS * 0.4);
  const proposalBudget = MAX_TOTAL_CHARS - mandateBudget;

  // Extract mandate texts
  const mandateResults = await extractTextFromBlobs(mandateBlobs, mandateBudget);
  allWarnings.push(...mandateResults.warnings);

  // Extract proposal texts
  const proposalResults = await extractTextFromBlobs(proposalBlobs, proposalBudget);
  allWarnings.push(...proposalResults.warnings);

  // Combine texts
  const mandateText = combineExtractedTexts(mandateResults.results);
  const proposalText = combineExtractedTexts(proposalResults.results);

  return {
    mandateText,
    proposalText,
    totalCharacters: mandateText.length + proposalText.length,
    extractionWarnings: allWarnings,
  };
}
