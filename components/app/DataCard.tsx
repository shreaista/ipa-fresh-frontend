import { cn } from "@/lib/utils";

interface DataCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
  noPadding?: boolean;
}

export function DataCard({
  title,
  description,
  children,
  className,
  actions,
  noPadding = false,
}: DataCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-card overflow-hidden shadow-[var(--shadow-card)] transition-all duration-200 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5",
        className
      )}
    >
      <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6 sm:py-5 border-b border-border/60 bg-muted/30">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold truncate">{title}</h3>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate font-normal">
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
