import { requireRoleWithTenantContext } from "@/lib/authz";
import { getFundById } from "@/lib/mock/fundsStore";
import { redirect } from "next/navigation";
import FundConfigClient from "./FundConfigClient";

interface PageProps {
  params: Promise<{ fundId: string }>;
}

export default async function FundConfigPage({ params }: PageProps) {
  const { tenantId } = await requireRoleWithTenantContext(["tenant_admin", "saas_admin"]);
  const { fundId } = await params;

  const fund = getFundById(tenantId, fundId);
  if (!fund) {
    redirect("/dashboard/funds");
  }

  return <FundConfigClient fund={fund} />;
}
