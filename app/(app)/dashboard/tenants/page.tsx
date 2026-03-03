import { redirect } from "next/navigation";
import { getAuthzContextOrNull, ROLES } from "@/lib/authz";
import TenantsClient from "./TenantsClient";

export default async function TenantsPage() {
  const ctx = await getAuthzContextOrNull();

  if (!ctx) {
    redirect("/login");
  }

  if (ctx.role !== ROLES.SAAS_ADMIN) {
    redirect("/dashboard");
  }

  return <TenantsClient />;
}
