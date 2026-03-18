import "server-only";

import { cookies } from "next/headers";
import { getSessionSafe } from "./session";

export const TENANT_COOKIE_NAME = "ipa_tenant";

export class TenantContextError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "TenantContextError";
    this.status = status;
  }
}

export async function getActiveTenantId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(TENANT_COOKIE_NAME)?.value || null;
}

export async function requireActiveTenantId(): Promise<string> {
  const { user } = await getSessionSafe();

  if (!user) {
    throw new TenantContextError("Authentication required", 401);
  }

  if (user.role === "saas_admin") {
    const tenantId = await getActiveTenantId();
    if (!tenantId) {
      throw new TenantContextError(
        "SaaS Admin must select a tenant context to perform this operation. Use 'View as Tenant' to select one.",
        400
      );
    }
    return tenantId;
  }

  if (["tenant_admin", "fund_manager", "assessor", "viewer"].includes(user.role)) {
    const tenantId = await getActiveTenantId();
    if (!tenantId) {
      throw new TenantContextError(
        "Please select a tenant before accessing this resource. You will be redirected to the tenant selection page.",
        400
      );
    }
    return tenantId;
  }

  throw new TenantContextError("Unknown role", 403);
}

export async function getEffectiveTenantId(): Promise<string | null> {
  const { user } = await getSessionSafe();

  if (!user) {
    return null;
  }

  const cookieTenantId = await getActiveTenantId();

  if (user.role === "saas_admin") {
    return cookieTenantId;
  }

  if (["tenant_admin", "fund_manager", "assessor", "viewer"].includes(user.role)) {
    return cookieTenantId;
  }

  return null;
}

export function isTenantRequired(role: string): boolean {
  return ["tenant_admin", "fund_manager", "assessor", "viewer"].includes(role);
}
