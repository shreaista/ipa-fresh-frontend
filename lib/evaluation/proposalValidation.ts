import "server-only";

// Proposal Validation Engine
//
// Runs BEFORE fund mandate evaluation. Uses heuristic rules and LLM analysis
// to validate proposal completeness and quality independently.
//
// Detects: revenue, forecast, stage, IP, competitors
// Heuristic scoring: penalties for low revenue, missing forecast, no IP
// LLM extraction: stage, business model clarity, competitor presence
// validation_score = heuristic + LLM signals (0-100)

import {
  runValidationExtractionWithProvider,
  isLLMConfigured,
} from "@/lib/llm/validationClient";
import type { ProposalStage, ValidationLLMResult } from "./validationTypes";

export type { ProposalStage, ValidationLLMResult };

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface HeuristicSignals {
  hasRevenue: boolean;
  revenueValue?: number; // past 12 months, in USD
  hasForecast12m: boolean;
  hasForecast24m: boolean;
  hasForecast48m: boolean;
  hasForecast: boolean;
  stage: ProposalStage;
  hasIP: boolean;
  hasCompetitors: boolean;
}

export interface ValidationHeuristicResult {
  signals: HeuristicSignals;
  heuristicScore: number; // 0-100 before penalties
  penalties: string[];
  heuristicScoreAfterPenalties: number;
}


export interface ValidationSummary {
  validationScore: number; // 0-100 combined
  heuristic: ValidationHeuristicResult;
  llm?: ValidationLLMResult;
  step: "Validate Proposal";
  warnings: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Heuristic Detection
// ─────────────────────────────────────────────────────────────────────────────

const REVENUE_PATTERNS = [
  /revenue\s*(?:of|:)?\s*\$?([\d,]+(?:\.\d+)?)\s*(?:k|m|million|mm)?/i,
  /(?:past|last|trailing)\s*12\s*months?\s*(?:revenue|revenues?)\s*(?:of|:)?\s*\$?([\d,]+(?:\.\d+)?)\s*(?:k|m|million|mm)?/i,
  /(?:annual|yearly)\s*revenue\s*(?:of|:)?\s*\$?([\d,]+(?:\.\d+)?)\s*(?:k|m|million|mm)?/i,
  /\$([\d,]+(?:\.\d+)?)\s*(?:k|m|million|mm)\s*(?:in\s*)?(?:revenue|revenues?)/i,
  /revenue\s*[\$€£]?\s*([\d,]+(?:\.\d+)?)\s*(?:k|m|mm)/i,
];

const FORECAST_PATTERNS = {
  m12: [
    /12\s*month[s]?\s*(?:forecast|projection|revenue)/i,
    /(?:forecast|projection)\s*(?:for\s*)?(?:next\s*)?12\s*month[s]?/i,
    /year\s*1\s*(?:forecast|projection)/i,
    /(?:next|current)\s*fiscal\s*year/i,
  ],
  m24: [
    /24\s*month[s]?\s*(?:forecast|projection|revenue)/i,
    /(?:forecast|projection)\s*(?:for\s*)?(?:next\s*)?24\s*month[s]?/i,
    /year\s*2\s*(?:forecast|projection)/i,
    /2\s*year[s]?\s*(?:forecast|projection)/i,
  ],
  m48: [
    /48\s*month[s]?\s*(?:forecast|projection|revenue)/i,
    /(?:forecast|projection)\s*(?:for\s*)?(?:next\s*)?48\s*month[s]?/i,
    /year\s*4\s*(?:forecast|projection)/i,
    /4\s*year[s]?\s*(?:forecast|projection)/i,
  ],
};

const STAGE_PATTERNS = {
  "pre-revenue": [
    /pre-revenue/i,
    /pre\s*revenue/i,
    /no\s*revenue/i,
    /pre-seed/i,
    /seed\s*stage/i,
    /concept\s*stage/i,
    /idea\s*stage/i,
  ],
  revenue: [
    /revenue\s*generating/i,
    /generating\s*revenue/i,
    /early\s*revenue/i,
    /series\s*a/i,
    /series\s*b/i,
    /growth\s*stage/i,
    /post-revenue/i,
  ],
  growth: [
    /growth\s*stage/i,
    /scaling/i,
    /scale-up/i,
    /series\s*c/i,
    /expansion\s*stage/i,
  ],
};

const IP_PATTERNS = [
  /(?:intellectual\s*property|IP|patent|patents|trademark|copyright)/i,
  /(?:proprietary|owned)\s*(?:technology|tech|IP)/i,
  /(?:patent\s*pending|patented)/i,
  /(?:trade\s*secret|trade\s*secrets)/i,
];

const COMPETITOR_PATTERNS = [
  /competitor[s]?/i,
  /competitive\s*landscape/i,
  /(?:direct|indirect)\s*competition/i,
  /(?:competing|competes)\s*with/i,
  /(?:vs\.?|versus)\s+[A-Za-z]/i,
  /market\s*players?\s*include/i,
  /(?:key|main)\s*competitors?\s*[:\.]/i,
];

function normalizeToNumber(match: string): number {
  const cleaned = match.replace(/,/g, "").toLowerCase();
  let num = parseFloat(cleaned.replace(/[^0-9.]/g, ""));
  if (cleaned.includes("m") || cleaned.includes("million") || cleaned.includes("mm")) {
    num *= 1_000_000;
  } else if (cleaned.includes("k")) {
    num *= 1_000;
  }
  return num;
}

function detectRevenue(text: string): { hasRevenue: boolean; value?: number } {
  for (const pattern of REVENUE_PATTERNS) {
    const m = text.match(pattern);
    if (m && m[1]) {
      const value = normalizeToNumber(m[1]);
      if (value > 0) {
        return { hasRevenue: true, value };
      }
    }
  }
  return { hasRevenue: false };
}

function detectForecast(text: string): {
  hasForecast12m: boolean;
  hasForecast24m: boolean;
  hasForecast48m: boolean;
} {
  const has12 = FORECAST_PATTERNS.m12.some((p) => p.test(text));
  const has24 = FORECAST_PATTERNS.m24.some((p) => p.test(text));
  const has48 = FORECAST_PATTERNS.m48.some((p) => p.test(text));
  return {
    hasForecast12m: has12,
    hasForecast24m: has24,
    hasForecast48m: has48,
  };
}

function detectStage(text: string): ProposalStage {
  if (STAGE_PATTERNS["pre-revenue"].some((p) => p.test(text))) return "pre-revenue";
  if (STAGE_PATTERNS.growth.some((p) => p.test(text))) return "growth";
  if (STAGE_PATTERNS.revenue.some((p) => p.test(text))) return "revenue";
  return "unknown";
}

function detectIP(text: string): boolean {
  return IP_PATTERNS.some((p) => p.test(text));
}

function detectCompetitors(text: string): boolean {
  return COMPETITOR_PATTERNS.some((p) => p.test(text));
}

// ─────────────────────────────────────────────────────────────────────────────
// Heuristic Scoring
// ─────────────────────────────────────────────────────────────────────────────

const BASE_SCORE = 70; // Start at 70, apply penalties
const PENALTY_LOW_REVENUE = 10;
const PENALTY_MISSING_FORECAST = 15;
const PENALTY_NO_IP = 10;

function computeHeuristicScore(
  signals: HeuristicSignals
): { score: number; penalties: string[] } {
  const penalties: string[] = [];
  let score = BASE_SCORE;

  // Low or no revenue penalty (only if stage suggests they should have revenue)
  if (signals.stage === "revenue" || signals.stage === "growth") {
    if (!signals.hasRevenue) {
      score -= PENALTY_LOW_REVENUE;
      penalties.push("No revenue detected for revenue/growth stage");
    } else if (signals.revenueValue !== undefined && signals.revenueValue < 100_000) {
      score -= 5;
      penalties.push("Low revenue (<$100K) for stated stage");
    }
  }

  // Missing forecast penalty
  if (!signals.hasForecast) {
    score -= PENALTY_MISSING_FORECAST;
    penalties.push("No financial forecast (12/24/48 month) detected");
  } else {
    if (!signals.hasForecast12m) {
      score -= 5;
      penalties.push("12-month forecast not explicitly stated");
    }
  }

  // No IP penalty
  if (!signals.hasIP) {
    score -= PENALTY_NO_IP;
    penalties.push("No intellectual property or proprietary assets mentioned");
  }

  const finalScore = Math.max(0, Math.min(100, score));
  return { score: finalScore, penalties };
}

// ─────────────────────────────────────────────────────────────────────────────
// LLM Score Contribution
// ─────────────────────────────────────────────────────────────────────────────

function llmSignalsToScore(llm: ValidationLLMResult): number {
  let score = 50; // base
  if (llm.businessModelClarity === "clear") score += 15;
  else if (llm.businessModelClarity === "partial") score += 5;
  else if (llm.businessModelClarity === "unclear") score -= 10;

  if (llm.competitorPresence === "identified") score += 10;
  else if (llm.competitorPresence === "mentioned") score += 5;

  return Math.max(0, Math.min(100, score));
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Validation Function
// ─────────────────────────────────────────────────────────────────────────────

export async function runProposalValidation(
  proposalText: string
): Promise<ValidationSummary> {
  const warnings: string[] = [];

  if (!proposalText || proposalText.trim().length < 50) {
    return {
      validationScore: 0,
      heuristic: {
        signals: {
          hasRevenue: false,
          hasForecast: false,
          hasForecast12m: false,
          hasForecast24m: false,
          hasForecast48m: false,
          stage: "unknown",
          hasIP: false,
          hasCompetitors: false,
        },
        heuristicScore: 0,
        penalties: ["Insufficient proposal text for validation"],
        heuristicScoreAfterPenalties: 0,
      },
      step: "Validate Proposal",
      warnings: ["Proposal text too short for validation"],
    };
  }

  // 1. Heuristic detection
  const revenueResult = detectRevenue(proposalText);
  const forecastResult = detectForecast(proposalText);
  const stage = detectStage(proposalText);
  const hasIP = detectIP(proposalText);
  const hasCompetitors = detectCompetitors(proposalText);

  const signals: HeuristicSignals = {
    hasRevenue: revenueResult.hasRevenue,
    revenueValue: revenueResult.value,
    hasForecast12m: forecastResult.hasForecast12m,
    hasForecast24m: forecastResult.hasForecast24m,
    hasForecast48m: forecastResult.hasForecast48m,
    hasForecast:
      forecastResult.hasForecast12m ||
      forecastResult.hasForecast24m ||
      forecastResult.hasForecast48m,
    stage,
    hasIP,
    hasCompetitors,
  };

  const { score: heuristicScoreAfterPenalties, penalties } =
    computeHeuristicScore(signals);

  const heuristicResult: ValidationHeuristicResult = {
    signals,
    heuristicScore: BASE_SCORE,
    penalties,
    heuristicScoreAfterPenalties,
  };

  // 2. LLM extraction (if configured)
  let llmResult: ValidationLLMResult | undefined;
  let validationScore = heuristicScoreAfterPenalties;

  if (isLLMConfigured()) {
    try {
      const llmRaw = await runValidationExtractionWithProvider(proposalText);
      if (llmRaw) {
        const llmScore = llmSignalsToScore(llmRaw);
        llmResult = { ...llmRaw, llmScore };
        // Combine: 60% heuristic + 40% LLM
        validationScore = Math.round(
          heuristicScoreAfterPenalties * 0.6 + llmScore * 0.4
        );
        validationScore = Math.max(0, Math.min(100, validationScore));
      }
    } catch (err) {
      warnings.push(
        `LLM validation extraction failed: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  } else {
    warnings.push("LLM not configured - validation uses heuristic only");
  }

  return {
    validationScore,
    heuristic: heuristicResult,
    llm: llmResult,
    step: "Validate Proposal",
    warnings,
  };
}
