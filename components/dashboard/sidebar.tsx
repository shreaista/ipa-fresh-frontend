"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavItem, IconName } from "@/lib/nav";
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
  Briefcase,
  PanelLeftClose,
  PanelLeft,
  X,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<IconName, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  "building-2": Building2,
  "users": Users,
  "credit-card": CreditCard,
  "dollar-sign": DollarSign,
  "bar-chart-3": BarChart3,
  "wallet": Wallet,
  "file-text": FileText,
  "clipboard-list": ClipboardList,
};

interface SidebarProps {
  items: NavItem[];
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ items, collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col h-[calc(100vh-3.5rem)] sticky top-14 border-r bg-sidebar transition-all duration-200 ease-out",
        collapsed ? "w-[60px]" : "w-[220px]"
      )}
    >
      <div className="flex-1 py-3 overflow-y-auto">
        <nav className="flex flex-col gap-0.5 px-2">
          {items.map((item) => {
            const Icon = iconMap[item.icon];
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                  collapsed && "justify-center px-0 w-9 h-9 mx-auto",
                  isActive
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                )} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t p-2">
        <button
          onClick={onToggle}
          className={cn(
            "flex items-center justify-center w-full rounded-lg p-2 text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors",
            !collapsed && "justify-start gap-2 px-3"
          )}
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

interface MobileSidebarProps {
  items: NavItem[];
  open: boolean;
  onClose: () => void;
}

export function MobileSidebar({ items, open, onClose }: MobileSidebarProps) {
  const pathname = usePathname();

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
        onClick={onClose}
      />

      <aside className="fixed inset-y-0 left-0 z-50 w-[280px] bg-sidebar border-r shadow-2xl lg:hidden animate-in slide-in-from-left-full duration-200">
        <div className="flex h-14 items-center justify-between border-b px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground">
              <Briefcase className="h-4 w-4 text-background" />
            </div>
            <span className="font-semibold">IPA</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex flex-col gap-0.5 p-3">
          {items.map((item) => {
            const Icon = iconMap[item.icon];
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
