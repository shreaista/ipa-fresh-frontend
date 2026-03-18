import { requireRoleWithTenantContext } from "@/lib/authz";
import FundManagerClient from "./FundManagerClient";

export default async function FundManagerPage() {
  const { user } = await requireRoleWithTenantContext(["tenant_admin", "saas_admin", "fund_manager", "viewer"]);

  return <FundManagerClient isReadOnly={user.role === "viewer"} />;
}
