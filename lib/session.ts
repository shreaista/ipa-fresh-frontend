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
    const payloadJson = Buffer.from(payloadBase64, "base64").toString("utf-8");
    const payload = JSON.parse(payloadJson);

    if (!payload.email && !payload.userId) {
      return { user: null };
    }

    return {
      user: {
        userId: payload.userId || payload.sub || "",
        email: payload.email || "",
        role: payload.role || "assessor",
        name: payload.name || "",
        tenantId: payload.tenantId,
      },
    };
  } catch {
    return { user: null };
  }
}
