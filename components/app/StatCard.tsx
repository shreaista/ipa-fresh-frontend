import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
}: StatCardProps) {
  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  return (
    <div
      className={cn(
        "group relative rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-[var(--shadow-card)] transition-all duration-200",
        "hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5 min-w-0 flex-1">
          <p className="text-[13px] font-medium text-muted-foreground truncate font-normal">
            {title}
          </p>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">
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
              "shrink-0 rounded-lg p-2.5 transition-colors",
              "bg-muted/50 group-hover:bg-primary/10"
            )}
          >
            <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        )}
      </div>
    </div>
  );
}
