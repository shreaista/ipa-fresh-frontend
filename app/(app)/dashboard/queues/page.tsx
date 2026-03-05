import {
  requireRBACPermissionWithTenantContext,
  isForbidden,
  RBAC_PERMISSIONS,
} from "@/lib/authz";
import QueuesClient from "./QueuesClient";
import { ForbiddenPage } from "@/components/app/ForbiddenPage";

export default async function QueuesPage() {
  const result = await requireRBACPermissionWithTenantContext(
    RBAC_PERMISSIONS.QUEUE_MANAGE
  );

  if (isForbidden(result)) {
    return <ForbiddenPage message={result.message} />;
  }

  return <QueuesClient />;
}
