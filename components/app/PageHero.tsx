import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export type PageHeroVariant =
  | "funds"      // amber/orange
  | "proposals"  // blue/cyan
  | "reports"    // emerald/teal
  | "audit"      // slate/zinc
  | "default";   // neutral

const variantGradients: Record<PageHeroVariant, string> = {
  funds: "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200/60",
  proposals: "bg-gradient-to-r from-indigo-50 via-blue-50 to-indigo-100 border-indigo-200/60 shadow-[0_0_0_1px_rgba(99,102,241,0.08)]",
  reports: "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200/60",
  audit: "bg-gradient-to-r from-slate-50 to-zinc-100 border-slate-200/60",
  default: "bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200/60",
};

interface PageHeroProps {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  variant?: PageHeroVariant;
  icon?: LucideIcon;
  className?: string;
}

export function PageHero({ title, subtitle, actions, variant = "default", icon: Icon, className }: PageHeroProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-6 shadow-sm transition-all",
        variantGradients[variant],
        className
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          {Icon && (
            <div className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
              variant === "funds" && "bg-amber-100 text-amber-700",
              variant === "proposals" && "bg-indigo-100 text-indigo-700",
              variant === "reports" && "bg-emerald-100 text-emerald-700",
              variant === "audit" && "bg-slate-200 text-slate-600",
              variant === "default" && "bg-slate-200 text-slate-600"
            )}>
              <Icon className="h-6 w-6" />
            </div>
          )}
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
            {subtitle && (
              <div className="text-sm text-slate-500">{subtitle}</div>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
