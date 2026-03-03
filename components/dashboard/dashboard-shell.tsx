"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import type { SessionPayload } from "@/lib/types";
import { NavItem, getPageTitle } from "@/lib/nav";
import { Topbar } from "./topbar";
import { Sidebar, MobileSidebar } from "./sidebar";

interface DashboardShellProps {
  user: SessionPayload;
  navItems: NavItem[];
  children: React.ReactNode;
}

export function DashboardShell({
  user,
  navItems,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const pageTitle = getPageTitle(pathname, navItems);

  return (
    <div className="min-h-screen bg-background">
      <Topbar
        user={user}
        pageTitle={pageTitle}
        onMenuClick={() => setMobileMenuOpen(true)}
      />

      <div className="flex">
        <Sidebar
          items={navItems}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        <MobileSidebar
          items={navItems}
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        <main className="flex-1 overflow-auto">
          <div className="container max-w-6xl py-6 px-4 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
