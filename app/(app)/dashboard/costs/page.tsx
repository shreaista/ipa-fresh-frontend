import { redirect } from "next/navigation";
import { requirePagePermission, TENANT_COSTS_READ } from "@/lib/authz";
import CostsClient from "./CostsClient";

export default async function CostsPage() {
  // Requires tenant:costs:read permission
  const user = await requirePagePermission(TENANT_COSTS_READ);

  // tenant_admin must have tenant context
  if (user.role === "tenant_admin" && !user.tenantId) {
    redirect("/login");
  }

  // saas_admin can view global costs without tenant context

  return <CostsClient role={user.role} />;
}
