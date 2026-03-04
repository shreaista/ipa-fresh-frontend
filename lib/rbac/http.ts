import "server-only";

import { NextResponse } from "next/server";
import { getSessionSafe } from "@/lib/session";
import type { Role, Permission, AuthContext } from "./types";
import { ROLE_PERMISSIONS } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// HTTP Error Class
// ─────────────────────────────────────────────────────────────────────────────

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "HttpError";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Session User Type
// ─────────────────────────────────────────────────────────────────────────────

export interface SessionUser {
  userId: string;
  email: string;
  name: string;
  role: Role;
  tenantId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// requireUser
// ─────────────────────────────────────────────────────────────────────────────

export async function requireUser(): Promise<SessionUser> {
  const { user } = await getSessionSafe();

  if (!user) {
    throw new HttpError(401, "Authentication required");
  }

  return {
    userId: user.userId || "",
    email: user.email || "",
    name: user.name || "",
    role: user.role as Role,
    tenantId: user.tenantId,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// requireRole
// ─────────────────────────────────────────────────────────────────────────────

export function requireRole(user: SessionUser, roles: Role[]): void {
  if (!roles.includes(user.role)) {
    throw new HttpError(403, "Forbidden");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// requirePermission
// ─────────────────────────────────────────────────────────────────────────────

export function requirePermission(permissions: Permission[], key: Permission): void {
  if (!permissions.includes(key)) {
    throw new HttpError(403, "Forbidden");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// requireTenantContext
// ─────────────────────────────────────────────────────────────────────────────

export function requireTenantContext(user: SessionUser): string {
  if (!user.tenantId) {
    throw new HttpError(400, "Tenant context required");
  }
  return user.tenantId;
}

// ─────────────────────────────────────────────────────────────────────────────
// getPermissionsForUser
// ─────────────────────────────────────────────────────────────────────────────

export function getPermissionsForUser(user: SessionUser): Permission[] {
  return ROLE_PERMISSIONS[user.role] || [];
}

// ─────────────────────────────────────────────────────────────────────────────
// jsonError
// ─────────────────────────────────────────────────────────────────────────────

export function jsonError(err: unknown): NextResponse {
  if (err instanceof HttpError) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: err.status }
    );
  }

  console.error("[jsonError]", err);
  return NextResponse.json(
    { ok: false, error: "Internal server error" },
    { status: 500 }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// jsonSuccess
// ─────────────────────────────────────────────────────────────────────────────

export function jsonSuccess<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json({ ok: true, data }, { status });
}

// ─────────────────────────────────────────────────────────────────────────────
// toAuthContext
// ─────────────────────────────────────────────────────────────────────────────

export function toAuthContext(user: SessionUser): AuthContext {
  return {
    userId: user.userId,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId ?? null,
    permissions: ROLE_PERMISSIONS[user.role] || [],
  };
}
