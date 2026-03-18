import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

type StatusVariant =
  | "success"
  | "warning"
  | "error"
  | "info"
  | "default"
  | "muted";

interface StatusBadgeProps {
  variant?: StatusVariant;
  children: React.ReactNode;
  icon?: LucideIcon;
  dot?: boolean;
  className?: string;
}

const variantStyles: Record<StatusVariant, string> = {
  success:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
  warning:
    "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
  error: "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400",
  info: "bg-primary/10 text-primary dark:bg-primary/20",
  default:
    "bg-primary/10 text-primary dark:bg-primary/20",
  muted:
    "bg-muted text-muted-foreground",
};

const dotStyles: Record<StatusVariant, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
  info: "bg-primary",
  default: "bg-primary",
  muted: "bg-muted-foreground",
};

export function StatusBadge({
  variant = "default",
  children,
  icon: Icon,
  dot = false,
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-medium",
        variantStyles[variant],
        className
      )}
    >
      {dot && (
        <span
          className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotStyles[variant])}
        />
      )}
      {Icon && <Icon className="h-3 w-3 shrink-0" />}
      {children}
    </span>
  );
}
