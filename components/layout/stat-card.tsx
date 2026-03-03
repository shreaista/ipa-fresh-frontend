import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

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
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-5 transition-all duration-200 hover:shadow-sm",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
          {description && (
            <div className="flex items-center gap-1">
              {trend === "up" && (
                <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              )}
              {trend === "down" && (
                <TrendingDown className="h-3 w-3 text-red-600 dark:text-red-400" />
              )}
              <p
                className={cn("text-xs", {
                  "text-emerald-600 dark:text-emerald-400": trend === "up",
                  "text-red-600 dark:text-red-400": trend === "down",
                  "text-muted-foreground": trend === "neutral" || !trend,
                })}
              >
                {description}
              </p>
            </div>
          )}
        </div>
        {Icon && (
          <div className="rounded-lg bg-muted/50 p-2.5">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}
