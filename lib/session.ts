import "server-only";

import { cookies } from "next/headers";
import type { SessionUser, SessionSafeResult } from "./types";

export type { SessionUser, SessionSafeResult };

export async function getSessionSafe(): Promise<SessionSafeResult> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("ipa_session")?.value;

    if (!token) {
      return { user: null };
    }

    const parts = token.split(".");
    if (parts.length !== 3) {
      return { user: null };
    }

    const payloadBase64 = parts[1];
    const payloadJson = Buffer.from(payloadBase64, "base64url").toString("utf-8");
    const payload = JSON.parse(payloadJson);

    if (!payload.email && !payload.userId) {
      return { user: null };
    }

    const role = payload.role || "assessor";

    // For saas_admin, check if there's an override tenant cookie
    let activeTenantId: string | undefined = payload.tenantId;
    if (role === "saas_admin") {
      const tenantOverride = cookieStore.get("ipa_tenant")?.value;
      if (tenantOverride) {
        activeTenantId = tenantOverride;
      }
    }

    return {
      user: {
        userId: payload.userId || payload.sub || "",
        email: payload.email || "",
        role,
        name: payload.name || "",
        tenantId: activeTenantId,
      },
    };
  } catch {
    return { user: null };
  }
}
