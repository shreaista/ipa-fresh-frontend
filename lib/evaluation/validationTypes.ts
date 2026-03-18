import "server-only";

// Types for Proposal Validation (used by validationClient and proposalValidation)

export type ProposalStage = "pre-revenue" | "revenue" | "growth" | "unknown";

export interface ValidationLLMResult {
  stage: ProposalStage;
  businessModelClarity: "clear" | "partial" | "unclear" | "unknown";
  competitorPresence: "identified" | "mentioned" | "none" | "unknown";
  llmScore?: number; // computed in proposalValidation from signals
}
