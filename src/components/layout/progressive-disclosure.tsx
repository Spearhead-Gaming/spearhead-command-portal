import type { ReactNode } from "react";
import { AlertTriangle, ChevronDown } from "lucide-react";

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
  affectedEntity?: string;
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

type NeedsAttentionProps = AttentionPanelProps & {
  description?: string;
};

export function NeedsAttention({
  description = "Specific issues that have a next action stay visible; diagnostics and history should live below.",
  emptyDescription = "Nothing needs immediate action right now.",
  emptyTitle = "All clear",
  items,
  title = "Needs attention",
}: NeedsAttentionProps) {
  return (
    <Card className="border-amber-500/25 bg-amber-500/[0.05]">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-amber-500/25 bg-amber-500/10 text-amber-200">
            <AlertTriangle aria-hidden="true" className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
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
              className="flex flex-col gap-3 rounded-xl border border-border/70 bg-background/50 p-3 sm:flex-row sm:items-center sm:justify-between"
              key={`${item.label}-${item.meta ?? item.affectedEntity ?? "attention"}`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-foreground">{item.label}</p>
                  <StatusBadge label={item.tone === "danger" ? "Critical" : "Review"} tone={item.tone ?? "warning"} />
                </div>
                {item.affectedEntity ? (
                  <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    {item.affectedEntity}
                  </p>
                ) : null}
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

type CompactMetricProps = {
  className?: string;
  hint?: string;
  label: string;
  tone?: BadgeTone;
  value: ReactNode;
};

export function CompactMetric({ className, hint, label, tone = "muted", value }: CompactMetricProps) {
  return (
    <div className={cn("rounded-xl border border-border/65 bg-background/38 p-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
        <StatusBadge label={typeof value === "string" || typeof value === "number" ? String(value) : "Set"} tone={tone} />
      </div>
      {typeof value === "string" || typeof value === "number" ? null : (
        <div className="mt-2 text-sm font-semibold text-foreground">{value}</div>
      )}
      {hint ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{hint}</p> : null}
    </div>
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

type AdvancedFiltersProps = {
  children: ReactNode;
  className?: string;
  description?: string;
  resultCount?: number;
  title?: string;
};

export function AdvancedFilters({
  children,
  className,
  description = "Use these only when the default view is too broad.",
  resultCount,
  title = "Advanced filters",
}: AdvancedFiltersProps) {
  return (
    <CollapsibleSection
      badgeLabel={resultCount === undefined ? "Optional" : `${resultCount} result${resultCount === 1 ? "" : "s"}`}
      badgeTone="muted"
      className={className}
      description={description}
      title={title}
    >
      {children}
    </CollapsibleSection>
  );
}

type RecentActivityPreviewProps = {
  emptyDescription?: string;
  emptyTitle?: string;
  items: Array<{
    id: string;
    meta?: string;
    statusLabel?: string;
    summary: string;
    tone?: BadgeTone;
  }>;
  limit?: number;
};

export function RecentActivityPreview({
  emptyDescription = "History appears here after meaningful actions are recorded.",
  emptyTitle = "No recent activity",
  items,
  limit = 5,
}: RecentActivityPreviewProps) {
  const visibleItems = items.slice(0, limit);

  if (visibleItems.length === 0) {
    return (
      <div className="rounded-xl border border-border/70 bg-background/35 p-4">
        <p className="font-semibold text-foreground">{emptyTitle}</p>
        <p className="mt-1 text-sm text-muted-foreground">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {visibleItems.map((item) => (
        <div key={item.id} className="rounded-xl border border-border/70 bg-background/40 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{item.summary}</p>
              {item.meta ? <p className="mt-1 text-sm text-muted-foreground">{item.meta}</p> : null}
            </div>
            {item.statusLabel ? <StatusBadge label={item.statusLabel} tone={item.tone ?? "muted"} /> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

type InspectorSummaryProps = {
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  subtitle?: string;
  title: string;
};

export function InspectorSummary({ action, children, className, subtitle, title }: InspectorSummaryProps) {
  return (
    <div className={cn("rounded-2xl border border-border/70 bg-background/45 p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{title}</p>
          {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

type InlineIssueProps = {
  action?: ReactNode;
  description: string;
  title: string;
  tone?: BadgeTone;
};

export function InlineIssue({ action, description, title, tone = "warning" }: InlineIssueProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-background/45 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-foreground">{title}</p>
          <StatusBadge label={tone === "danger" ? "Critical" : "Attention"} tone={tone} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

type StatusSummaryProps = {
  items: Array<{
    label: string;
    tone?: BadgeTone;
    value: ReactNode;
  }>;
};

export function StatusSummary({ items }: StatusSummaryProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <CompactMetric key={item.label} label={item.label} tone={item.tone} value={item.value} />
      ))}
    </div>
  );
}

type DetailTabsProps = {
  items: Array<{
    href: string;
    isActive?: boolean;
    label: string;
  }>;
};

export function DetailTabs({ items }: DetailTabsProps) {
  return (
    <nav aria-label="Detail sections" className="flex gap-2 overflow-x-auto rounded-xl border border-border/70 bg-background/35 p-1">
      {items.map((item) => (
        <a
          aria-current={item.isActive ? "page" : undefined}
          className={cn(
            "shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted/30 hover:text-foreground",
            item.isActive ? "bg-primary/15 text-primary" : null,
          )}
          href={item.href}
          key={item.href}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
