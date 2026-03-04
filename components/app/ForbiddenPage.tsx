import { ShieldX } from "lucide-react";
import Link from "next/link";

interface ForbiddenPageProps {
  message?: string;
  title?: string;
}

export function ForbiddenPage({
  message = "You don't have permission to access this page.",
  title = "Access Denied",
}: ForbiddenPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="rounded-full bg-destructive/10 p-4 mb-6">
        <ShieldX className="h-12 w-12 text-destructive" />
      </div>
      <h1 className="text-2xl font-semibold mb-2">{title}</h1>
      <p className="text-muted-foreground mb-6 max-w-md">{message}</p>
      <Link
        href="/dashboard"
        className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
