import "server-only";

// ─────────────────────────────────────────────────────────────────────────────
// Entitlements Type
// ─────────────────────────────────────────────────────────────────────────────

export interface Entitlements {
  maxAssessors: number;
  maxUploadsPerAssessment: number;
  allowedReportTypes: string[];
  maxReportsPerMonth: number;
  allowedLLMProviders: string[];
  modelAllowlist: string[];
  rateLimitRpm: number;
  fundMandatesEnabled: boolean;
  canManageFundMandates: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Default Entitlements (Starter Plan)
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_ENTITLEMENTS: Entitlements = {
  maxAssessors: 5,
  maxUploadsPerAssessment: 3,
  allowedReportTypes: ["summary"],
  maxReportsPerMonth: 10,
  allowedLLMProviders: ["openai"],
  modelAllowlist: ["gpt-4o-mini"],
  rateLimitRpm: 10,
  fundMandatesEnabled: false,
  canManageFundMandates: false,
};
