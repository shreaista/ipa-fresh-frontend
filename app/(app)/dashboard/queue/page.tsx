import { redirect } from "next/navigation";
import { getAuthzContextOrNull, ROLES } from "@/lib/authz";
import QueueClient from "./QueueClient";

export default async function QueuePage() {
  const ctx = await getAuthzContextOrNull();

  if (!ctx) {
    redirect("/login");
  }

  const allowedRoles = [ROLES.SAAS_ADMIN, ROLES.TENANT_ADMIN, ROLES.ASSESSOR];

  if (!allowedRoles.includes(ctx.role)) {
    redirect("/dashboard");
  }

  return <QueueClient />;
}
