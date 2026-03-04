"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown, Globe, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Mock tenant list for demo
const MOCK_TENANTS = [
  { id: "tenant-001", name: "Acme Foundation" },
  { id: "tenant-002", name: "Beta Grants Inc" },
  { id: "tenant-003", name: "Community Trust" },
];

interface TenantSwitcherProps {
  activeTenantId: string | null;
}

export function TenantSwitcher({ activeTenantId }: TenantSwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const currentTenant = MOCK_TENANTS.find((t) => t.id === activeTenantId);

  async function handleSelectTenant(tenantId: string) {
    setLoading(true);
    try {
      await fetch("/api/me/tenant/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      router.refresh();
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }

  async function handleClearTenant() {
    setLoading(true);
    try {
      await fetch("/api/me/tenant/clear", { method: "POST" });
      router.refresh();
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        className={cn(
          "flex items-center gap-2 h-9 px-3 rounded-lg border text-sm transition-colors",
          activeTenantId
            ? "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-900/30"
            : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
        )}
      >
        {activeTenantId ? (
          <Building2 className="h-4 w-4" />
        ) : (
          <Globe className="h-4 w-4" />
        )}
        <span className="max-w-[120px] truncate">
          {currentTenant?.name || "Global"}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border bg-card shadow-lg z-50 overflow-hidden">
            <div className="p-2 border-b">
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                View as Tenant
              </p>
            </div>
            <div className="p-2 max-h-64 overflow-y-auto">
              <button
                onClick={handleClearTenant}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  !activeTenantId
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-muted"
                )}
              >
                <Globe className="h-4 w-4" />
                <span className="flex-1 text-left">Global (no tenant)</span>
                {!activeTenantId && <Check className="h-4 w-4" />}
              </button>

              <div className="my-2 border-t" />

              {MOCK_TENANTS.map((tenant) => (
                <button
                  key={tenant.id}
                  onClick={() => handleSelectTenant(tenant.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    activeTenantId === tenant.id
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <Building2 className="h-4 w-4" />
                  <span className="flex-1 text-left truncate">{tenant.name}</span>
                  {activeTenantId === tenant.id && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
