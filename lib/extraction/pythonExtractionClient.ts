import "server-only";

// Python Extraction Client
//
// Calls the Python extractor service (Azure Container App or local) for document text extraction.
// The Python service provides better extraction quality for PDF and DOCX files.
// Falls back to Node.js extraction if the Python service is unavailable or not configured.

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PythonExtractionParams {
  connectionString: string;
  container: string;
  blobPath: string;
  fileType: string;
}

export interface PythonExtractionResult {
  success: boolean;
  text: string;
  error?: string;
  charactersProcessed: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

function getPythonExtractorUrl(): string | null {
  return process.env.PYTHON_EXTRACTOR_URL || null;
}

const PYTHON_EXTRACTOR_TIMEOUT_MS = parseInt(
  process.env.PYTHON_EXTRACTOR_TIMEOUT_MS || "30000",
  10
);

// ─────────────────────────────────────────────────────────────────────────────
// Python Extraction Function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts text from a document using the Python extractor service.
 *
 * @param params - Parameters for extraction including blob path and file type
 * @returns Extraction result with text content or error details
 */
export async function extractDocumentViaPython(params: {
  connectionString: string;
  container: string;
  blobPath: string;
  fileType: string;
}): Promise<PythonExtractionResult> {
  const { connectionString, container, blobPath, fileType } = params;

  const baseUrl = getPythonExtractorUrl();

  if (!baseUrl) {
    console.warn(
      "[pythonExtractionClient] PYTHON_EXTRACTOR_URL not configured, fallback will be used"
    );
    return {
      success: false,
      text: "",
      error: "Python extractor URL not configured, fallback used",
      charactersProcessed: 0,
    };
  }

  const extractUrl = `${baseUrl}/extract`;

  // Debug logging before fetch
  console.log(`[pythonExtractor] baseUrl=${baseUrl}`);
  console.log(`[pythonExtractor] request blobPath=${blobPath}`);
  console.log(`[pythonExtractor] request fileType=${fileType}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PYTHON_EXTRACTOR_TIMEOUT_MS);

  try {
    const response = await fetch(extractUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        connectionString,
        container,
        blobPath,
        fileType,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Debug logging after fetch
    console.log(`[pythonExtractor] response status=${response.status}`);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error(`[pythonExtractor] response body (error): ${errorText}`);
      console.error(
        `[pythonExtractionClient] Python extractor returned ${response.status}: ${errorText}`
      );
      return {
        success: false,
        text: "",
        error: `Python extractor HTTP ${response.status}: ${errorText}`,
        charactersProcessed: 0,
      };
    }

    const data = await response.json();

    if (data.error) {
      console.error(`[pythonExtractionClient] Python extractor error: ${data.error}`);
      return {
        success: false,
        text: "",
        error: data.error,
        charactersProcessed: 0,
      };
    }

    const text = data.text || "";
    console.log(
      `[pythonExtractionClient] Successfully extracted ${text.length} characters from: ${blobPath}`
    );

    return {
      success: true,
      text,
      charactersProcessed: text.length,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      console.error(
        `[pythonExtractionClient] Python extractor timed out after ${PYTHON_EXTRACTOR_TIMEOUT_MS}ms for: ${blobPath}`
      );
      return {
        success: false,
        text: "",
        error: `Python extractor timed out after ${PYTHON_EXTRACTOR_TIMEOUT_MS}ms`,
        charactersProcessed: 0,
      };
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[pythonExtractionClient] Python extractor failed: ${errorMessage}`);

    return {
      success: false,
      text: "",
      error: `Python extractor connection failed: ${errorMessage}`,
      charactersProcessed: 0,
    };
  }
}

/**
 * Checks if the Python extractor service is configured.
 * Returns true if PYTHON_EXTRACTOR_URL environment variable is set.
 */
export function isPythonExtractorConfigured(): boolean {
  return !!getPythonExtractorUrl();
}

/**
 * Checks if the Python extractor service is available.
 * Can be used for health checks or to decide whether to attempt Python extraction.
 */
export async function isPythonExtractorAvailable(): Promise<boolean> {
  const baseUrl = getPythonExtractorUrl();

  if (!baseUrl) {
    return false;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${baseUrl}/health`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    clearTimeout(timeoutId);
    return false;
  }
}
