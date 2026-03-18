import { requireRoleWithTenantContext } from "@/lib/authz";
import { redirect } from "next/navigation";
import AuditLogClient from "./AuditLogClient";

export default async function AuditLogPage() {
  await requireRoleWithTenantContext(["tenant_admin", "saas_admin"]);
  return <AuditLogClient />;
}
