import "server-only";

// Document Chunking for Proposal Evaluation
//
// This module provides:
// - Text chunking with paragraph and sentence boundary preservation
// - Chunk-based input preparation with budget management
// - Prioritization of document chunks (newest documents first)
// - Detailed tracking of chunk usage for evaluation metadata

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const TARGET_CHUNK_SIZE = 2000;
export const MAX_CHUNK_SIZE = 2500;
export const DEFAULT_TOTAL_BUDGET = 20000;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface DocumentChunk {
  id: string;
  text: string;
  documentFilename: string;
  documentIndex: number;
  chunkIndex: number;
  charStart: number;
  charEnd: number;
  uploadedAt: string;
}

export interface ChunkedDocument {
  filename: string;
  uploadedAt: string;
  totalChunks: number;
  totalChars: number;
  chunks: DocumentChunk[];
  isPlaceholder: boolean;
  warning?: string;
}

export interface ChunkingStats {
  totalDocuments: number;
  documentsWithChunks: number;
  totalChunks: number;
  totalChars: number;
  skippedDocuments: number;
}

export interface ChunkBudgetResult {
  selectedChunks: DocumentChunk[];
  usedChars: number;
  proposalChunksUsed: number;
  mandateChunksUsed: number;
  processedDocumentsCount: number;
  truncatedDocumentsCount: number;
  skippedDocumentsCount: number;
  warnings: string[];
}

export interface DocumentInput {
  filename: string;
  blobPath: string;
  text: string;
  uploadedAt: string;
  isPlaceholder: boolean;
  warning?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Text Splitting Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Split text into paragraphs, preserving empty line boundaries.
 */
function splitIntoParagraphs(text: string): string[] {
  return text.split(/\n\n+/).map((p) => p.trim()).filter((p) => p.length > 0);
}

/**
 * Split a paragraph into sentences.
 * Uses regex to detect sentence boundaries (period, exclamation, question mark followed by space).
 */
function splitIntoSentences(text: string): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  return sentences.map((s) => s.trim()).filter((s) => s.length > 0);
}

/**
 * Split text into chunks of approximately targetSize characters.
 * Preserves paragraph boundaries when possible.
 * Falls back to sentence boundaries for large paragraphs.
 * Forces split at maxSize if sentences are too long.
 *
 * @param text The text to split
 * @param targetSize Target chunk size (default 2000)
 * @param maxSize Maximum chunk size (default 2500)
 * @returns Array of text chunks
 */
export function splitTextIntoChunks(
  text: string,
  targetSize: number = TARGET_CHUNK_SIZE,
  maxSize: number = MAX_CHUNK_SIZE
): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const chunks: string[] = [];
  const paragraphs = splitIntoParagraphs(text);

  let currentChunk = "";

  for (const paragraph of paragraphs) {
    // If paragraph fits in current chunk within target
    if (currentChunk.length + paragraph.length + 2 <= targetSize) {
      currentChunk = currentChunk
        ? currentChunk + "\n\n" + paragraph
        : paragraph;
      continue;
    }

    // Current chunk is at target, save it and start new one
    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = "";
    }

    // If paragraph alone exceeds maxSize, split by sentences
    if (paragraph.length > maxSize) {
      const sentenceChunks = splitLargeParagraphBySentences(
        paragraph,
        targetSize,
        maxSize
      );
      chunks.push(...sentenceChunks);
    } else if (paragraph.length > targetSize) {
      // Paragraph is between target and max, try to combine with next
      // or just add as its own chunk
      currentChunk = paragraph;
    } else {
      currentChunk = paragraph;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Split a large paragraph by sentence boundaries.
 * Used when a single paragraph exceeds maxSize.
 */
function splitLargeParagraphBySentences(
  paragraph: string,
  targetSize: number,
  maxSize: number
): string[] {
  const chunks: string[] = [];
  const sentences = splitIntoSentences(paragraph);

  let currentChunk = "";

  for (const sentence of sentences) {
    // If sentence fits in current chunk
    if (currentChunk.length + sentence.length + 1 <= targetSize) {
      currentChunk = currentChunk ? currentChunk + " " + sentence : sentence;
      continue;
    }

    // Save current chunk if it has content
    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = "";
    }

    // If single sentence exceeds maxSize, force split
    if (sentence.length > maxSize) {
      const forcedChunks = forceSplitText(sentence, maxSize);
      chunks.push(...forcedChunks);
    } else {
      currentChunk = sentence;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Force split text at word boundaries, staying within maxSize.
 * Last resort when sentences are too long.
 */
function forceSplitText(text: string, maxSize: number): string[] {
  const chunks: string[] = [];
  const words = text.split(/\s+/);

  let currentChunk = "";

  for (const word of words) {
    if (currentChunk.length + word.length + 1 <= maxSize) {
      currentChunk = currentChunk ? currentChunk + " " + word : word;
    } else {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
      }
      // If single word exceeds maxSize, force character split
      if (word.length > maxSize) {
        for (let i = 0; i < word.length; i += maxSize) {
          chunks.push(word.slice(i, i + maxSize));
        }
        currentChunk = "";
      } else {
        currentChunk = word;
      }
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

// ─────────────────────────────────────────────────────────────────────────────
// Document Chunking
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Chunk a single document into DocumentChunk objects.
 */
export function chunkDocument(
  doc: DocumentInput,
  documentIndex: number,
  targetSize: number = TARGET_CHUNK_SIZE,
  maxSize: number = MAX_CHUNK_SIZE
): ChunkedDocument {
  if (doc.isPlaceholder || !doc.text || doc.text.trim().length === 0) {
    return {
      filename: doc.filename,
      uploadedAt: doc.uploadedAt,
      totalChunks: 0,
      totalChars: 0,
      chunks: [],
      isPlaceholder: doc.isPlaceholder,
      warning: doc.warning,
    };
  }

  const textChunks = splitTextIntoChunks(doc.text, targetSize, maxSize);
  let charOffset = 0;

  const chunks: DocumentChunk[] = textChunks.map((chunkText, idx) => {
    const chunk: DocumentChunk = {
      id: `doc${documentIndex}-chunk${idx}`,
      text: chunkText,
      documentFilename: doc.filename,
      documentIndex,
      chunkIndex: idx,
      charStart: charOffset,
      charEnd: charOffset + chunkText.length,
      uploadedAt: doc.uploadedAt,
    };
    charOffset += chunkText.length;
    return chunk;
  });

  return {
    filename: doc.filename,
    uploadedAt: doc.uploadedAt,
    totalChunks: chunks.length,
    totalChars: doc.text.length,
    chunks,
    isPlaceholder: false,
    warning: doc.warning,
  };
}

/**
 * Chunk multiple documents, sorted by newest upload first.
 */
export function chunkDocuments(
  documents: DocumentInput[],
  targetSize: number = TARGET_CHUNK_SIZE,
  maxSize: number = MAX_CHUNK_SIZE
): { chunkedDocs: ChunkedDocument[]; stats: ChunkingStats } {
  // Sort by newest upload first
  const sortedDocs = [...documents].sort((a, b) => {
    const dateA = new Date(a.uploadedAt).getTime() || 0;
    const dateB = new Date(b.uploadedAt).getTime() || 0;
    return dateB - dateA;
  });

  const chunkedDocs: ChunkedDocument[] = [];
  let totalChunks = 0;
  let totalChars = 0;
  let documentsWithChunks = 0;
  let skippedDocuments = 0;

  sortedDocs.forEach((doc, idx) => {
    const chunked = chunkDocument(doc, idx, targetSize, maxSize);
    chunkedDocs.push(chunked);

    if (chunked.chunks.length > 0) {
      documentsWithChunks++;
      totalChunks += chunked.totalChunks;
      totalChars += chunked.totalChars;
    } else if (chunked.isPlaceholder) {
      skippedDocuments++;
    }
  });

  return {
    chunkedDocs,
    stats: {
      totalDocuments: documents.length,
      documentsWithChunks,
      totalChunks,
      totalChars,
      skippedDocuments,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Budget-Based Chunk Selection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Select chunks within a character budget.
 * Prioritizes documents by upload date (newest first), then chunks in order.
 *
 * @param chunkedDocs Array of chunked documents
 * @param budget Maximum characters to include
 * @param source Label for warnings ("proposal" or "mandate")
 * @returns Selected chunks and metadata
 */
export function selectChunksWithinBudget(
  chunkedDocs: ChunkedDocument[],
  budget: number,
  source: "proposal" | "mandate"
): {
  selectedChunks: DocumentChunk[];
  usedChars: number;
  processedDocs: number;
  truncatedDocs: number;
  skippedDocs: number;
  warnings: string[];
} {
  const selectedChunks: DocumentChunk[] = [];
  const warnings: string[] = [];
  let usedChars = 0;
  let processedDocs = 0;
  let truncatedDocs = 0;
  let skippedDocs = 0;

  for (const doc of chunkedDocs) {
    // Handle placeholder documents
    if (doc.isPlaceholder || doc.chunks.length === 0) {
      if (doc.isPlaceholder) {
        skippedDocs++;
        if (doc.warning) {
          warnings.push(doc.warning);
        }
      }
      continue;
    }

    // Check if we have any budget left
    if (usedChars >= budget) {
      skippedDocs++;
      warnings.push(
        `Document chunk budget reached, skipped remaining chunks from ${doc.filename}`
      );
      continue;
    }

    // Add chunks from this document within remaining budget
    let docChunksAdded = 0;
    let docFullyProcessed = true;

    for (const chunk of doc.chunks) {
      if (usedChars + chunk.text.length <= budget) {
        selectedChunks.push(chunk);
        usedChars += chunk.text.length;
        docChunksAdded++;
      } else {
        docFullyProcessed = false;
        break;
      }
    }

    if (docChunksAdded > 0) {
      if (docFullyProcessed) {
        processedDocs++;
      } else {
        truncatedDocs++;
        warnings.push(
          `[${source.charAt(0).toUpperCase() + source.slice(1)}] ${doc.filename} partially included (${docChunksAdded}/${doc.totalChunks} chunks)`
        );
      }
    } else {
      skippedDocs++;
    }
  }

  return {
    selectedChunks,
    usedChars,
    processedDocs,
    truncatedDocs,
    skippedDocs,
    warnings,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Combined Evaluation Input Preparation
// ─────────────────────────────────────────────────────────────────────────────

export interface ChunkedEvaluationInput {
  mandateText: string;
  proposalText: string;
  mandateChunksUsed: number;
  proposalChunksUsed: number;
  processedDocumentsCount: number;
  truncatedDocumentsCount: number;
  skippedDocumentsCount: number;
  totalCharacters: number;
  warnings: string[];
}

/**
 * Prepare chunked evaluation input from mandate and proposal documents.
 * Uses 40/60 budget split (mandate/proposal).
 *
 * @param mandateDocs Mandate template documents
 * @param proposalDocs Proposal documents
 * @param totalBudget Total character budget
 * @returns Combined text and metadata for evaluation
 */
export function prepareChunkedEvaluationInput(
  mandateDocs: DocumentInput[],
  proposalDocs: DocumentInput[],
  totalBudget: number = DEFAULT_TOTAL_BUDGET
): ChunkedEvaluationInput {
  console.log(
    `[chunking] Starting chunk-based input preparation: ${mandateDocs.length} mandate doc(s), ${proposalDocs.length} proposal doc(s), budget=${totalBudget}`
  );

  // Split budget: 40% mandate, 60% proposal
  const mandateBudget = Math.floor(totalBudget * 0.4);
  const proposalBudget = totalBudget - mandateBudget;

  // Chunk mandate documents
  const { chunkedDocs: mandateChunked, stats: mandateStats } =
    chunkDocuments(mandateDocs);
  console.log(
    `[chunking] Mandate chunking: ${mandateStats.totalChunks} chunks from ${mandateStats.documentsWithChunks} doc(s), ${mandateStats.totalChars} total chars`
  );

  // Chunk proposal documents
  const { chunkedDocs: proposalChunked, stats: proposalStats } =
    chunkDocuments(proposalDocs);
  console.log(
    `[chunking] Proposal chunking: ${proposalStats.totalChunks} chunks from ${proposalStats.documentsWithChunks} doc(s), ${proposalStats.totalChars} total chars`
  );

  // Select chunks within budget
  const mandateSelection = selectChunksWithinBudget(
    mandateChunked,
    mandateBudget,
    "mandate"
  );
  const proposalSelection = selectChunksWithinBudget(
    proposalChunked,
    proposalBudget,
    "proposal"
  );

  // Build combined text from selected chunks
  const mandateText = buildCombinedText(mandateSelection.selectedChunks);
  const proposalText = buildCombinedText(proposalSelection.selectedChunks);

  // Combine warnings
  const allWarnings = [
    ...mandateSelection.warnings,
    ...proposalSelection.warnings,
  ];

  // Calculate totals
  const totalChars = mandateSelection.usedChars + proposalSelection.usedChars;

  console.log(
    `[chunking] Input preparation complete: mandate=${mandateSelection.selectedChunks.length} chunks (${mandateSelection.usedChars} chars), proposal=${proposalSelection.selectedChunks.length} chunks (${proposalSelection.usedChars} chars), total=${totalChars} chars`
  );

  return {
    mandateText,
    proposalText,
    mandateChunksUsed: mandateSelection.selectedChunks.length,
    proposalChunksUsed: proposalSelection.selectedChunks.length,
    processedDocumentsCount:
      mandateSelection.processedDocs + proposalSelection.processedDocs,
    truncatedDocumentsCount:
      mandateSelection.truncatedDocs + proposalSelection.truncatedDocs,
    skippedDocumentsCount:
      mandateSelection.skippedDocs + proposalSelection.skippedDocs,
    totalCharacters: totalChars,
    warnings: allWarnings,
  };
}

/**
 * Build combined text from selected chunks.
 * Groups chunks by document with clear separators.
 */
function buildCombinedText(chunks: DocumentChunk[]): string {
  if (chunks.length === 0) {
    return "";
  }

  // Group chunks by document
  const docGroups = new Map<string, DocumentChunk[]>();
  for (const chunk of chunks) {
    const existing = docGroups.get(chunk.documentFilename);
    if (existing) {
      existing.push(chunk);
    } else {
      docGroups.set(chunk.documentFilename, [chunk]);
    }
  }

  // Build text with document separators
  const parts: string[] = [];
  for (const [filename, docChunks] of docGroups) {
    const docText = docChunks.map((c) => c.text).join("\n\n");
    parts.push(`--- ${filename} ---\n${docText}`);
  }

  return parts.join("\n\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// Safe Fallback Wrapper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Safe wrapper for chunked evaluation input preparation.
 * Falls back to simple truncation if chunking fails.
 *
 * @param mandateDocs Mandate template documents
 * @param proposalDocs Proposal documents
 * @param totalBudget Total character budget
 * @returns Combined text and metadata for evaluation
 */
export function prepareChunkedEvaluationInputSafe(
  mandateDocs: DocumentInput[],
  proposalDocs: DocumentInput[],
  totalBudget: number = DEFAULT_TOTAL_BUDGET
): ChunkedEvaluationInput {
  try {
    return prepareChunkedEvaluationInput(mandateDocs, proposalDocs, totalBudget);
  } catch (error) {
    console.error("[chunking] Chunking failed, using fallback:", error);

    // Fallback: simple concatenation with truncation
    const mandateBudget = Math.floor(totalBudget * 0.4);
    const proposalBudget = totalBudget - mandateBudget;

    const mandateText = mandateDocs
      .filter((d) => !d.isPlaceholder && d.text)
      .map((d) => `--- ${d.filename} ---\n${d.text}`)
      .join("\n\n")
      .substring(0, mandateBudget);

    const proposalText = proposalDocs
      .filter((d) => !d.isPlaceholder && d.text)
      .map((d) => `--- ${d.filename} ---\n${d.text}`)
      .join("\n\n")
      .substring(0, proposalBudget);

    return {
      mandateText,
      proposalText,
      mandateChunksUsed: 0,
      proposalChunksUsed: 0,
      processedDocumentsCount: mandateDocs.length + proposalDocs.length,
      truncatedDocumentsCount: 0,
      skippedDocumentsCount: 0,
      totalCharacters: mandateText.length + proposalText.length,
      warnings: [
        `Chunking failed, used fallback text slicing: ${error instanceof Error ? error.message : "Unknown error"}`,
      ],
    };
  }
}
