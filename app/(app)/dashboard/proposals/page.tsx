import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { requirePermissionWithTenantContext, PROPOSAL_READ } from "@/lib/authz";
import ProposalsClient from "./ProposalsClient";
import type { Proposal } from "@/lib/mock/proposals";

async function fetchProposals(): Promise<{ proposals: Proposal[]; error?: string }> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("ipa_session");
  const tenantCookie = cookieStore.get("ipa_tenant");

  if (!sessionCookie) {
    return { proposals: [], error: "unauthenticated" };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const cookieHeader = tenantCookie
    ? `ipa_session=${sessionCookie.value}; ipa_tenant=${tenantCookie.value}`
    : `ipa_session=${sessionCookie.value}`;

  const res = await fetch(`${baseUrl}/api/proposals`, {
    headers: {
      Cookie: cookieHeader,
    },
    cache: "no-store",
  });

  if (res.status === 401) {
    return { proposals: [], error: "unauthenticated" };
  }

  if (res.status === 403) {
    return { proposals: [], error: "forbidden" };
  }

  const data = await res.json();

  if (!data.ok) {
    return { proposals: [], error: data.error || "Unknown error" };
  }

  return { proposals: data.data.proposals };
}

export default async function ProposalsPage() {
  // Requires proposal:read permission AND tenant context
  await requirePermissionWithTenantContext(PROPOSAL_READ);

  const { proposals, error } = await fetchProposals();

  if (error === "unauthenticated") {
    redirect("/login");
  }

  return <ProposalsClient proposals={proposals} error={error} />;
}
