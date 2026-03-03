"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  Menu,
  Search,
  LogOut,
  Briefcase,
  ChevronRight,
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
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle menu</span>
      </Button>

      {/* Logo - desktop */}
      <div className="hidden lg:flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
          <Briefcase className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-semibold">IPA</span>
      </div>

      {/* Breadcrumb / Page title */}
      <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">{pageTitle}</span>
      </div>

      {/* Search */}
      <div className="flex-1 flex justify-center max-w-md mx-auto">
        <div className="relative w-full hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search..."
            className="w-full pl-9 h-9 bg-muted/50 border-0 focus-visible:ring-1"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Search icon mobile */}
        <Button variant="ghost" size="icon" className="md:hidden">
          <Search className="h-5 w-5" />
        </Button>

        <ThemeToggle />

        {/* User menu */}
        <div className="hidden sm:flex items-center gap-3 pl-3 border-l">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="hidden lg:block">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatRole(user.role)}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Logout</span>
          </Button>
        </div>

        {/* Mobile logout */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          className="sm:hidden"
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
