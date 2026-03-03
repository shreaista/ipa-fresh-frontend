import "server-only";

import type {
  TenantEntitlements,
  ReportType,
  LLMProvider,
  AuthContext,
} from "./types";
import { DEFAULT_ENTITLEMENTS } from "./types";
import { createAuthError } from "./authz";

// ─────────────────────────────────────────────────────────────────────────────
// In-memory store (replace with database in production)
// ─────────────────────────────────────────────────────────────────────────────

const entitlementStore = new Map<string, TenantEntitlements>();

// Initialize demo tenants
function initializeDemoEntitlements() {
  if (entitlementStore.size === 0) {
    entitlementStore.set("tenant-001", {
      ...DEFAULT_ENTITLEMENTS,
      tenantId: "tenant-001",
      plan: "professional",
      maxAssessors: 15,
      maxUploadsPerAssessment: 10,
      allowedReportTypes: ["summary", "detailed", "executive"],
      maxReportsPerMonth: 50,
      reportsGeneratedThisMonth: 12,
      allowedLLMProviders: ["openai", "anthropic"],
      llmModelAllowlist: ["gpt-4o", "gpt-4o-mini", "claude-3-5-sonnet-20241022"],
      llmRateLimitRPM: 60,
      llmRequestsThisMinute: 0,
      llmRequestsLastReset: Date.now(),
      features: {
        advancedAnalytics: true,
        customBranding: false,
        apiAccess: true,
        ssoEnabled: false,
        auditLogRetentionDays: 90,
      },
    });

    entitlementStore.set("tenant-002", {
      ...DEFAULT_ENTITLEMENTS,
      tenantId: "tenant-002",
      plan: "enterprise",
      maxAssessors: 100,
      maxUploadsPerAssessment: 25,
      allowedReportTypes: ["summary", "detailed", "executive", "compliance"],
      maxReportsPerMonth: 500,
      reportsGeneratedThisMonth: 45,
      allowedLLMProviders: ["openai", "anthropic", "azure_openai", "google"],
      llmModelAllowlist: ["gpt-4o", "gpt-4o-mini", "claude-3-5-sonnet-20241022", "gemini-1.5-pro"],
      llmRateLimitRPM: 300,
      llmRequestsThisMinute: 0,
      llmRequestsLastReset: Date.now(),
      features: {
        advancedAnalytics: true,
        customBranding: true,
        apiAccess: true,
        ssoEnabled: true,
        auditLogRetentionDays: 365,
      },
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Entitlement Retrieval
// ─────────────────────────────────────────────────────────────────────────────

export async function getTenantEntitlements(
  tenantId: string
): Promise<TenantEntitlements> {
  initializeDemoEntitlements();

  const entitlements = entitlementStore.get(tenantId);

  if (!entitlements) {
    return {
      ...DEFAULT_ENTITLEMENTS,
      tenantId,
    };
  }

  return entitlements;
}

export async function getEntitlementsForContext(
  ctx: AuthContext
): Promise<TenantEntitlements | null> {
  if (ctx.role === "saas_admin") {
    return null;
  }

  if (!ctx.tenantId) {
    return null;
  }

  return getTenantEntitlements(ctx.tenantId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Entitlement Checks
// ─────────────────────────────────────────────────────────────────────────────

export async function checkAssessorLimit(
  tenantId: string,
  currentCount: number
): Promise<{ allowed: boolean; limit: number; current: number }> {
  const entitlements = await getTenantEntitlements(tenantId);
  return {
    allowed: currentCount < entitlements.maxAssessors,
    limit: entitlements.maxAssessors,
    current: currentCount,
  };
}

export async function requireAssessorCapacity(
  tenantId: string,
  currentCount: number
): Promise<void> {
  const check = await checkAssessorLimit(tenantId, currentCount);
  if (!check.allowed) {
    throw createAuthError("ENTITLEMENT_LIMIT", "Assessor limit reached", {
      limit: check.limit,
      current: check.current,
    });
  }
}

export async function checkUploadLimit(
  tenantId: string,
  assessmentId: string,
  currentUploads: number
): Promise<{ allowed: boolean; limit: number; current: number }> {
  const entitlements = await getTenantEntitlements(tenantId);
  return {
    allowed: currentUploads < entitlements.maxUploadsPerAssessment,
    limit: entitlements.maxUploadsPerAssessment,
    current: currentUploads,
  };
}

export async function requireUploadCapacity(
  tenantId: string,
  assessmentId: string,
  currentUploads: number
): Promise<void> {
  const check = await checkUploadLimit(tenantId, assessmentId, currentUploads);
  if (!check.allowed) {
    throw createAuthError("ENTITLEMENT_LIMIT", "Upload limit per assessment reached", {
      limit: check.limit,
      current: check.current,
      assessmentId,
    });
  }
}

export async function checkReportTypeAllowed(
  tenantId: string,
  reportType: ReportType
): Promise<boolean> {
  const entitlements = await getTenantEntitlements(tenantId);
  return entitlements.allowedReportTypes.includes(reportType);
}

export async function requireReportType(
  tenantId: string,
  reportType: ReportType
): Promise<void> {
  const allowed = await checkReportTypeAllowed(tenantId, reportType);
  if (!allowed) {
    throw createAuthError("ENTITLEMENT_LIMIT", `Report type '${reportType}' not included in plan`, {
      reportType,
    });
  }
}

export async function checkReportQuota(
  tenantId: string
): Promise<{ allowed: boolean; limit: number; used: number; remaining: number }> {
  const entitlements = await getTenantEntitlements(tenantId);
  const remaining = entitlements.maxReportsPerMonth - entitlements.reportsGeneratedThisMonth;
  return {
    allowed: remaining > 0,
    limit: entitlements.maxReportsPerMonth,
    used: entitlements.reportsGeneratedThisMonth,
    remaining: Math.max(0, remaining),
  };
}

export async function requireReportQuota(tenantId: string): Promise<void> {
  const check = await checkReportQuota(tenantId);
  if (!check.allowed) {
    throw createAuthError("ENTITLEMENT_LIMIT", "Monthly report quota exceeded", {
      limit: check.limit,
      used: check.used,
    });
  }
}

export async function incrementReportCount(tenantId: string): Promise<void> {
  const entitlements = await getTenantEntitlements(tenantId);
  entitlements.reportsGeneratedThisMonth += 1;
  entitlementStore.set(tenantId, entitlements);
}

// ─────────────────────────────────────────────────────────────────────────────
// LLM Rate Limiting
// ─────────────────────────────────────────────────────────────────────────────

export async function checkLLMProvider(
  tenantId: string,
  provider: LLMProvider
): Promise<boolean> {
  const entitlements = await getTenantEntitlements(tenantId);
  return entitlements.allowedLLMProviders.includes(provider);
}

export async function checkLLMModel(
  tenantId: string,
  model: string
): Promise<boolean> {
  const entitlements = await getTenantEntitlements(tenantId);
  return entitlements.llmModelAllowlist.includes(model);
}

export async function requireLLMAccess(
  tenantId: string,
  provider: LLMProvider,
  model: string
): Promise<void> {
  const providerAllowed = await checkLLMProvider(tenantId, provider);
  if (!providerAllowed) {
    throw createAuthError("ENTITLEMENT_LIMIT", `LLM provider '${provider}' not allowed`, {
      provider,
    });
  }

  const modelAllowed = await checkLLMModel(tenantId, model);
  if (!modelAllowed) {
    throw createAuthError("ENTITLEMENT_LIMIT", `LLM model '${model}' not in allowlist`, {
      model,
    });
  }
}

export async function checkLLMRateLimit(
  tenantId: string
): Promise<{ allowed: boolean; limit: number; current: number; resetInMs: number }> {
  const entitlements = await getTenantEntitlements(tenantId);
  const now = Date.now();
  const minuteElapsed = now - entitlements.llmRequestsLastReset >= 60000;

  if (minuteElapsed) {
    entitlements.llmRequestsThisMinute = 0;
    entitlements.llmRequestsLastReset = now;
    entitlementStore.set(tenantId, entitlements);
  }

  const resetInMs = Math.max(0, 60000 - (now - entitlements.llmRequestsLastReset));

  return {
    allowed: entitlements.llmRequestsThisMinute < entitlements.llmRateLimitRPM,
    limit: entitlements.llmRateLimitRPM,
    current: entitlements.llmRequestsThisMinute,
    resetInMs,
  };
}

export async function requireLLMRateLimit(tenantId: string): Promise<void> {
  const check = await checkLLMRateLimit(tenantId);
  if (!check.allowed) {
    throw createAuthError("ENTITLEMENT_LIMIT", "LLM rate limit exceeded", {
      limit: check.limit,
      current: check.current,
      resetInMs: check.resetInMs,
    });
  }
}

export async function incrementLLMRequestCount(tenantId: string): Promise<void> {
  const entitlements = await getTenantEntitlements(tenantId);
  entitlements.llmRequestsThisMinute += 1;
  entitlementStore.set(tenantId, entitlements);
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature Flags
// ─────────────────────────────────────────────────────────────────────────────

export async function hasFeature(
  tenantId: string,
  feature: keyof TenantEntitlements["features"]
): Promise<boolean> {
  const entitlements = await getTenantEntitlements(tenantId);
  return !!entitlements.features[feature];
}

export async function requireFeature(
  tenantId: string,
  feature: keyof TenantEntitlements["features"]
): Promise<void> {
  const enabled = await hasFeature(tenantId, feature);
  if (!enabled) {
    throw createAuthError("ENTITLEMENT_LIMIT", `Feature '${feature}' not enabled`, {
      feature,
    });
  }
}
