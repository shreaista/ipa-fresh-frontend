// ─────────────────────────────────────────────────────────────────────────────
// Navigation Configuration (Serializable - no React components)
// ─────────────────────────────────────────────────────────────────────────────

export type IconKey =
  | "layout-dashboard"
  | "building-2"
  | "users"
  | "credit-card"
  | "dollar-sign"
  | "bar-chart-3"
  | "wallet"
  | "file-text"
  | "clipboard-list"
  | "settings";

export interface NavItem {
  key: string;
  label: string;
  href: string;
  iconKey: IconKey;
  permissionKey?: string;
  roles?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Navigation by Role
// ─────────────────────────────────────────────────────────────────────────────

// SaaS Admin in global mode (no tenant selected)
const SAAS_ADMIN_GLOBAL: NavItem[] = [
  { key: "overview", label: "Overview", href: "/dashboard", iconKey: "layout-dashboard" },
  { key: "tenants", label: "Tenants", href: "/dashboard/tenants", iconKey: "building-2", permissionKey: "tenant:read", roles: ["saas_admin"] },
  { key: "subscriptions", label: "Subscriptions", href: "/dashboard/subscriptions", iconKey: "credit-card", roles: ["saas_admin"] },
  { key: "costs", label: "Costs", href: "/dashboard/costs", iconKey: "dollar-sign", permissionKey: "costs:read" },
  { key: "reports", label: "Reports", href: "/dashboard/reports", iconKey: "bar-chart-3" },
];

// SaaS Admin viewing as a tenant
const SAAS_ADMIN_TENANT: NavItem[] = [
  { key: "overview", label: "Overview", href: "/dashboard", iconKey: "layout-dashboard" },
  { key: "tenants", label: "Tenants", href: "/dashboard/tenants", iconKey: "building-2", permissionKey: "tenant:read", roles: ["saas_admin"] },
  { key: "funds", label: "Funds", href: "/dashboard/funds", iconKey: "wallet", roles: ["tenant_admin", "saas_admin"] },
  { key: "proposals", label: "Proposals", href: "/dashboard/proposals", iconKey: "file-text", permissionKey: "proposal:read" },
  { key: "users", label: "Users", href: "/dashboard/users", iconKey: "users", permissionKey: "user:read" },
  { key: "subscriptions", label: "Subscriptions", href: "/dashboard/subscriptions", iconKey: "credit-card", roles: ["saas_admin"] },
  { key: "costs", label: "Costs", href: "/dashboard/costs", iconKey: "dollar-sign", permissionKey: "costs:read" },
  { key: "reports", label: "Reports", href: "/dashboard/reports", iconKey: "bar-chart-3" },
];

export const NAV_BY_ROLE: Record<string, NavItem[]> = {
  saas_admin: SAAS_ADMIN_GLOBAL,
  saas_admin_tenant: SAAS_ADMIN_TENANT,
  tenant_admin: [
    { key: "overview", label: "Overview", href: "/dashboard", iconKey: "layout-dashboard" },
    { key: "funds", label: "Funds", href: "/dashboard/funds", iconKey: "wallet", roles: ["tenant_admin", "saas_admin"] },
    { key: "proposals", label: "Proposals", href: "/dashboard/proposals", iconKey: "file-text", permissionKey: "proposal:read" },
    { key: "users", label: "Users", href: "/dashboard/users", iconKey: "users", permissionKey: "user:read" },
    { key: "costs", label: "Costs", href: "/dashboard/costs", iconKey: "dollar-sign", permissionKey: "costs:read" },
    { key: "reports", label: "Reports", href: "/dashboard/reports", iconKey: "bar-chart-3" },
  ],
  assessor: [
    { key: "overview", label: "Overview", href: "/dashboard", iconKey: "layout-dashboard" },
    { key: "proposals", label: "Proposals", href: "/dashboard/proposals", iconKey: "file-text", permissionKey: "proposal:read" },
    { key: "queue", label: "My Queue", href: "/dashboard/queue", iconKey: "clipboard-list", roles: ["assessor"] },
    { key: "reports", label: "Reports", href: "/dashboard/reports", iconKey: "bar-chart-3" },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

export function getNavItemsForRole(role: string, activeTenantId?: string | null): NavItem[] {
  if (role === "saas_admin") {
    return activeTenantId ? NAV_BY_ROLE.saas_admin_tenant : NAV_BY_ROLE.saas_admin;
  }
  return NAV_BY_ROLE[role] ?? NAV_BY_ROLE.assessor;
}

export function filterNavItems(
  items: NavItem[],
  permissions: string[],
  role: string
): NavItem[] {
  return items.filter((item) => {
    // Check role restriction first
    if (item.roles && item.roles.length > 0) {
      if (!item.roles.includes(role)) {
        return false;
      }
    }
    // Check permission restriction
    if (item.permissionKey) {
      if (!permissions.includes(item.permissionKey)) {
        return false;
      }
    }
    return true;
  });
}

export function filterNavByPermissions(items: NavItem[], permissions: string[]): NavItem[] {
  return items.filter((item) => {
    if (!item.permissionKey) return true;
    return permissions.includes(item.permissionKey);
  });
}

export function getPageTitle(pathname: string, items: NavItem[]): string {
  const item = items.find((n) => n.href === pathname);
  return item?.label || "Dashboard";
}
