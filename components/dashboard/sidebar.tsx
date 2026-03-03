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
  ChevronLeft,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

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
        "hidden lg:flex flex-col h-[calc(100vh-3.5rem)] sticky top-14 border-r bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-56"
      )}
    >
      <div className="flex-1 py-4">
        <nav className="flex flex-col gap-1 px-2">
          {items.map((item) => {
            const Icon = iconMap[item.icon];
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  collapsed && "justify-center px-2",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={cn("w-full justify-center", !collapsed && "justify-start")}
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform",
              collapsed && "rotate-180"
            )}
          />
          {!collapsed && <span className="ml-2 text-xs">Collapse</span>}
        </Button>
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
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        onClick={onClose}
      />

      {/* Drawer */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r shadow-xl lg:hidden animate-in slide-in-from-left duration-300">
        <div className="flex h-14 items-center gap-3 border-b px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
            <Briefcase className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold">IPA</span>
        </div>

        <nav className="flex flex-col gap-1 p-4">
          {items.map((item) => {
            const Icon = iconMap[item.icon];
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
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
