import "server-only";

// Azure Blob Storage Helper for Proposal Documents
//
// Path structure:
//   tenants/{tenantId}/proposals/{proposalId}/documents/{timestamp}-{safeFilename}
//
// Timestamp format: YYYYMMDDTHHmmssZ (UTC)

import {
  uploadBlob,
  listBlobs,
  downloadBlob,
  deleteBlob,
  getDefaultContainer,
  generateTimestamp,
  parseTimestampFromPath,
  getStorageStatus,
  type BlobMetadata,
} from "./azureBlob";

export { getStorageStatus };

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface UploadProposalDocumentParams {
  tenantId: string;
  proposalId: string;
  filename: string;
  contentType: string;
  buffer: Buffer;
  uploadedByUserId: string;
  uploadedByEmail: string;
}

export interface UploadProposalDocumentResult {
  blobPath: string;
  filename: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
}

export interface ProposalDocumentBlob {
  blobPath: string;
  filename: string;
  size: number;
  contentType: string;
  uploadedAt: string;
  timestamp: string;
}

export interface ProposalDocumentGroup {
  timestamp: string;
  uploadedAt: string;
  files: ProposalDocumentBlob[];
}

export interface ListProposalDocumentsResult {
  grouped: ProposalDocumentGroup[];
  flat: ProposalDocumentBlob[];
}

// ─────────────────────────────────────────────────────────────────────────────
// File Validation
// ─────────────────────────────────────────────────────────────────────────────

// Allowed file types for proposal documents
export const ALLOWED_CONTENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

// Allowed file extensions for proposal documents
export const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx", ".xls", ".xlsx"];

// Max file size 25MB
export const MAX_FILE_SIZE = 25 * 1024 * 1024;

// Error message for unsupported file types
export const UNSUPPORTED_FILE_ERROR = "Only PDF, DOC, DOCX, XLS, and XLSX files are supported.";

export function validateFile(file: File): { valid: boolean; error?: string } {
  const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
  const isValidExtension = ALLOWED_EXTENSIONS.includes(extension);
  const isValidContentType = ALLOWED_CONTENT_TYPES.includes(file.type);

  if (!isValidExtension && !isValidContentType) {
    return {
      valid: false,
      error: UNSUPPORTED_FILE_ERROR,
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: "File size exceeds 25MB limit.",
    };
  }

  return { valid: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Path Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a safe filename:
 * - Strips any path components (keeps only the filename)
 * - Replaces spaces with underscores
 * - Removes any characters that aren't alphanumeric, dot, underscore, or hyphen
 */
function sanitizeFilename(filename: string): string {
  // Strip path separators - keep only the filename
  const baseName = filename.replace(/^.*[\\/]/, "");
  // Replace spaces with underscores, then remove any other unsafe characters
  return baseName
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_"); // collapse multiple underscores
}

function buildProposalDocumentPath(
  tenantId: string,
  proposalId: string,
  filename: string
): string {
  const timestamp = generateTimestamp();
  const sanitized = sanitizeFilename(filename);
  return `tenants/${tenantId}/proposals/${proposalId}/documents/${timestamp}-${sanitized}`;
}

function getProposalDocumentsPrefix(tenantId: string, proposalId: string): string {
  return `tenants/${tenantId}/proposals/${proposalId}/documents/`;
}

function extractFilenameFromPath(blobPath: string): string {
  const parts = blobPath.split("/");
  return parts[parts.length - 1] || blobPath;
}

function extractTimestampFromPath(blobPath: string): string {
  const match = blobPath.match(/(\d{8}T\d{6}Z)/);
  return match ? match[1] : "";
}

// Validate blob path belongs to correct tenant/proposal
export function validateBlobPath(
  blobPath: string,
  tenantId: string,
  proposalId: string
): boolean {
  const expectedPrefix = `tenants/${tenantId}/proposals/${proposalId}/documents/`;
  return blobPath.startsWith(expectedPrefix);
}

// ─────────────────────────────────────────────────────────────────────────────
// Upload Proposal Document
// ─────────────────────────────────────────────────────────────────────────────

export async function uploadProposalDocument(
  params: UploadProposalDocumentParams
): Promise<UploadProposalDocumentResult> {
  const { tenantId, proposalId, filename, contentType, buffer, uploadedByEmail } = params;

  const blobPath = buildProposalDocumentPath(tenantId, proposalId, filename);
  const container = getDefaultContainer();

  const result = await uploadBlob({
    container,
    path: blobPath,
    contentType,
    buffer,
    metadata: {
      tenantId,
      proposalId,
      originalFilename: filename,
      uploadedBy: uploadedByEmail,
    },
  });

  return {
    blobPath: result.path,
    filename: sanitizeFilename(filename),
    size: result.sizeBytes,
    uploadedAt: result.uploadedAt,
    uploadedBy: uploadedByEmail,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// List Proposal Documents
// ─────────────────────────────────────────────────────────────────────────────

export async function listProposalDocuments(
  tenantId: string,
  proposalId: string
): Promise<ListProposalDocumentsResult> {
  const container = getDefaultContainer();
  const prefix = getProposalDocumentsPrefix(tenantId, proposalId);

  const blobs = await listBlobs({ container, prefix });

  // NEW: Convert to ProposalDocumentBlob format
  const documents: ProposalDocumentBlob[] = blobs.map((blob: BlobMetadata) => {
    const timestamp = extractTimestampFromPath(blob.path);
    const parsedDate = parseTimestampFromPath(blob.path);

    return {
      blobPath: blob.path,
      filename: extractFilenameFromPath(blob.path),
      size: blob.size,
      contentType: blob.contentType || "application/octet-stream",
      uploadedAt: parsedDate?.toISOString() || blob.lastModified,
      timestamp,
    };
  });

  // NEW: Sort by uploadedAt descending (newest first)
  documents.sort((a, b) => {
    return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
  });

  // NEW: Group by timestamp
  const groupMap = new Map<string, ProposalDocumentGroup>();
  for (const doc of documents) {
    if (!groupMap.has(doc.timestamp)) {
      groupMap.set(doc.timestamp, {
        timestamp: doc.timestamp,
        uploadedAt: doc.uploadedAt,
        files: [],
      });
    }
    groupMap.get(doc.timestamp)!.files.push(doc);
  }

  // NEW: Sort groups by uploadedAt descending
  const grouped = Array.from(groupMap.values()).sort((a, b) => {
    return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
  });

  return {
    grouped,
    flat: documents,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Download Proposal Document
// ─────────────────────────────────────────────────────────────────────────────

export async function downloadProposalDocument(
  tenantId: string,
  proposalId: string,
  blobPath: string
): Promise<{ buffer: Buffer; contentType: string; filename: string } | null> {
  // NEW: Validate blob path belongs to this tenant/proposal
  if (!validateBlobPath(blobPath, tenantId, proposalId)) {
    return null;
  }

  const container = getDefaultContainer();
  const result = await downloadBlob(container, blobPath);

  if (!result) {
    return null;
  }

  return {
    buffer: result.buffer,
    contentType: result.contentType,
    filename: extractFilenameFromPath(blobPath),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete Proposal Document
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteProposalDocument(
  tenantId: string,
  proposalId: string,
  blobPath: string
): Promise<boolean> {
  // NEW: Validate blob path belongs to this tenant/proposal
  if (!validateBlobPath(blobPath, tenantId, proposalId)) {
    return false;
  }

  const container = getDefaultContainer();
  return await deleteBlob(container, blobPath);
}
