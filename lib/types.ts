export type Role = "saas_admin" | "tenant_admin" | "assessor";

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
