import {
  requireRBACPermissionWithTenantContext,
  isForbidden,
  RBAC_PERMISSIONS,
} from "@/lib/authz";
import UsersClient from "./UsersClient";
import { ForbiddenPage } from "@/components/app/ForbiddenPage";

export default async function UsersPage() {
  const result = await requireRBACPermissionWithTenantContext(
    RBAC_PERMISSIONS.USER_READ
  );

  if (isForbidden(result)) {
    return <ForbiddenPage message={result.message} />;
  }

  return <UsersClient />;
}
