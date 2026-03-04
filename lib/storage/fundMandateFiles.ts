import "server-only";

/**
 * Fund Mandate File Storage Adapter
 *
 * IMPORTANT: This is a stub implementation using in-memory storage.
 * In production, this will be replaced with Azure Blob Storage.
 *
 * TODO: Replace with Azure Blob Storage implementation:
 * - Use @azure/storage-blob package
 * - Store files in a dedicated container per tenant
 * - Implement proper blob naming conventions
 * - Add SAS token generation for secure downloads
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SaveFileParams {
  tenantId: string;
  templateId: string;
  fileName: string;
  contentType: string;
  buffer: Buffer;
}

export interface SaveFileResult {
  storageKey: string;
  sizeBytes: number;
}

export interface StoredFile {
  buffer: Buffer;
  contentType: string;
  fileName: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// In-Memory Storage (stub for Azure Blob Storage)
// ─────────────────────────────────────────────────────────────────────────────

const fileStore = new Map<string, StoredFile>();

function generateStorageKey(
  tenantId: string,
  templateId: string,
  fileName: string
): string {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `${tenantId}/${templateId}/${timestamp}-${sanitizedFileName}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage Functions
// ─────────────────────────────────────────────────────────────────────────────

export function saveFundMandateFile(params: SaveFileParams): SaveFileResult {
  const { tenantId, templateId, fileName, contentType, buffer } = params;

  const storageKey = generateStorageKey(tenantId, templateId, fileName);

  fileStore.set(storageKey, {
    buffer,
    contentType,
    fileName,
  });

  return {
    storageKey,
    sizeBytes: buffer.length,
  };
}

export function readFundMandateFile(
  storageKey: string
): StoredFile | undefined {
  return fileStore.get(storageKey);
}

export function deleteFundMandateFile(storageKey: string): boolean {
  return fileStore.delete(storageKey);
}
