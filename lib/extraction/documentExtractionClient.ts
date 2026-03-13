import "server-only";

// Document Extraction Client
//
// Abstraction layer for document text extraction.
// Uses Python extractor service when available (better extraction quality).
// Falls back to Node.js extraction helpers if Python service is unavailable.

import { downloadBlob, getDefaultContainer } from "@/lib/storage/azureBlob";
import { extractDocxText, extractPdfText } from "@/lib/textExtractor";
import { extractDocumentViaPython } from "./pythonExtractionClient";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ExtractionInputMetadata {
  fileName: string;
  blobPath: string;
  extension: string;
  sizeBytes: number;
  contentType: string;
  uploadedAt: string;
}

export interface ExtractionResult {
  text: string;
  warnings: string[];
  charactersProcessed: number;
}

export interface ExtractDocumentOptions {
  blobPath: string;
  fileType: string;
  fileName?: string;
}

// Supported file types for extraction
const SUPPORTED_TEXT_TYPES = ["text/plain", "text/csv"];
const SUPPORTED_BINARY_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// File extensions that should use Python extraction first (covers edge cases where MIME type may differ)
const PYTHON_FIRST_EXTENSIONS = [".pdf", ".docx"];

// ─────────────────────────────────────────────────────────────────────────────
// Extraction Input Metadata Helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds extraction input metadata from blob information.
 * This metadata can be used for logging, tracking, or passing to extraction services.
 */
export function buildExtractionInputMetadata(params: {
  fileName: string;
  blobPath: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
}): ExtractionInputMetadata {
  const extension = extractExtension(params.fileName);
  
  return {
    fileName: params.fileName,
    blobPath: params.blobPath,
    extension,
    sizeBytes: params.sizeBytes,
    contentType: params.contentType,
    uploadedAt: params.uploadedAt,
  };
}

function extractExtension(fileName: string): string {
  if (!fileName) return "";
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1) return "";
  return fileName.substring(lastDot).toLowerCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// Document Extraction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determines if a file should use Python extraction first based on extension.
 * This supplements MIME type checking for more robust handling.
 */
function shouldUsePythonExtraction(fileType: string, fileName: string | undefined): boolean {
  // Check MIME type first
  if (SUPPORTED_BINARY_TYPES.includes(fileType)) {
    return true;
  }

  // Also check file extension as fallback (handles cases where MIME type differs)
  if (fileName) {
    const extension = extractExtension(fileName);
    if (PYTHON_FIRST_EXTENSIONS.includes(extension)) {
      return true;
    }
  }

  return false;
}

/**
 * Extracts text from a document stored in Azure Blob Storage.
 *
 * Uses Python extractor service when available for better extraction quality.
 * Falls back to Node.js extraction if Python service is unavailable:
 * - PDF: pdf-parse
 * - DOCX: mammoth
 * - TXT/CSV: UTF-8 decode
 *
 * @param options - Extraction options including blobPath and fileType
 * @returns ExtractionResult with text, warnings, and character count
 */
export async function extractDocumentFromBlob(
  options: ExtractDocumentOptions
): Promise<ExtractionResult> {
  const { blobPath, fileType, fileName } = options;
  const displayName = fileName || blobPath.split("/").pop() || blobPath;
  const warnings: string[] = [];
  const extension = extractExtension(displayName);

  // Excel files: store normally but extraction not implemented - do not crash
  const EXCEL_EXTENSIONS = [".xls", ".xlsx"];
  const EXCEL_MIME_TYPES = [
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];
  const isExcel =
    EXCEL_EXTENSIONS.includes(extension) || EXCEL_MIME_TYPES.includes(fileType);
  if (isExcel) {
    return {
      text: "",
      warnings: ["Excel file uploaded successfully, but content extraction is not implemented yet."],
      charactersProcessed: 0,
    };
  }

  // Validate file type is supported (check both MIME type and extension)
  if (!isFileTypeSupported(fileType) && !PYTHON_FIRST_EXTENSIONS.includes(extension)) {
    return {
      text: "",
      warnings: [`Unsupported file type: ${fileType} for ${displayName}`],
      charactersProcessed: 0,
    };
  }

  const container = getDefaultContainer();
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING || "";

  // Try Python extractor first for PDF and DOCX files (check both MIME type and extension)
  const usePythonFirst = shouldUsePythonExtraction(fileType, fileName || displayName);

  if (usePythonFirst) {
    console.log(`[extractDocumentFromBlob] Python extraction branch entered for ${displayName}`);
    console.log(`[extractDocumentFromBlob] fileType=${fileType}, extension=${extension}, hasConnectionString=${!!connectionString}`);

    if (!connectionString) {
      const reason = "AZURE_STORAGE_CONNECTION_STRING not set";
      console.log(`[extractDocumentFromBlob] Python extraction failed for ${displayName}, fallback reason: ${reason}`);
      warnings.push(`Python extractor failed for ${displayName}; fallback used`);
    } else if (!process.env.PYTHON_EXTRACTOR_URL) {
      const reason = "PYTHON_EXTRACTOR_URL not configured";
      console.log(`[extractDocumentFromBlob] Python extraction failed for ${displayName}, fallback reason: ${reason}`);
      warnings.push(`Python extractor failed for ${displayName}; fallback used`);
    } else {
      console.log(`[extractDocumentFromBlob] Calling Python extractor for: ${displayName}`);

      const pythonResult = await extractDocumentViaPython({
        connectionString,
        container,
        blobPath,
        fileType,
      });

      if (pythonResult.success && pythonResult.text && pythonResult.text.length > 0) {
        console.log(
          `[extractDocumentFromBlob] Python extraction succeeded for ${displayName} (${pythonResult.charactersProcessed} chars)`
        );
        return {
          text: pythonResult.text,
          warnings,
          charactersProcessed: pythonResult.charactersProcessed,
        };
      }

      // Python extraction failed or returned empty - log and fallback
      const reason = pythonResult.error || "empty/invalid response";
      console.log(`[extractDocumentFromBlob] Python extraction failed for ${displayName}, fallback reason: ${reason}`);
      warnings.push(`Python extractor failed for ${displayName}; fallback used`);
    }
  } else {
    console.log(
      `[extractDocumentFromBlob] Skipping Python extractor for non-binary type: ${fileType} (${displayName})`
    );
  }

  // Fallback: Download blob and use Node.js extraction
  let buffer: Buffer;

  try {
    const result = await downloadBlob(container, blobPath);
    if (!result) {
      warnings.push(`Fallback extraction failed for ${displayName}: could not download from storage`);
      return {
        text: "",
        warnings,
        charactersProcessed: 0,
      };
    }
    buffer = result.buffer;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[extractDocumentFromBlob] Download error:", error);
    warnings.push(`Fallback extraction failed for ${displayName}: ${errorMessage}`);
    return {
      text: "",
      warnings,
      charactersProcessed: 0,
    };
  }

  // Extract text based on file type using Node.js (with proper error handling)
  const isPdf = fileType === "application/pdf" || extension === ".pdf";
  const isDocx =
    fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    extension === ".docx";

  try {
    let text: string;

    if (SUPPORTED_TEXT_TYPES.includes(fileType)) {
      // Plain text files
      text = buffer.toString("utf-8");
    } else if (isPdf) {
      // PDF extraction via Node (wrapped in try/catch to handle DOMMatrix and other errors)
      console.log(`[extractDocumentFromBlob] Using Node PDF fallback extraction for: ${displayName}`);
      try {
        text = await extractPdfText(buffer);
      } catch (pdfError) {
        const pdfErrorMessage = pdfError instanceof Error ? pdfError.message : "Unknown PDF error";
        console.error(`[extractDocumentFromBlob] Node PDF extraction failed for ${displayName}:`, pdfError);
        warnings.push(`Fallback extraction failed for ${displayName}: ${pdfErrorMessage}`);
        return {
          text: "",
          warnings,
          charactersProcessed: 0,
        };
      }
    } else if (isDocx) {
      // DOCX extraction via Node
      console.log(`[extractDocumentFromBlob] Using Node DOCX fallback extraction for: ${displayName}`);
      try {
        text = await extractDocxText(buffer);
      } catch (docxError) {
        const docxErrorMessage = docxError instanceof Error ? docxError.message : "Unknown DOCX error";
        console.error(`[extractDocumentFromBlob] Node DOCX extraction failed for ${displayName}:`, docxError);
        warnings.push(`Fallback extraction failed for ${displayName}: ${docxErrorMessage}`);
        return {
          text: "",
          warnings,
          charactersProcessed: 0,
        };
      }
    } else {
      warnings.push(`Fallback extraction failed for ${displayName}: no extraction handler for file type ${fileType}`);
      return {
        text: "",
        warnings,
        charactersProcessed: 0,
      };
    }

    if (text && text.length > 0) {
      console.log(`[extractDocumentFromBlob] Fallback extraction succeeded for ${displayName} (${text.length} chars)`);
    }

    return {
      text,
      warnings,
      charactersProcessed: text.length,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[extractDocumentFromBlob] Extraction error:", error);
    warnings.push(`Fallback extraction failed for ${displayName}: ${errorMessage}`);
    return {
      text: "",
      warnings,
      charactersProcessed: 0,
    };
  }
}

/**
 * Checks if a file type is supported for extraction.
 * Checks both MIME type and can be supplemented with extension check.
 */
export function isFileTypeSupported(fileType: string, fileName?: string): boolean {
  if (SUPPORTED_TEXT_TYPES.includes(fileType) || SUPPORTED_BINARY_TYPES.includes(fileType)) {
    return true;
  }

  // Also check extension for PDF/DOCX files that may have unexpected MIME types
  if (fileName) {
    const extension = extractExtension(fileName);
    if (PYTHON_FIRST_EXTENSIONS.includes(extension)) {
      return true;
    }
  }

  return false;
}

/**
 * Gets the list of supported file types for extraction.
 */
export function getSupportedFileTypes(): string[] {
  return [...SUPPORTED_TEXT_TYPES, ...SUPPORTED_BINARY_TYPES];
}

// ─────────────────────────────────────────────────────────────────────────────
// Batch Extraction
// ─────────────────────────────────────────────────────────────────────────────

export interface BatchExtractionInput {
  fileName: string;
  blobPath: string;
  contentType: string;
  uploadedAt: string;
}

export interface BatchExtractionResult {
  fileName: string;
  blobPath: string;
  text: string;
  uploadedAt: string;
  warnings: string[];
  charactersProcessed: number;
  isPlaceholder: boolean;
}

/**
 * Extracts text from multiple documents.
 * Preserves metadata for each document for use in input preparation.
 */
export async function extractDocumentsFromBlobs(
  inputs: BatchExtractionInput[]
): Promise<BatchExtractionResult[]> {
  const results: BatchExtractionResult[] = [];

  for (const input of inputs) {
    const extractionResult = await extractDocumentFromBlob({
      blobPath: input.blobPath,
      fileType: input.contentType,
      fileName: input.fileName,
    });

    const isPlaceholder = extractionResult.text.length === 0 && extractionResult.warnings.length > 0;

    results.push({
      fileName: input.fileName,
      blobPath: input.blobPath,
      text: extractionResult.text,
      uploadedAt: input.uploadedAt,
      warnings: extractionResult.warnings,
      charactersProcessed: extractionResult.charactersProcessed,
      isPlaceholder,
    });
  }

  return results;
}
