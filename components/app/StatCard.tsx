import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: "up" | "down" | "neutral";
  className?: string;
  /** Soft tinted icon circle: amber, blue, emerald, violet */
  iconTint?: "amber" | "blue" | "emerald" | "violet";
  /** Optional className for the value (metric number) */
  valueClassName?: string;
  /** Optional className for the icon wrapper (overrides iconTint when set) */
  iconClassName?: string;
}

const iconTintStyles: Record<NonNullable<StatCardProps["iconTint"]>, string> = {
  amber: "bg-amber-100 text-amber-700",
  blue: "bg-blue-100 text-blue-700",
  emerald: "bg-emerald-100 text-emerald-700",
  violet: "bg-violet-100 text-violet-700",
};

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
  iconTint,
  valueClassName,
  iconClassName,
}: StatCardProps) {
  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  return (
    <div
      className={cn(
        "group relative rounded-2xl border border-slate-200 bg-card p-5 sm:p-6 shadow-sm transition-all duration-200 hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5 min-w-0 flex-1">
          <p className="text-[13px] font-medium text-slate-500 truncate font-normal">
            {title}
          </p>
          <p className={cn("text-2xl font-semibold tracking-tight tabular-nums text-slate-900", valueClassName)}>
            {value}
          </p>
          {description && (
            <div className="flex items-center gap-1.5 pt-0.5">
              {trend && trend !== "neutral" && (
                <TrendIcon
                  className={cn("h-3.5 w-3.5 shrink-0", {
                    "text-emerald-600 dark:text-emerald-400": trend === "up",
                    "text-red-500 dark:text-red-400": trend === "down",
                  })}
                />
              )}
              <p
                className={cn("text-xs truncate", {
                  "text-emerald-600 dark:text-emerald-400": trend === "up",
                  "text-red-500 dark:text-red-400": trend === "down",
                  "text-muted-foreground": trend === "neutral" || !trend,
                })}
              >
                {description}
              </p>
            </div>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              "shrink-0 rounded-xl p-3 transition-colors",
              iconClassName ?? (iconTint ? iconTintStyles[iconTint] : "bg-slate-100 text-slate-600 group-hover:bg-slate-200")
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}
