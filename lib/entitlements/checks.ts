import "server-only";

import type { AuthorizationContext } from "@/lib/authz/context";
import { EntitlementError } from "./errors";

// ─────────────────────────────────────────────────────────────────────────────
// Assessor Limit Check
// ─────────────────────────────────────────────────────────────────────────────

export function assertCanCreateAssessor(
  ctx: AuthorizationContext,
  currentAssessorCount: number
): void {
  if (!ctx.entitlements) {
    throw new EntitlementError(
      "No entitlements found for tenant",
      "Unable to verify entitlements"
    );
  }

  const { maxAssessors } = ctx.entitlements;

  if (currentAssessorCount >= maxAssessors) {
    throw new EntitlementError(
      `Assessor limit reached: ${currentAssessorCount}/${maxAssessors}`,
      "Assessor limit reached. Upgrade your plan to add more assessors.",
      { current: currentAssessorCount, limit: maxAssessors }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Upload Limit Check
// ─────────────────────────────────────────────────────────────────────────────

export function assertCanUploadDocument(
  ctx: AuthorizationContext,
  proposalUploadCount: number
): void {
  if (!ctx.entitlements) {
    throw new EntitlementError(
      "No entitlements found for tenant",
      "Unable to verify entitlements"
    );
  }

  const { maxUploadsPerAssessment } = ctx.entitlements;

  if (proposalUploadCount >= maxUploadsPerAssessment) {
    throw new EntitlementError(
      `Upload limit reached: ${proposalUploadCount}/${maxUploadsPerAssessment}`,
      "Upload limit per assessment reached. Upgrade your plan for more uploads.",
      { current: proposalUploadCount, limit: maxUploadsPerAssessment }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Report Generation Check
// ─────────────────────────────────────────────────────────────────────────────

export function assertCanGenerateReport(
  ctx: AuthorizationContext,
  reportType: string,
  reportsThisMonth: number
): void {
  if (!ctx.entitlements) {
    throw new EntitlementError(
      "No entitlements found for tenant",
      "Unable to verify entitlements"
    );
  }

  const { allowedReportTypes, maxReportsPerMonth } = ctx.entitlements;

  if (!allowedReportTypes.includes(reportType)) {
    throw new EntitlementError(
      `Report type '${reportType}' not allowed. Allowed: ${allowedReportTypes.join(", ")}`,
      `Report type '${reportType}' is not included in your plan.`,
      { reportType, allowedTypes: allowedReportTypes }
    );
  }

  if (reportsThisMonth >= maxReportsPerMonth) {
    throw new EntitlementError(
      `Monthly report limit reached: ${reportsThisMonth}/${maxReportsPerMonth}`,
      "Monthly report limit reached. Limit resets next month.",
      { current: reportsThisMonth, limit: maxReportsPerMonth }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LLM Usage Check
// ─────────────────────────────────────────────────────────────────────────────

export function assertCanUseLLM(
  ctx: AuthorizationContext,
  provider: string,
  model: string
): void {
  if (!ctx.entitlements) {
    throw new EntitlementError(
      "No entitlements found for tenant",
      "Unable to verify entitlements"
    );
  }

  const { allowedLLMProviders, modelAllowlist, rateLimitRpm } = ctx.entitlements;

  if (!allowedLLMProviders.includes(provider)) {
    throw new EntitlementError(
      `LLM provider '${provider}' not allowed. Allowed: ${allowedLLMProviders.join(", ")}`,
      `LLM provider '${provider}' is not included in your plan.`,
      { provider, allowedProviders: allowedLLMProviders }
    );
  }

  if (!modelAllowlist.includes(model)) {
    throw new EntitlementError(
      `Model '${model}' not in allowlist. Allowed: ${modelAllowlist.join(", ")}`,
      `Model '${model}' is not available in your plan.`,
      { model, allowedModels: modelAllowlist }
    );
  }

  if (rateLimitRpm <= 0) {
    throw new EntitlementError(
      "LLM rate limit not configured",
      "LLM access is not configured for your plan."
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Get Rate Limit (for middleware/rate limiting)
// ─────────────────────────────────────────────────────────────────────────────

export function getLLMRateLimit(ctx: AuthorizationContext): number {
  return ctx.entitlements?.rateLimitRpm ?? 0;
}
