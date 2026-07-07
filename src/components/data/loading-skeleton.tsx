import { cn } from "@/lib/utils";

type LoadingSkeletonProps = {
  className?: string;
  rows?: number;
};

export function LoadingSkeleton({
  className,
  rows = 3,
}: LoadingSkeletonProps) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={cn("space-y-3 rounded-2xl border border-border/70 bg-card/60 p-5", className)}
      role="status"
    >
      <span className="sr-only">Loading portal content</span>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          aria-hidden="true"
          key={`skeleton-${index}`}
          className={cn(
            "animate-pulse rounded-lg bg-linear-to-r from-background/80 via-secondary/60 to-background/80",
            index === 0 ? "h-5 w-2/5" : "h-4 w-full",
          )}
        />
      ))}
    </div>
  );
}
