import { redirect } from "next/navigation";
import { getMyAuthz, isReadOnlyRole } from "@/lib/authz";
import { getNavItemsForRole, filterNavByPermissions } from "@/lib/nav";
import { AppShell } from "@/components/app-shell";
import { getSessionSafe } from "@/lib/session";
import { getActiveTenantId, isTenantRequired } from "@/lib/tenantContext";
import { ToastProvider } from "@/components/ui/toast";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authz = await getMyAuthz();

  if (!authz.ok) {
    redirect("/login");
  }

  const { role, permissions } = authz.data;
  const activeTenantId = await getActiveTenantId();

  // Redirect to tenant selection if tenant is required but not set
  if (isTenantRequired(role) && !activeTenantId) {
    redirect("/select-tenant");
  }

  const { user } = await getSessionSafe();

  const navItems = getNavItemsForRole(role, activeTenantId);
  const filteredNavItems = filterNavByPermissions(navItems, permissions);

  const userInfo = {
    name: user?.name ?? "",
    email: user?.email ?? "",
    role,
    isReadOnly: isReadOnlyRole(role),
  };

  return (
    <ToastProvider>
      <AppShell
        user={userInfo}
        navItems={filteredNavItems}
        permissions={permissions}
        activeTenantId={activeTenantId}
      >
        {children}
      </AppShell>
    </ToastProvider>
  );
}
