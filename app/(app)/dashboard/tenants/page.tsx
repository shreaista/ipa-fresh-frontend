import { requireRoleOrPermission, TENANT_MANAGE } from "@/lib/authz";
import TenantsClient from "./TenantsClient";

export default async function TenantsPage() {
  // SaaS Admin only OR permission tenant:manage
  await requireRoleOrPermission(["saas_admin"], TENANT_MANAGE);

  return <TenantsClient />;
}
