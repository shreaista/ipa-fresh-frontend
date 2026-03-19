"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavItem, IconKey } from "@/lib/nav";
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
  Settings,
  ScrollText,
  Briefcase,
  PanelLeftClose,
  PanelLeft,
  X,
  ListChecks,
  Target,
  MessageSquare,
  History,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<IconKey, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  "building-2": Building2,
  "users": Users,
  "credit-card": CreditCard,
  "dollar-sign": DollarSign,
  "bar-chart-3": BarChart3,
  "wallet": Wallet,
  "file-text": FileText,
  "clipboard-list": ClipboardList,
  "settings": Settings,
  "scroll-text": ScrollText,
  "list-checks": ListChecks,
  "target": Target,
  "message-square": MessageSquare,
  "history": History,
};

function filterItemsByPermissionAndRole(
  items: NavItem[],
  permissions: string[],
  role: string
): NavItem[] {
  return items.filter((item) => {
    if (item.roles && item.roles.length > 0) {
      if (!item.roles.includes(role)) {
        return false;
      }
    }
    if (item.permissionKey) {
      if (!permissions.includes(item.permissionKey)) {
        return false;
      }
    }
    return true;
  });
}

interface SidebarProps {
  items: NavItem[];
  permissions: string[];
  role: string;
  collapsed: boolean;
  onToggle: () => void;
  variant?: "default" | "dark";
}

export function Sidebar({ items, permissions, role, collapsed, onToggle, variant = "default" }: SidebarProps) {
  const pathname = usePathname();
  const filteredItems = filterItemsByPermissionAndRole(items, permissions, role);
  const isDark = variant === "dark";

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col h-[calc(100vh-3.5rem)] sticky top-14 border-r transition-all duration-200 ease-out",
        collapsed ? "w-[68px]" : "w-[240px]",
        isDark ? "bg-slate-900 border-slate-700" : "border-border/60 bg-card"
      )}
    >
      <div className="flex-1 py-4 overflow-y-auto">
        <nav className="flex flex-col gap-1 px-3">
          {filteredItems.map((item) => {
            const Icon = iconMap[item.iconKey];
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                  collapsed && "justify-center px-0 w-10 h-10 mx-auto",
                  isDark
                    ? isActive
                      ? "bg-amber-500/20 text-amber-400"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    : isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                title={collapsed ? item.label : undefined}
              >
                {isActive && (
                  <span className={cn(
                    "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full",
                    isDark ? "bg-amber-500" : "bg-primary"
                  )} />
                )}
                <Icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0 transition-colors",
                    isDark
                      ? isActive ? "text-amber-400" : "text-slate-400 group-hover:text-slate-200"
                      : isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className={cn("border-t p-3", isDark ? "border-slate-700" : "")}>
        <button
          onClick={onToggle}
          className={cn(
            "flex items-center justify-center w-full rounded-lg p-2 transition-colors",
            isDark
              ? "text-slate-500 hover:bg-slate-800 hover:text-slate-300"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
            !collapsed && "justify-start gap-2 px-3"
          )}
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4" />
              <span className="text-xs font-medium">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

interface MobileSidebarProps {
  items: NavItem[];
  permissions: string[];
  role: string;
  open: boolean;
  onClose: () => void;
  variant?: "default" | "dark";
}

export function MobileSidebar({ items, permissions, role, open, onClose, variant = "default" }: MobileSidebarProps) {
  const pathname = usePathname();
  const filteredItems = filterItemsByPermissionAndRole(items, permissions, role);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
        onClick={onClose}
      />

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-[280px] border-r shadow-2xl lg:hidden animate-in slide-in-from-left-full duration-200",
        variant === "dark" ? "bg-slate-900 border-slate-700" : "bg-background"
      )}>
        <div className={cn(
          "flex h-14 items-center justify-between border-b px-4",
          variant === "dark" ? "border-slate-700" : ""
        )}>
          <div className="flex items-center gap-2.5">
            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              variant === "dark" ? "bg-amber-500" : "bg-primary"
            )}>
              <Briefcase className={cn(
                "h-4 w-4",
                variant === "dark" ? "text-white" : "text-primary-foreground"
              )} />
            </div>
            <span className={cn(
              "font-semibold",
              variant === "dark" ? "text-slate-100" : ""
            )}>IPA</span>
          </div>
          <button
            onClick={onClose}
            className={cn(
              "p-2 rounded-lg transition-colors",
              variant === "dark"
                ? "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex flex-col gap-1 p-4">
          {filteredItems.map((item) => {
            const Icon = iconMap[item.iconKey];
            const isActive = pathname === item.href;
            const isDark = variant === "dark";

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  isDark
                    ? isActive
                      ? "bg-amber-500/20 text-amber-400"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    : isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {isActive && (
                  <span className={cn(
                    "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full",
                    isDark ? "bg-amber-500" : "bg-primary"
                  )} />
                )}
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
