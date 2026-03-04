import {
  requireRBACPermissionWithTenantContext,
  isForbidden,
  RBAC_PERMISSIONS,
} from "@/lib/authz";
import CostsClient from "./CostsClient";
import { ForbiddenPage } from "@/components/app/ForbiddenPage";

export default async function CostsPage() {
  const result = await requireRBACPermissionWithTenantContext(
    RBAC_PERMISSIONS.COSTS_READ
  );

  if (isForbidden(result)) {
    return <ForbiddenPage message={result.message} />;
  }

  return <CostsClient role={result.user.role} />;
}
