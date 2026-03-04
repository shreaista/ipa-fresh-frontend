import "server-only";

import { getSessionSafe } from "@/lib/session";
import type { RoleKey } from "./roles";
import { isValidRole } from "./roles";
import type { Permission } from "./permissions";
import { ROLE_PERMISSIONS } from "./rolePermissions";
import type { Entitlements } from "@/lib/entitlements/types";
import { getDemoEntitlements } from "@/lib/entitlements/demoEntitlements";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface MyAuthzData {
  role: RoleKey;
  tenantId: string | null;
  activeTenantId: string | null;
  permissions: string[];
  entitlements: Entitlements | null;
}

export type MyAuthzResult =
  | { ok: true; data: MyAuthzData }
  | { ok: false; error: string };

// ─────────────────────────────────────────────────────────────────────────────
// Get My Authorization Context
// ─────────────────────────────────────────────────────────────────────────────

export async function getMyAuthz(): Promise<MyAuthzResult> {
  const { user } = await getSessionSafe();

  if (!user) {
    return { ok: false, error: "unauthenticated" };
  }

  const role: RoleKey = isValidRole(user.role) ? user.role : "assessor";
  const tenantId: string | null = user.tenantId ?? null;
  const permissions: readonly Permission[] = ROLE_PERMISSIONS[role] ?? [];
  const entitlements = getDemoEntitlements(tenantId);

  return {
    ok: true,
    data: {
      role,
      tenantId,
      activeTenantId: tenantId,
      permissions: [...permissions],
      entitlements,
    },
  };
}
