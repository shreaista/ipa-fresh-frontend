import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  DollarSign,
  BarChart3,
  Wallet,
  FileText,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "./types";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const navByRole: Record<Role, NavItem[]> = {
  saas_admin: [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/tenants", label: "Tenants", icon: Building2 },
    { href: "/dashboard/users", label: "Users", icon: Users },
    { href: "/dashboard/subscriptions", label: "Subscriptions", icon: CreditCard },
    { href: "/dashboard/costs", label: "Costs", icon: DollarSign },
    { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
  ],
  tenant_admin: [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/funds", label: "Funds", icon: Wallet },
    { href: "/dashboard/proposals", label: "Proposals", icon: FileText },
    { href: "/dashboard/users", label: "Users", icon: Users },
    { href: "/dashboard/costs", label: "Costs", icon: DollarSign },
    { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
  ],
  assessor: [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/queue", label: "My Queue", icon: ClipboardList },
    { href: "/dashboard/proposals", label: "Proposals", icon: FileText },
    { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
  ],
};

export function getNavItems(role: Role): NavItem[] {
  return navByRole[role] || [];
}

export function getPageTitle(pathname: string, navItems: NavItem[]): string {
  const item = navItems.find((n) => n.href === pathname);
  return item?.label || "Dashboard";
}
