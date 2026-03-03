import { cookies } from "next/headers";
import { verifySession } from "./auth";
import type { SessionPayload } from "./types";

export async function getCurrentUser(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("ipa_session")?.value;

  if (!token) {
    return null;
  }

  return verifySession(token);
}
