export type Role = "saas_admin" | "tenant_admin" | "fund_manager" | "assessor" | "viewer";

export interface SessionPayload {
  userId: string;
  email: string;
  role: Role;
  name: string;
  tenantId?: string;
}

export interface SessionUser {
  userId: string;
  email: string;
  role: Role;
  name: string;
  tenantId?: string;
}

export interface SessionSafeResult {
  user: SessionUser | null;
}

// Re-export RBAC types for convenience (client-safe subset)
export type { Permission } from "./rbac/types";
