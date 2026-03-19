"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/nav";
import { getPageTitle } from "@/lib/nav";
import { Topbar, type UserInfo } from "./Topbar";
import { Sidebar, MobileSidebar } from "./Sidebar";
import { RoleProvider } from "./RoleContext";

interface AppShellProps {
  user: UserInfo;
  navItems: NavItem[];
  permissions: string[];
  activeTenantId: string | null;
  children: React.ReactNode;
}

export function AppShell({ user, navItems, permissions, activeTenantId, children }: AppShellProps) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const pageTitle = getPageTitle(pathname, navItems);
  const isReadOnly = user.isReadOnly ?? false;

  const isFundsPage = pathname?.startsWith("/dashboard/funds") ?? false;

  return (
    <RoleProvider role={user.role} isReadOnly={isReadOnly}>
    <div className={cn(
      "min-h-screen",
      isFundsPage ? "bg-slate-200" : "bg-gradient-to-b from-slate-50 via-white to-slate-100"
    )}>
      <Topbar
        user={user}
        pageTitle={pageTitle}
        activeTenantId={activeTenantId}
        onMenuClick={() => setMobileMenuOpen(true)}
      />

      <div className="flex">
        <Sidebar
          items={navItems}
          permissions={permissions}
          role={user.role}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          variant={isFundsPage ? "dark" : "default"}
        />

        <MobileSidebar
          items={navItems}
          permissions={permissions}
          role={user.role}
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          variant={isFundsPage ? "dark" : "default"}
        />

        <main className={cn(
          "flex-1 min-h-[calc(100vh-3.5rem)]",
          isFundsPage ? "bg-slate-200" : "bg-gradient-to-b from-slate-50 via-white to-slate-100"
        )}>
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            <div className={cn(
              "rounded-3xl p-6 space-y-6",
              isFundsPage
                ? "bg-white shadow-xl border border-slate-300"
                : "bg-white/85 backdrop-blur-sm border border-slate-200/80 shadow-sm"
            )}>
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
    </RoleProvider>
  );
}
