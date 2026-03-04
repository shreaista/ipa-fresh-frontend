"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/nav";
import { getPageTitle } from "@/lib/nav";
import { Topbar, type UserInfo } from "./Topbar";
import { Sidebar, MobileSidebar } from "./Sidebar";

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

  return (
    <div className="min-h-screen bg-muted/30">
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
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        <MobileSidebar
          items={navItems}
          permissions={permissions}
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        <main className="flex-1 min-h-[calc(100vh-3.5rem)]">
          <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
