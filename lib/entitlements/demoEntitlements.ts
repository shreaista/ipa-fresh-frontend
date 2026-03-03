import "server-only";

import type { Entitlements } from "./types";
import { DEFAULT_ENTITLEMENTS } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Demo Entitlements per Tenant
// ─────────────────────────────────────────────────────────────────────────────

const DEMO_ENTITLEMENTS: Record<string, Entitlements> = {
  "tenant-001": {
    maxAssessors: 15,
    maxUploadsPerAssessment: 10,
    allowedReportTypes: ["summary", "detailed", "executive"],
    maxReportsPerMonth: 50,
    allowedLLMProviders: ["openai", "anthropic"],
    modelAllowlist: ["gpt-4o", "gpt-4o-mini", "claude-3-5-sonnet"],
    rateLimitRpm: 60,
  },
  "tenant-002": {
    maxAssessors: 100,
    maxUploadsPerAssessment: 25,
    allowedReportTypes: ["summary", "detailed", "executive", "compliance"],
    maxReportsPerMonth: 500,
    allowedLLMProviders: ["openai", "anthropic", "azure_openai", "google"],
    modelAllowlist: ["gpt-4o", "gpt-4o-mini", "claude-3-5-sonnet", "gemini-1.5-pro"],
    rateLimitRpm: 300,
  },
  "demo-tenant": {
    maxAssessors: 10,
    maxUploadsPerAssessment: 5,
    allowedReportTypes: ["summary", "detailed"],
    maxReportsPerMonth: 25,
    allowedLLMProviders: ["openai"],
    modelAllowlist: ["gpt-4o", "gpt-4o-mini"],
    rateLimitRpm: 30,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Get Entitlements
// ─────────────────────────────────────────────────────────────────────────────

export function getDemoEntitlements(tenantId: string | null): Entitlements {
  if (!tenantId) {
    return DEFAULT_ENTITLEMENTS;
  }

  return DEMO_ENTITLEMENTS[tenantId] ?? DEFAULT_ENTITLEMENTS;
}
