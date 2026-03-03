import { cn } from "@/lib/utils";

interface DataCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

export function DataCard({ title, children, className, actions }: DataCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card overflow-hidden",
        className
      )}
    >
      <div className="flex items-center justify-between gap-4 px-5 py-4 border-b bg-muted/30">
        <h3 className="text-sm font-semibold">{title}</h3>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
