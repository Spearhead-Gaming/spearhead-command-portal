import Link from "next/link";

import { StatusBadge, type BadgeTone } from "@/components/status/status-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CompactListItem = {
  actionHref?: string;
  actionLabel?: string;
  className?: string;
  leading?: React.ReactNode;
  meta?: string;
  selected?: boolean;
  statusLabel?: string;
  statusTone?: BadgeTone;
  subtitle?: string;
  title: string;
  unread?: boolean;
};

type CompactListProps = {
  emptyState?: React.ReactNode;
  items: CompactListItem[];
  label?: string;
  limit?: number;
};

export function CompactList({
  emptyState,
  items,
  label = "Compact list",
  limit,
}: CompactListProps) {
  const visibleItems = typeof limit === "number" ? items.slice(0, limit) : items;

  if (visibleItems.length === 0) {
    return emptyState ?? null;
  }

  return (
    <div aria-label={label} className="space-y-2" role="list">
      {visibleItems.map((item, index) => (
        <CompactListRow item={item} key={`${item.title}:${item.subtitle ?? item.meta ?? ""}:${index}`} />
      ))}
    </div>
  );
}

function CompactListRow({ item }: { item: CompactListItem }) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-start gap-3 rounded-xl border border-border/70 bg-background/40 p-3 transition-colors hover:bg-card/60",
        item.selected && "border-primary/45 bg-primary/10",
        item.unread && "border-info/40",
        item.className,
      )}
      role="listitem"
    >
      {item.leading ? <div className="mt-0.5 shrink-0">{item.leading}</div> : null}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
          {item.statusLabel ? (
            <StatusBadge label={item.statusLabel} tone={item.statusTone ?? "muted"} />
          ) : null}
        </div>
        {item.subtitle ? <p className="line-clamp-2 text-sm text-muted-foreground">{item.subtitle}</p> : null}
        {item.meta ? (
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {item.meta}
          </p>
        ) : null}
      </div>
      {item.actionHref && item.actionLabel ? (
        <Button asChild className="shrink-0" size="sm" variant="ghost">
          <Link href={item.actionHref}>{item.actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}
