import type { Role } from "./types";

export type IconName =
  | "layout-dashboard"
  | "building-2"
  | "users"
  | "credit-card"
  | "dollar-sign"
  | "bar-chart-3"
  | "wallet"
  | "file-text"
  | "clipboard-list";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

export const navByRole: Record<Role, NavItem[]> = {
  saas_admin: [
    { href: "/dashboard", label: "Overview", icon: "layout-dashboard" },
    { href: "/dashboard/tenants", label: "Tenants", icon: "building-2" },
    { href: "/dashboard/users", label: "Users", icon: "users" },
    { href: "/dashboard/subscriptions", label: "Subscriptions", icon: "credit-card" },
    { href: "/dashboard/costs", label: "Costs", icon: "dollar-sign" },
    { href: "/dashboard/reports", label: "Reports", icon: "bar-chart-3" },
  ],
  tenant_admin: [
    { href: "/dashboard", label: "Overview", icon: "layout-dashboard" },
    { href: "/dashboard/funds", label: "Funds", icon: "wallet" },
    { href: "/dashboard/proposals", label: "Proposals", icon: "file-text" },
    { href: "/dashboard/users", label: "Users", icon: "users" },
    { href: "/dashboard/costs", label: "Costs", icon: "dollar-sign" },
    { href: "/dashboard/reports", label: "Reports", icon: "bar-chart-3" },
  ],
  assessor: [
    { href: "/dashboard", label: "Overview", icon: "layout-dashboard" },
    { href: "/dashboard/queue", label: "My Queue", icon: "clipboard-list" },
    { href: "/dashboard/proposals", label: "Proposals", icon: "file-text" },
    { href: "/dashboard/reports", label: "Reports", icon: "bar-chart-3" },
  ],
};

export function getNavItems(role: Role): NavItem[] {
  return navByRole[role] || [];
}

export function getPageTitle(pathname: string, navItems: NavItem[]): string {
  const item = navItems.find((n) => n.href === pathname);
  return item?.label || "Dashboard";
}
