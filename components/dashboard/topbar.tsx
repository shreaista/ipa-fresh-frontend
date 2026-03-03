"use client";

import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  Menu,
  Search,
  LogOut,
  Briefcase,
  User,
} from "lucide-react";
import type { SessionPayload } from "@/lib/types";

interface TopbarProps {
  user: SessionPayload;
  pageTitle: string;
  onMenuClick: () => void;
}

function formatRole(role: string): string {
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function Topbar({ user, pageTitle, onMenuClick }: TopbarProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-xl px-4 lg:px-5">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 -ml-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle menu</span>
      </button>

      {/* Logo - desktop */}
      <div className="hidden lg:flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground">
          <Briefcase className="h-3.5 w-3.5 text-background" />
        </div>
        <span className="font-semibold text-sm">IPA</span>
      </div>

      {/* Divider + Page title */}
      <div className="hidden sm:flex items-center gap-3 text-sm">
        <span className="text-border">/</span>
        <span className="font-medium">{pageTitle}</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <div className="hidden md:flex items-center">
        <button className="flex items-center gap-2 h-8 px-3 rounded-lg border bg-muted/40 text-muted-foreground text-sm hover:bg-muted transition-colors">
          <Search className="h-3.5 w-3.5" />
          <span>Search...</span>
          <kbd className="ml-4 pointer-events-none hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1">
        {/* Search icon mobile */}
        <button className="md:hidden p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
          <Search className="h-4 w-4" />
        </button>

        <ThemeToggle />

        {/* User menu */}
        <div className="flex items-center gap-1 ml-1 pl-2 border-l">
          <div className="hidden sm:flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-accent transition-colors cursor-default">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="hidden lg:block">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {formatRole(user.role)}
              </p>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
