import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { StatusBadge, type BadgeTone } from "@/components/status/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type CollapsibleSectionProps = {
  badgeLabel?: string;
  badgeTone?: BadgeTone;
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
  description?: string;
  title: string;
};

export function CollapsibleSection({
  badgeLabel,
  badgeTone = "muted",
  children,
  className,
  defaultOpen = false,
  description,
  title,
}: CollapsibleSectionProps) {
  return (
    <details
      className={cn(
        "group overflow-hidden rounded-2xl border border-border/75 bg-card/72 shadow-sm shadow-black/10",
        className,
      )}
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-4 transition hover:bg-muted/20 sm:p-5 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
            {badgeLabel ? <StatusBadge label={badgeLabel} tone={badgeTone} /> : null}
          </div>
          {description ? (
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition group-open:rotate-180" />
      </summary>
      <div className="border-t border-border/60 p-4 sm:p-5">{children}</div>
    </details>
  );
}

type AttentionItem = {
  actionLabel?: string;
  href?: string;
  label: string;
  meta?: string;
  tone?: BadgeTone;
};

type AttentionPanelProps = {
  emptyDescription?: string;
  emptyTitle?: string;
  items: AttentionItem[];
  title?: string;
};

export function AttentionPanel({
  emptyDescription = "Nothing needs immediate action right now.",
  emptyTitle = "All clear",
  items,
  title = "Needs attention",
}: AttentionPanelProps) {
  return (
    <Card className="border-amber-500/20 bg-amber-500/[0.045]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Only the most actionable signals stay expanded by default.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-xl border border-border/70 bg-background/35 p-4">
            <p className="font-semibold text-foreground">{emptyTitle}</p>
            <p className="mt-1 text-sm text-muted-foreground">{emptyDescription}</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              className="flex flex-col gap-3 rounded-xl border border-border/70 bg-background/45 p-3 sm:flex-row sm:items-center sm:justify-between"
              key={`${item.label}-${item.meta ?? "attention"}`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-foreground">{item.label}</p>
                  <StatusBadge label={item.tone === "danger" ? "High" : "Review"} tone={item.tone ?? "warning"} />
                </div>
                {item.meta ? <p className="mt-1 text-sm text-muted-foreground">{item.meta}</p> : null}
              </div>
              {item.href && item.actionLabel ? (
                <Button asChild size="sm" variant="outline">
                  <a href={item.href}>{item.actionLabel}</a>
                </Button>
              ) : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

type SummaryCardProps = {
  action?: ReactNode;
  description?: string;
  status?: ReactNode;
  title: string;
  value: ReactNode;
};

export function SummaryCard({ action, description, status, title, value }: SummaryCardProps) {
  return (
    <Card className="border-border/75 bg-card/78">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardDescription>{title}</CardDescription>
            <CardTitle className="mt-2 text-2xl">{value}</CardTitle>
          </div>
          {status}
        </div>
      </CardHeader>
      {(description || action) ? (
        <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
          {description ? <p>{description}</p> : null}
          {action}
        </CardContent>
      ) : null}
    </Card>
  );
}

type MetadataListProps = {
  items: Array<{
    label: string;
    value: ReactNode;
  }>;
};

export function MetadataList({ items }: MetadataListProps) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div className="rounded-xl border border-border/60 bg-background/35 p-3" key={item.label}>
          <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{item.label}</dt>
          <dd className="mt-1 text-sm font-medium text-foreground">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
