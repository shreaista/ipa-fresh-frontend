import "server-only";

import { getSessionSafe } from "@/lib/session";
import type { RoleKey } from "./roles";
import { isValidRole } from "./roles";
import type { Permission } from "./permissions";
import { ROLE_PERMISSIONS } from "./rolePermissions";
import { AuthRequiredError } from "./errors";
import type { Entitlements } from "@/lib/entitlements/types";
import { getDemoEntitlements } from "@/lib/entitlements/demoEntitlements";

// ─────────────────────────────────────────────────────────────────────────────
// Authorization Context Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthzUser {
  id?: string;
  email?: string;
  name?: string;
  role?: RoleKey;
}

export interface AuthorizationContext {
  user: AuthzUser;
  tenantId: string | null;
  role: RoleKey;
  permissions: readonly Permission[];
  entitlements: Entitlements | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Get Authorization Context
// ─────────────────────────────────────────────────────────────────────────────

export async function getAuthzContext(): Promise<AuthorizationContext> {
  const { user } = await getSessionSafe();

  if (!user) {
    throw new AuthRequiredError();
  }

  const role: RoleKey = isValidRole(user.role) ? user.role : "assessor";

  const tenantId: string | null = user.tenantId ?? null;

  const permissions = ROLE_PERMISSIONS[role] ?? [];

  const entitlements = getDemoEntitlements(tenantId);

  return {
    user: {
      id: user.userId,
      email: user.email,
      name: user.name,
      role,
    },
    tenantId,
    role,
    permissions,
    entitlements,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Optional Context (returns null instead of throwing)
// ─────────────────────────────────────────────────────────────────────────────

export async function getAuthzContextOrNull(): Promise<AuthorizationContext | null> {
  try {
    return await getAuthzContext();
  } catch {
    return null;
  }
}
