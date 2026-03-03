"use client";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
      <h2 className="text-xl font-semibold mb-4">Something went wrong in Dashboard.</h2>

      <pre className="text-xs bg-muted p-4 rounded mb-6 max-w-md overflow-auto">
        {error.message || "Unknown error"}
      </pre>

      <button
        onClick={reset}
        className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
      >
        Try again
      </button>
    </div>
  );
}
