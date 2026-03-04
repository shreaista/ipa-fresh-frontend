"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Badge } from "@/components/ui/badge";
import {
  Menu,
  Search,
  LogOut,
  Briefcase,
  ChevronDown,
  User,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TenantSwitcher } from "./TenantSwitcher";

export interface UserInfo {
  name: string;
  email: string;
  role: string;
}

interface TopbarProps {
  user: UserInfo;
  pageTitle: string;
  activeTenantId: string | null;
  onMenuClick: () => void;
}

function formatRole(role: string): string {
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function Topbar({ user, pageTitle, activeTenantId, onMenuClick }: TopbarProps) {
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const isSaasAdmin = user.role === "saas_admin";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 -ml-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle menu</span>
      </button>

      <div className="flex items-center gap-3">
        <div className="hidden lg:flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Briefcase className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold">IPA</span>
        </div>
        <span className="hidden sm:block text-border text-lg font-light">/</span>
        <span className="hidden sm:block text-sm font-medium">{pageTitle}</span>
      </div>

      <div className="flex-1" />

      {isSaasAdmin && (
        <TenantSwitcher activeTenantId={activeTenantId} />
      )}

      <div className="hidden md:flex items-center">
        <button className="flex items-center gap-2 h-9 px-3 rounded-lg border bg-muted/40 text-muted-foreground text-sm hover:bg-muted transition-colors min-w-[200px]">
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="pointer-events-none hidden lg:inline-flex h-5 items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button className="md:hidden p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          <Search className="h-5 w-5" />
        </button>

        <ThemeToggle />

        <div className="relative ml-2">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-1.5 pr-2 rounded-lg hover:bg-muted transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="h-4 w-4" />
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {formatRole(user.role)}
              </p>
            </div>
            <ChevronDown
              className={cn(
                "hidden lg:block h-4 w-4 text-muted-foreground transition-transform",
                userMenuOpen && "rotate-180"
              )}
            />
          </button>

          {userMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setUserMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border bg-card shadow-lg z-50 overflow-hidden">
                <div className="p-4 border-b bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="mt-3">
                    {formatRole(user.role)}
                  </Badge>
                </div>

                <div className="p-2">
                  <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                    <Settings className="h-4 w-4" />
                    Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
