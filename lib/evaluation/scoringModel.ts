import "server-only";

// Structured Scoring Model for Proposal Evaluation
//
// This module provides:
// - Structured investment scoring categories
// - Score computation from LLM evaluation output
// - Safe fallback to raw AI score

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const SCORE_WEIGHTS = {
  sectorFit: 25,
  geographyFit: 20,
  stageFit: 15,
  ticketSizeFit: 15,
  // riskAdjustment is -20 to 0 (penalty only)
  riskAdjustmentMax: 0,
  riskAdjustmentMin: -20,
} as const;

// Maximum positive score before risk adjustment (75)
export const MAX_POSITIVE_SCORE =
  SCORE_WEIGHTS.sectorFit +
  SCORE_WEIGHTS.geographyFit +
  SCORE_WEIGHTS.stageFit +
  SCORE_WEIGHTS.ticketSizeFit;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface StructuredScores {
  sectorFit: number; // 0 to 25
  geographyFit: number; // 0 to 20
  stageFit: number; // 0 to 15
  ticketSizeFit: number; // 0 to 15
  riskAdjustment: number; // -20 to 0
}

export interface ScoringInput {
  sectorMatch: "full" | "partial" | "none" | "unknown";
  geographyMatch: "full" | "partial" | "none" | "unknown";
  stageMatch: "full" | "partial" | "none" | "unknown";
  ticketSizeMatch: "full" | "partial" | "none" | "unknown";
  identifiedRisks: string[];
}

/** Evaluation content used to infer scoring signals when LLM does not provide them */
export interface EvaluationContentForInference {
  proposalSummary: string;
  mandateSummary: string;
  strengths: string[];
  risks: string[];
  recommendations: string[];
}

export interface ScoringResult {
  structuredScores: StructuredScores;
  finalScore: number;
  scoringMethod: "structured" | "fallback";
  breakdown: {
    sectorFit: number;
    geographyFit: number;
    stageFit: number;
    ticketSizeFit: number;
    riskAdjustment: number;
    total: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Zod Schema for LLM Structured Scoring Response
// ─────────────────────────────────────────────────────────────────────────────

export const ScoringInputSchema = z.object({
  sectorMatch: z.enum(["full", "partial", "none", "unknown"]),
  geographyMatch: z.enum(["full", "partial", "none", "unknown"]),
  stageMatch: z.enum(["full", "partial", "none", "unknown"]),
  ticketSizeMatch: z.enum(["full", "partial", "none", "unknown"]),
  identifiedRisks: z.array(z.string()),
});

export const StructuredScoresSchema = z.object({
  sectorFit: z.number().min(0).max(25),
  geographyFit: z.number().min(0).max(20),
  stageFit: z.number().min(0).max(15),
  ticketSizeFit: z.number().min(0).max(15),
  riskAdjustment: z.number().min(-20).max(0),
});

export type ScoringInputType = z.infer<typeof ScoringInputSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Score Computation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert match level to score (binary: full = max, else = 0).
 */
function matchToScore(match: "full" | "partial" | "none" | "unknown", maxScore: number): number {
  return match === "full" ? maxScore : 0;
}

/**
 * Calculate risk adjustment based on number and severity of identified risks.
 * More risks = larger penalty.
 */
function calculateRiskAdjustment(risks: string[]): number {
  if (!risks || risks.length === 0) {
    return 0; // No penalty if no risks identified
  }

  // Each risk contributes to the penalty
  // Scale: 1 risk = -3, 2 risks = -6, 3 risks = -9, etc.
  // Cap at -20
  const penalty = Math.min(risks.length * 3, 20);
  return -penalty;
}

/**
 * Compute structured scores from scoring input.
 * Uses binary rules: full match = max points, else = 0.
 */
export function computeStructuredScores(input: ScoringInput): StructuredScores {
  return {
    sectorFit: matchToScore(input.sectorMatch, SCORE_WEIGHTS.sectorFit),
    geographyFit: matchToScore(input.geographyMatch, SCORE_WEIGHTS.geographyFit),
    stageFit: matchToScore(input.stageMatch, SCORE_WEIGHTS.stageFit),
    ticketSizeFit: matchToScore(input.ticketSizeMatch, SCORE_WEIGHTS.ticketSizeFit),
    riskAdjustment: calculateRiskAdjustment(input.identifiedRisks),
  };
}

/**
 * Calculate final score from structured scores.
 * finalScore = sectorFit + geographyFit + stageFit + ticketSizeFit + riskAdjustment
 * Clamped between 0 and 100.
 */
export function calculateFinalScore(scores: StructuredScores): number {
  const rawScore =
    scores.sectorFit +
    scores.geographyFit +
    scores.stageFit +
    scores.ticketSizeFit +
    scores.riskAdjustment;

  return Math.max(0, Math.min(100, rawScore));
}

/**
 * Full scoring computation from input to result.
 */
export function computeScoring(input: ScoringInput): ScoringResult {
  const structuredScores = computeStructuredScores(input);
  const finalScore = calculateFinalScore(structuredScores);

  return {
    structuredScores,
    finalScore,
    scoringMethod: "structured",
    breakdown: {
      sectorFit: structuredScores.sectorFit,
      geographyFit: structuredScores.geographyFit,
      stageFit: structuredScores.stageFit,
      ticketSizeFit: structuredScores.ticketSizeFit,
      riskAdjustment: structuredScores.riskAdjustment,
      total: finalScore,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Signal Inference from Evaluation Content
// ─────────────────────────────────────────────────────────────────────────────

type MatchLevel = "full" | "partial" | "none" | "unknown";

function normalizeForMatch(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ");
}

function textContainsAny(text: string, terms: string[]): boolean {
  const normalized = normalizeForMatch(text);
  return terms.some((t) => normalized.includes(t.toLowerCase()));
}

/**
 * Infer sectorMatch from evaluation content.
 * Full: strengths mention sector alignment.
 * Partial: strengths mention sector but with caveats.
 * None: risks mention sector mismatch.
 */
function inferSectorMatch(content: EvaluationContentForInference): MatchLevel {
  const strengthsText = content.strengths.join(" ").toLowerCase();
  const risksText = content.risks.join(" ").toLowerCase();

  if (
    textContainsAny(strengthsText, [
      "sector alignment",
      "sector fit",
      "industry alignment",
      "sector match",
      "strong sector",
      "sector aligns",
      "mandate sector",
    ])
  ) {
    return "full";
  }
  if (
    textContainsAny(risksText, [
      "sector mismatch",
      "sector misalignment",
      "outside sector",
      "sector concern",
    ])
  ) {
    return "none";
  }
  if (
    textContainsAny(strengthsText, ["sector", "industry", "vertical"]) ||
    textContainsAny(content.proposalSummary, ["sector", "industry"])
  ) {
    return "partial";
  }
  return "unknown";
}

/**
 * Infer geographyMatch from evaluation content.
 * Full: proposal geography matches mandate.
 */
function inferGeographyMatch(content: EvaluationContentForInference): MatchLevel {
  const proposal = normalizeForMatch(content.proposalSummary);
  const mandate = normalizeForMatch(content.mandateSummary);
  const strengthsText = content.strengths.join(" ").toLowerCase();
  const risksText = content.risks.join(" ").toLowerCase();

  const regions = [
    "north america",
    "europe",
    "asia",
    "latin america",
    "emea",
    "apac",
    "us",
    "usa",
    "united states",
    "uk",
    "germany",
    "france",
  ];

  const proposalRegions = regions.filter((r) => proposal.includes(r));
  const mandateRegions = regions.filter((r) => mandate.includes(r));

  if (proposalRegions.length > 0 && mandateRegions.length > 0) {
    const overlap = proposalRegions.some((r) => mandateRegions.includes(r));
    if (overlap) return "full";
  }

  if (
    textContainsAny(strengthsText, [
      "geography",
      "geographic",
      "region",
      "geographic fit",
      "geography match",
    ])
  ) {
    return "full";
  }
  if (
    textContainsAny(risksText, [
      "geography",
      "geographic",
      "region",
      "outside mandate geography",
    ])
  ) {
    return "none";
  }
  return "unknown";
}

/**
 * Infer stageMatch from evaluation content.
 * Full: proposal stage matches mandate.
 */
function inferStageMatch(content: EvaluationContentForInference): MatchLevel {
  const proposal = normalizeForMatch(content.proposalSummary);
  const mandate = normalizeForMatch(content.mandateSummary);
  const strengthsText = content.strengths.join(" ").toLowerCase();
  const risksText = content.risks.join(" ").toLowerCase();

  const stages = [
    "seed",
    "pre-seed",
    "series a",
    "series b",
    "series c",
    "growth",
    "early stage",
    "late stage",
  ];

  const proposalStages = stages.filter((s) => proposal.includes(s));
  const mandateStages = stages.filter((s) => mandate.includes(s));

  if (proposalStages.length > 0 && mandateStages.length > 0) {
    const overlap = proposalStages.some((s) => mandateStages.includes(s));
    if (overlap) return "full";
  }

  if (
    textContainsAny(strengthsText, [
      "stage fit",
      "stage alignment",
      "stage match",
      "investment stage",
    ])
  ) {
    return "full";
  }
  if (
    textContainsAny(risksText, [
      "stage mismatch",
      "stage concern",
      "outside stage",
    ])
  ) {
    return "none";
  }
  return "unknown";
}

/**
 * Infer ticketSizeMatch from evaluation content.
 * Full: ticket size inside mandate range.
 */
function inferTicketSizeMatch(content: EvaluationContentForInference): MatchLevel {
  const strengthsText = content.strengths.join(" ").toLowerCase();
  const risksText = content.risks.join(" ").toLowerCase();

  if (
    textContainsAny(strengthsText, [
      "ticket size",
      "ticket fit",
      "amount within",
      "within range",
      "ticket alignment",
      "funding amount",
      "investment size",
    ])
  ) {
    return "full";
  }
  if (
    textContainsAny(risksText, [
      "ticket size",
      "amount",
      "over ask",
      "under ask",
      "outside range",
    ])
  ) {
    return "partial";
  }
  return "unknown";
}

/**
 * Infer structured signals from evaluation content.
 * Used when LLM does not provide scoringInput.
 */
export function inferSignalsFromEvaluation(
  content: EvaluationContentForInference
): ScoringInput {
  return {
    sectorMatch: inferSectorMatch(content),
    geographyMatch: inferGeographyMatch(content),
    stageMatch: inferStageMatch(content),
    ticketSizeMatch: inferTicketSizeMatch(content),
    identifiedRisks: content.risks || [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Direct Score Computation from Evaluation Content (Simple Rules)
// ─────────────────────────────────────────────────────────────────────────────

/** Phrases that indicate sector alignment when present in strengths */
const SECTOR_ALIGNMENT_PHRASES = [
  "sector alignment",
  "sector fit",
  "industry alignment",
  "sector match",
  "strong sector",
  "sector aligns",
  "mandate sector",
  "sector alignment with mandate",
];

/** Phrases that indicate geography alignment when present in strengths */
const GEOGRAPHY_ALIGNMENT_PHRASES = [
  "geography alignment",
  "geographic fit",
  "geography match",
  "geographic alignment",
  "region",
  "geographic fit with mandate",
];

/** Phrases that indicate stage alignment when present in strengths */
const STAGE_ALIGNMENT_PHRASES = [
  "stage fit",
  "stage alignment",
  "stage match",
  "investment stage",
  "stage aligns",
];

/** Phrases that indicate ticket size alignment when present in strengths */
const TICKET_SIZE_ALIGNMENT_PHRASES = [
  "ticket size",
  "ticket fit",
  "amount within",
  "within range",
  "ticket alignment",
  "funding amount",
  "investment size",
  "ticket size alignment",
];

function strengthsMentionAlignment(strengths: string[], phrases: string[]): boolean {
  const strengthsText = strengths.join(" ").toLowerCase();
  return phrases.some((p) => strengthsText.includes(p.toLowerCase()));
}

/**
 * Compute structured scores directly from evaluation content using simple rules.
 * - sectorFit = 25 if strengths mention sector alignment, else 0
 * - geographyFit = 20 if strengths mention geography alignment, else 0
 * - stageFit = 15 if strengths mention stage alignment, else 0
 * - ticketSizeFit = 15 if strengths mention ticket size alignment, else 0
 * - riskAdjustment = subtract points based on number/severity of risks (-20 to 0)
 */
export function computeScoresFromEvaluationContent(
  content: EvaluationContentForInference
): StructuredScores {
  const strengths = content.strengths || [];
  const risks = content.risks || [];

  return {
    sectorFit: strengthsMentionAlignment(strengths, SECTOR_ALIGNMENT_PHRASES)
      ? SCORE_WEIGHTS.sectorFit
      : 0,
    geographyFit: strengthsMentionAlignment(strengths, GEOGRAPHY_ALIGNMENT_PHRASES)
      ? SCORE_WEIGHTS.geographyFit
      : 0,
    stageFit: strengthsMentionAlignment(strengths, STAGE_ALIGNMENT_PHRASES)
      ? SCORE_WEIGHTS.stageFit
      : 0,
    ticketSizeFit: strengthsMentionAlignment(strengths, TICKET_SIZE_ALIGNMENT_PHRASES)
      ? SCORE_WEIGHTS.ticketSizeFit
      : 0,
    riskAdjustment: calculateRiskAdjustment(risks),
  };
}

/**
 * Compute full scoring result from evaluation content using simple rules.
 */
export function computeScoringFromEvaluationContent(
  content: EvaluationContentForInference
): ScoringResult {
  const structuredScores = computeScoresFromEvaluationContent(content);
  const finalScore = calculateFinalScore(structuredScores);

  return {
    structuredScores,
    finalScore,
    scoringMethod: "structured",
    breakdown: {
      sectorFit: structuredScores.sectorFit,
      geographyFit: structuredScores.geographyFit,
      stageFit: structuredScores.stageFit,
      ticketSizeFit: structuredScores.ticketSizeFit,
      riskAdjustment: structuredScores.riskAdjustment,
      total: finalScore,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Safe Parsing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse scoring input from LLM response.
 * Returns null if parsing fails.
 */
export function parseScoringInput(data: unknown): ScoringInput | null {
  const result = ScoringInputSchema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  console.warn("[scoringModel] Failed to parse scoring input:", result.error);
  return null;
}

/**
 * Validate structured scores.
 */
export function validateStructuredScores(data: unknown): StructuredScores | null {
  const result = StructuredScoresSchema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback Scoring
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a fallback scoring result from a raw AI score.
 * Used when structured scoring fails or is not available.
 */
export function createFallbackScoring(rawScore: number): ScoringResult {
  // Distribute the raw score proportionally across categories
  const normalizedScore = Math.max(0, Math.min(100, rawScore));
  const proportion = normalizedScore / 100;

  const structuredScores: StructuredScores = {
    sectorFit: Math.round(proportion * SCORE_WEIGHTS.sectorFit),
    geographyFit: Math.round(proportion * SCORE_WEIGHTS.geographyFit),
    stageFit: Math.round(proportion * SCORE_WEIGHTS.stageFit),
    ticketSizeFit: Math.round(proportion * SCORE_WEIGHTS.ticketSizeFit),
    riskAdjustment: 0, // No risk data available in fallback
  };

  return {
    structuredScores,
    finalScore: normalizedScore,
    scoringMethod: "fallback",
    breakdown: {
      sectorFit: structuredScores.sectorFit,
      geographyFit: structuredScores.geographyFit,
      stageFit: structuredScores.stageFit,
      ticketSizeFit: structuredScores.ticketSizeFit,
      riskAdjustment: 0,
      total: normalizedScore,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Safe Scoring Computation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute scoring safely, falling back to raw score if structured scoring fails.
 *
 * Priority:
 * 1. Use LLM-provided scoringInput if valid
 * 2. Compute from evaluation content using simple rules (strengths-based) if provided
 * 3. Fall back to raw AI score
 *
 * @param scoringInput - Parsed scoring input from LLM (may be null)
 * @param rawScore - Raw AI score to use as fallback
 * @param evaluationContent - Optional evaluation content for direct score computation when scoringInput is null
 * @returns Scoring result with structured scores
 */
export function computeScoringSafe(
  scoringInput: ScoringInput | null,
  rawScore: number,
  evaluationContent?: EvaluationContentForInference
): ScoringResult {
  // 1. Try LLM-provided scoring input
  if (scoringInput) {
    try {
      const result = computeScoring(scoringInput);
      console.log(
        `[scoringModel] Structured scoring (LLM): finalScore=${result.finalScore}, method=${result.scoringMethod}`
      );
      return result;
    } catch (error) {
      console.error("[scoringModel] LLM scoring failed:", error);
    }
  }

  // 2. Compute from evaluation content using simple rules (strengths mention alignment → full points)
  if (evaluationContent) {
    try {
      const result = computeScoringFromEvaluationContent(evaluationContent);
      console.log(
        `[scoringModel] Structured scoring (evaluation content): finalScore=${result.finalScore}, method=${result.scoringMethod}`
      );
      return result;
    } catch (error) {
      console.error("[scoringModel] Evaluation content scoring failed:", error);
    }
  }

  // 3. Fall back to raw AI score
  console.log(
    `[scoringModel] Using fallback scoring from raw AI score: ${rawScore}`
  );
  return createFallbackScoring(rawScore);
}

// ─────────────────────────────────────────────────────────────────────────────
// Score Display Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get display information for a scoring category.
 */
export function getScoreCategoryInfo(category: keyof StructuredScores): {
  label: string;
  maxScore: number;
  description: string;
} {
  switch (category) {
    case "sectorFit":
      return {
        label: "Sector Fit",
        maxScore: SCORE_WEIGHTS.sectorFit,
        description: "How well the proposal's sector matches mandate criteria",
      };
    case "geographyFit":
      return {
        label: "Geography Fit",
        maxScore: SCORE_WEIGHTS.geographyFit,
        description: "Geographic alignment with mandate requirements",
      };
    case "stageFit":
      return {
        label: "Stage Fit",
        maxScore: SCORE_WEIGHTS.stageFit,
        description: "Investment stage alignment (seed, series A, etc.)",
      };
    case "ticketSizeFit":
      return {
        label: "Ticket Size Fit",
        maxScore: SCORE_WEIGHTS.ticketSizeFit,
        description: "Investment amount alignment with mandate range",
      };
    case "riskAdjustment":
      return {
        label: "Risk Adjustment",
        maxScore: 0, // Max is 0 (best case)
        description: "Penalty for identified risks (-20 to 0)",
      };
    default:
      return {
        label: category,
        maxScore: 0,
        description: "",
      };
  }
}
