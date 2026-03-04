import { requirePageRole } from "@/lib/authz";
import TenantsClient from "./TenantsClient";

export default async function TenantsPage() {
  await requirePageRole(["saas_admin"]);

  return <TenantsClient />;
}
