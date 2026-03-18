import "server-only";

// NEW: Evaluation Types with Zod Validation
// Defines the structure of LLM evaluation reports

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Zod Schemas
// ─────────────────────────────────────────────────────────────────────────────

// Scoring input from LLM for structured scoring
export const ScoringInputSchema = z.object({
  sectorMatch: z.enum(["full", "partial", "none", "unknown"]),
  geographyMatch: z.enum(["full", "partial", "none", "unknown"]),
  stageMatch: z.enum(["full", "partial", "none", "unknown"]),
  ticketSizeMatch: z.enum(["full", "partial", "none", "unknown"]),
  identifiedRisks: z.array(z.string()),
});

// Structured scores computed from scoring input
export const StructuredScoresSchema = z.object({
  sectorFit: z.number().min(0).max(25),
  geographyFit: z.number().min(0).max(20),
  stageFit: z.number().min(0).max(15),
  ticketSizeFit: z.number().min(0).max(15),
  riskAdjustment: z.number().min(-20).max(0),
});

// NEW: Schema for LLM response validation (includes scoring input)
export const LLMEvaluationResponseSchema = z.object({
  fitScore: z.number().min(0).max(100),
  mandateSummary: z.string().min(1),
  proposalSummary: z.string().min(1),
  strengths: z.array(z.string()).min(1).max(10),
  risks: z.array(z.string()).min(1).max(10),
  recommendations: z.array(z.string()).min(1).max(10),
  confidence: z.enum(["low", "medium", "high"]),
  // Structured scoring input (optional for backward compatibility)
  scoringInput: ScoringInputSchema.optional(),
});

// NEW: Full evaluation report schema (includes metadata)
export const EvaluationReportSchema = z.object({
  evaluationId: z.string(),
  proposalId: z.string(),
  tenantId: z.string(),
  evaluatedAt: z.string(),
  evaluatedByUserId: z.string(),
  evaluatedByEmail: z.string(),

  inputs: z.object({
    proposalDocuments: z.number(),
    mandateTemplates: z.number(),
    mandateKey: z.string().nullable(),
    totalCharactersProcessed: z.number(),
    extractionWarnings: z.array(z.string()),
    // Document processing stats (optional for backwards compatibility)
    processedDocumentsCount: z.number().optional(),
    truncatedDocumentsCount: z.number().optional(),
    skippedDocumentsCount: z.number().optional(),
    // Chunk-based processing stats (optional for backwards compatibility)
    proposalChunksUsed: z.number().optional(),
    mandateChunksUsed: z.number().optional(),
    // Relevance matching metadata (optional for backwards compatibility)
    matchedPairsCount: z.number().optional(),
    relevanceMethod: z.string().optional(),
    // RAG matching metadata (optional for backwards compatibility)
    matchedSectionsCount: z.number().optional(),
    topMandateSectionsPreview: z.string().optional(),
  }),

  fitScore: z.number().min(0).max(100).nullable(),
  mandateSummary: z.string(),
  proposalSummary: z.string(),
  strengths: z.array(z.string()),
  risks: z.array(z.string()),
  recommendations: z.array(z.string()),
  confidence: z.enum(["low", "medium", "high"]),

  // Structured scoring (optional for backward compatibility)
  structuredScores: StructuredScoresSchema.optional(),
  scoringMethod: z.enum(["structured", "fallback"]).optional(),

  model: z.string(),
  version: z.string(),
  engineType: z.enum(["stub", "llm", "azure-openai"]),

  // Proposal Validation (optional - runs before fund evaluation)
  validationSummary: z
    .object({
      validationScore: z.number().min(0).max(100),
      step: z.string(),
      heuristic: z.object({
        signals: z.object({
          hasRevenue: z.boolean(),
          hasForecast: z.boolean(),
          hasForecast12m: z.boolean(),
          hasForecast24m: z.boolean(),
          hasForecast48m: z.boolean(),
          stage: z.enum(["pre-revenue", "revenue", "growth", "unknown"]),
          hasIP: z.boolean(),
          hasCompetitors: z.boolean(),
        }),
        heuristicScoreAfterPenalties: z.number(),
        penalties: z.array(z.string()),
      }),
      llm: z
        .object({
          stage: z.enum(["pre-revenue", "revenue", "growth", "unknown"]),
          businessModelClarity: z.enum(["clear", "partial", "unclear", "unknown"]),
          competitorPresence: z.enum(["identified", "mentioned", "none", "unknown"]),
        })
        .optional(),
      warnings: z.array(z.string()),
    })
    .optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// TypeScript Types (inferred from Zod)
// ─────────────────────────────────────────────────────────────────────────────

export type LLMEvaluationResponse = z.infer<typeof LLMEvaluationResponseSchema>;
export type EvaluationReport = z.infer<typeof EvaluationReportSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Validation Helpers
// ─────────────────────────────────────────────────────────────────────────────

// NEW: Validate LLM response with detailed error
export function validateLLMResponse(data: unknown): {
  success: boolean;
  data?: LLMEvaluationResponse;
  error?: string;
} {
  const result = LLMEvaluationResponseSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    error: result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "),
  };
}

// NEW: Validate full evaluation report
export function validateEvaluationReport(data: unknown): {
  success: boolean;
  data?: EvaluationReport;
  error?: string;
} {
  const result = EvaluationReportSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    error: result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

// NEW: Maximum total characters to send to LLM
export const MAX_TOTAL_CHARS = 20000;

// NEW: Maximum characters per document
export const MAX_CHARS_PER_DOC = 8000;

// Supported plain text extraction file types (read directly as UTF-8)
export const TEXT_EXTRACTABLE_TYPES = [
  "text/plain",
  "text/csv",
];

// Supported binary extraction file types (PDF, DOCX)
export const BINARY_EXTRACTABLE_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// Legacy .doc format - not supported for extraction
export const UNSUPPORTED_LEGACY_TYPES = [
  "application/msword",
];
