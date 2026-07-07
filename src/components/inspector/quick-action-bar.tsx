import { Bolt, Sparkles } from "lucide-react";
import Link from "next/link";

import { ConfirmDialogPlaceholder } from "@/components/feedback/confirm-dialog-placeholder";
import { ActionMenu } from "@/components/inspector/action-menu";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { PlaceholderAction } from "@/types/placeholder-page";

type QuickActionBarProps = {
  primaryAction?: PlaceholderAction;
  secondaryActions?: PlaceholderAction[];
  extraActions?: string[];
  onInspect?: () => void;
  inspectLabel?: string;
};

function QuickActionButton({ action }: { action: PlaceholderAction }) {
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

export function QuickActionBar({
  primaryAction,
  secondaryActions,
  extraActions,
  onInspect,
  inspectLabel = "Inspect Placeholder",
}: QuickActionBarProps) {
  return (
    <Card className="border-border/80 bg-card/72">
      <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <Bolt className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Quick actions</p>
            <p className="text-sm text-muted-foreground">
              Keep common actions one click away while the underlying workflows are still placeholders.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {primaryAction ? <QuickActionButton action={primaryAction} /> : null}
          {secondaryActions?.map((action) => (
            <QuickActionButton
              action={{
                ...action,
                variant: action.variant ?? "outline",
              }}
              key={action.label}
            />
          ))}
          {onInspect ? (
            <Button onClick={onInspect} variant="secondary">
              <Sparkles className="h-4 w-4" />
              {inspectLabel}
            </Button>
          ) : null}
          <ConfirmDialogPlaceholder triggerLabel="Confirm Action" />
          <ActionMenu items={extraActions} />
        </div>
      </CardContent>
    </Card>
  );
}
