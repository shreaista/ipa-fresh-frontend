import "server-only";

/**
 * Azure Blob Storage Adapter for IPA
 *
 * Supports storing proposal files and fund mandate templates in Azure Blob Storage.
 * Blobs are NOT public - access is controlled via the application.
 *
 * Virtual folder structure:
 * - Proposals: tenants/{tenantId}/proposals/{proposalId}/{timestamp}/{filename}
 * - Fund Mandates: tenants/{tenantId}/funds/{fundId}/mandates/{timestamp}/{filename}
 *
 * Environment variables:
 * - AZURE_STORAGE_CONNECTION_STRING: Connection string for Azure Storage account
 * - AZURE_STORAGE_CONTAINER: Container name (e.g., "ipa-private")
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface UploadBlobParams {
  container: string;
  path: string;
  contentType: string;
  buffer: Buffer;
  metadata?: Record<string, string>;
}

export interface UploadBlobResult {
  path: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface BlobMetadata {
  path: string;
  lastModified: string;
  size: number;
  contentType?: string;
  fileName?: string;
}

export interface ListBlobsParams {
  container: string;
  prefix: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Timestamp Utilities
// ─────────────────────────────────────────────────────────────────────────────

export function generateTimestamp(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const hours = String(now.getUTCHours()).padStart(2, "0");
  const minutes = String(now.getUTCMinutes()).padStart(2, "0");
  const seconds = String(now.getUTCSeconds()).padStart(2, "0");
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

export function parseTimestampFromPath(path: string): Date | null {
  const match = path.match(/(\d{8}T\d{6}Z)/);
  if (!match) return null;

  const ts = match[1];
  const year = parseInt(ts.substring(0, 4));
  const month = parseInt(ts.substring(4, 6)) - 1;
  const day = parseInt(ts.substring(6, 8));
  const hours = parseInt(ts.substring(9, 11));
  const minutes = parseInt(ts.substring(11, 13));
  const seconds = parseInt(ts.substring(13, 15));

  return new Date(Date.UTC(year, month, day, hours, minutes, seconds));
}

// ─────────────────────────────────────────────────────────────────────────────
// Path Builders
// ─────────────────────────────────────────────────────────────────────────────

export function buildProposalFilePath(
  tenantId: string,
  proposalId: string,
  fileName: string
): string {
  const timestamp = generateTimestamp();
  const sanitizedFileName = sanitizeFileName(fileName);
  return `tenants/${tenantId}/proposals/${proposalId}/${timestamp}/${sanitizedFileName}`;
}

export function buildFundMandatePath(
  tenantId: string,
  fundId: string,
  fileName: string
): string {
  const timestamp = generateTimestamp();
  const sanitizedFileName = sanitizeFileName(fileName);
  return `tenants/${tenantId}/funds/${fundId}/mandates/${timestamp}/${sanitizedFileName}`;
}

export function getProposalFilesPrefix(tenantId: string, proposalId: string): string {
  return `tenants/${tenantId}/proposals/${proposalId}/`;
}

export function getFundMandatesPrefix(tenantId: string, fundId: string): string {
  return `tenants/${tenantId}/funds/${fundId}/mandates/`;
}

/** Blob info for fund mandate files (fundId-based storage). Compatible with evaluation. */
export interface FundMandateBlobInfo {
  blobPath: string;
  name: string;
  uploadedAt: string;
  size: number;
  contentType: string;
  fundId: string;
}

/** List mandate files for a fund (fundId-based path). */
export async function listFundMandateBlobsByFundId(
  tenantId: string,
  fundId: string
): Promise<FundMandateBlobInfo[]> {
  const container = getDefaultContainer();
  const prefix = getFundMandatesPrefix(tenantId, fundId);
  const blobs = await listBlobs({ container, prefix });

  return blobs.map((b) => ({
    blobPath: b.path,
    name: b.fileName || extractFileName(b.path),
    uploadedAt: b.lastModified,
    size: b.size,
    contentType: b.contentType || "application/octet-stream",
    fundId,
  }));
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function extractFileName(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1] || path;
}

// ─────────────────────────────────────────────────────────────────────────────
// In-Memory Storage (Fallback when Azure not configured)
// ─────────────────────────────────────────────────────────────────────────────

interface InMemoryBlob {
  buffer: Buffer;
  contentType: string;
  uploadedAt: string;
}

const inMemoryStore = new Map<string, InMemoryBlob>();

function isAzureConfigured(): boolean {
  return !!(
    process.env.AZURE_STORAGE_CONNECTION_STRING &&
    process.env.AZURE_STORAGE_CONTAINER
  );
}

/**
 * Returns the current storage mode and configuration status.
 * Used to inform API consumers about storage configuration.
 */
export function getStorageStatus(): {
  configured: boolean;
  mode: "azure" | "memory";
  message: string;
} {
  const configured = isAzureConfigured();
  return {
    configured,
    mode: configured ? "azure" : "memory",
    message: configured
      ? "Azure Blob Storage is configured"
      : "Azure Storage not configured. Using in-memory storage (data will be lost on restart). Set AZURE_STORAGE_CONNECTION_STRING and AZURE_STORAGE_CONTAINER environment variables.",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Azure Blob Client (lazy loaded)
// ─────────────────────────────────────────────────────────────────────────────

let blobServiceClient: unknown = null;

async function getBlobServiceClient(): Promise<unknown> {
  if (!isAzureConfigured()) {
    return null;
  }

  if (blobServiceClient) {
    return blobServiceClient;
  }

  try {
    const { BlobServiceClient } = await import("@azure/storage-blob");
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING!;
    blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    return blobServiceClient;
  } catch (error) {
    console.warn("[azureBlob] Failed to initialize Azure Blob client:", error);
    return null;
  }
}

async function getContainerClient(containerName: string): Promise<unknown> {
  const client = await getBlobServiceClient();
  if (!client) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as any).getContainerClient(containerName);
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage Operations
// ─────────────────────────────────────────────────────────────────────────────

export async function uploadBlob(params: UploadBlobParams): Promise<UploadBlobResult> {
  const { container, path, contentType, buffer, metadata } = params;
  const uploadedAt = new Date().toISOString();

  if (isAzureConfigured()) {
    console.log(`[azureBlob] Uploading to Azure: ${container}/${path}`);
    try {
      const containerClient = await getContainerClient(container);
      if (containerClient) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const blockBlobClient = (containerClient as any).getBlockBlobClient(path);
        await blockBlobClient.upload(buffer, buffer.length, {
          blobHTTPHeaders: { blobContentType: contentType },
          metadata: metadata || undefined,
        });

        console.log(`[azureBlob] Upload successful: ${path} (${buffer.length} bytes)`);
        return {
          path,
          sizeBytes: buffer.length,
          uploadedAt,
        };
      } else {
        console.error("[azureBlob] Container client is null, falling back to in-memory");
      }
    } catch (error) {
      console.error("[azureBlob] Upload failed, falling back to in-memory:", error);
    }
  } else {
    console.log(`[azureBlob] Azure not configured, using in-memory storage for: ${path}`);
  }

  const key = `${container}/${path}`;
  inMemoryStore.set(key, { buffer, contentType, uploadedAt });
  console.log(`[azureBlob] Stored in memory: ${key}`);

  return {
    path,
    sizeBytes: buffer.length,
    uploadedAt,
  };
}

export async function listBlobs(params: ListBlobsParams): Promise<BlobMetadata[]> {
  const { container, prefix } = params;

  if (isAzureConfigured()) {
    console.log(`[azureBlob] Listing blobs from Azure: ${container}/${prefix}`);
    try {
      const containerClient = await getContainerClient(container);
      if (containerClient) {
        const blobs: BlobMetadata[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const iter = (containerClient as any).listBlobsFlat({ prefix });

        for await (const blob of iter) {
          blobs.push({
            path: blob.name,
            lastModified: blob.properties.lastModified?.toISOString() || "",
            size: blob.properties.contentLength || 0,
            contentType: blob.properties.contentType,
            fileName: extractFileName(blob.name),
          });
        }

        console.log(`[azureBlob] Found ${blobs.length} blobs in Azure with prefix: ${prefix}`);
        return sortBlobsByTimestampDesc(blobs);
      }
    } catch (error) {
      console.error("[azureBlob] List failed, falling back to in-memory:", error);
    }
  }

  console.log(`[azureBlob] Listing blobs from in-memory: ${prefix}`);
  const blobs: BlobMetadata[] = [];
  const keyPrefix = `${container}/${prefix}`;

  for (const [key, value] of inMemoryStore.entries()) {
    if (key.startsWith(keyPrefix)) {
      const path = key.substring(`${container}/`.length);
      blobs.push({
        path,
        lastModified: value.uploadedAt,
        size: value.buffer.length,
        contentType: value.contentType,
        fileName: extractFileName(path),
      });
    }
  }

  console.log(`[azureBlob] Found ${blobs.length} blobs in memory with prefix: ${prefix}`);
  return sortBlobsByTimestampDesc(blobs);
}

export async function downloadBlob(
  container: string,
  path: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (isAzureConfigured()) {
    try {
      const containerClient = await getContainerClient(container);
      if (containerClient) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const blockBlobClient = (containerClient as any).getBlockBlobClient(path);
        const response = await blockBlobClient.download(0);

        const chunks: Buffer[] = [];
        for await (const chunk of response.readableStreamBody) {
          chunks.push(Buffer.from(chunk));
        }

        return {
          buffer: Buffer.concat(chunks),
          contentType: response.contentType || "application/octet-stream",
        };
      }
    } catch (error) {
      console.error("[azureBlob] Download failed, falling back to in-memory:", error);
    }
  }

  const key = `${container}/${path}`;
  const blob = inMemoryStore.get(key);
  if (!blob) return null;

  return {
    buffer: blob.buffer,
    contentType: blob.contentType,
  };
}

export async function deleteBlob(container: string, path: string): Promise<boolean> {
  if (isAzureConfigured()) {
    try {
      const containerClient = await getContainerClient(container);
      if (containerClient) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const blockBlobClient = (containerClient as any).getBlockBlobClient(path);
        await blockBlobClient.delete();
        return true;
      }
    } catch (error) {
      console.error("[azureBlob] Delete failed, falling back to in-memory:", error);
    }
  }

  const key = `${container}/${path}`;
  return inMemoryStore.delete(key);
}

// ─────────────────────────────────────────────────────────────────────────────
// Sorting Helpers
// ─────────────────────────────────────────────────────────────────────────────

function sortBlobsByTimestampDesc(blobs: BlobMetadata[]): BlobMetadata[] {
  return blobs.sort((a, b) => {
    const tsA = parseTimestampFromPath(a.path);
    const tsB = parseTimestampFromPath(b.path);

    if (tsA && tsB) {
      return tsB.getTime() - tsA.getTime();
    }

    return b.lastModified.localeCompare(a.lastModified);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Container Configuration
// ─────────────────────────────────────────────────────────────────────────────

export function getDefaultContainer(): string {
  return process.env.AZURE_STORAGE_CONTAINER || "ipa-private";
}
