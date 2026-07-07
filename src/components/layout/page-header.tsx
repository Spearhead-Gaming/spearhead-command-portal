import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { PlaceholderAction } from "@/types/placeholder-page";

type PageHeaderProps = {
  title: string;
  description: string;
  breadcrumbs?: string[];
  primaryAction?: PlaceholderAction;
  secondaryActions?: PlaceholderAction[];
  contextLabel?: string;
};

function HeaderActionButton({ action }: { action: PlaceholderAction }) {
  if (action.href) {
    return (
      <Button asChild variant={action.variant}>
        <Link href={action.href}>{action.label}</Link>
      </Button>
    );
  }

  return (
    <Button
      aria-disabled="true"
      disabled
      title={`${action.label} is not implemented yet.`}
      variant={action.variant}
    >
      {action.label}
    </Button>
  );
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  primaryAction,
  secondaryActions,
  contextLabel,
}: PageHeaderProps) {
  return (
    <section className="flex min-w-0 flex-col gap-5 rounded-2xl border border-border/70 bg-card/78 p-4 shadow-[0_12px_36px_rgba(3,8,16,0.26)] sm:p-6 lg:p-7">
      {breadcrumbs?.length ? (
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
        >
          {breadcrumbs.map((crumb, index) => (
            <div key={`${crumb}-${index}`} className="flex items-center gap-2">
              {index > 0 ? <ChevronRight className="h-3.5 w-3.5" /> : null}
              <span>{crumb}</span>
            </div>
          ))}
        </nav>
      ) : null}
      <div className="flex min-w-0 flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="min-w-0 break-words text-2xl font-semibold tracking-[0.01em] text-foreground sm:text-3xl xl:text-4xl">
              {title}
            </h1>
            {contextLabel ? (
              <span className="max-w-full truncate rounded-full border border-border bg-background/50 px-3 py-1 font-mono text-xs text-muted-foreground">
                {contextLabel}
              </span>
            ) : null}
          </div>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
            {description}
          </p>
        </div>
        {(primaryAction || secondaryActions?.length) ? (
          <div className="flex shrink-0 flex-wrap gap-3">
            {primaryAction ? <HeaderActionButton action={primaryAction} /> : null}
            {secondaryActions?.map((action) => (
              <HeaderActionButton
                action={{
                  ...action,
                  variant: action.variant ?? "outline",
                }}
                key={action.label}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
