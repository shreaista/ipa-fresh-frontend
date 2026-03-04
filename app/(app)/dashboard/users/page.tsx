import { requirePermissionWithTenantContext, USER_READ } from "@/lib/authz";
import UsersClient from "./UsersClient";

export default async function UsersPage() {
  // Requires user:read permission AND tenant context
  await requirePermissionWithTenantContext(USER_READ);

  return <UsersClient />;
}
