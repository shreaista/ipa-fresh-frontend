import { cn } from "@/lib/utils";

interface SectionContainerProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}

export function SectionContainer({
  children,
  className,
  title,
  description,
  actions,
}: SectionContainerProps) {
  return (
    <section className={cn("space-y-4", className)}>
      {(title || description || actions) && (
        <div className="flex items-start justify-between gap-4">
          <div>
            {title && (
              <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            )}
            {description && (
              <p className="text-sm text-muted-foreground mt-0.5 font-normal">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
