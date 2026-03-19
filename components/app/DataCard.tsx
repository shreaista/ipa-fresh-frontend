import { cn } from "@/lib/utils";

interface DataCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
  noPadding?: boolean;
  titleClassName?: string;
  titleBadges?: React.ReactNode;
  /** Subtle colored top border: amber, blue, violet, indigo, emerald, rose */
  accent?: "amber" | "blue" | "violet" | "indigo" | "emerald" | "rose";
}

const accentBorder: Record<NonNullable<DataCardProps["accent"]>, string> = {
  amber: "border-t-2 border-t-amber-400/60",
  blue: "border-t-2 border-t-blue-400/60",
  violet: "border-t-2 border-t-violet-400/60",
  indigo: "border-t-2 border-t-indigo-400/60",
  emerald: "border-t-2 border-t-emerald-400/60",
  rose: "border-t-2 border-t-rose-400/60",
};

export function DataCard({
  title,
  description,
  children,
  className,
  actions,
  noPadding = false,
  titleClassName,
  titleBadges,
  accent,
}: DataCardProps) {
  return (
    <div
    className={cn(
      "rounded-2xl border border-slate-200 bg-card overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md",
      accent && accentBorder[accent],
      className
    )}
  >
      <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-200/80 bg-muted/30">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={cn("text-lg font-semibold text-slate-900 truncate", titleClassName)}>{title}</h3>
            {titleBadges}
          </div>
          {description && (
            <p className="text-sm text-slate-500 mt-0.5 truncate font-normal">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      <div className={cn({ "p-5 sm:p-6": !noPadding })}>{children}</div>
    </div>
  );
}
