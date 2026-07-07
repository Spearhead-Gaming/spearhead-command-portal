import type { LucideIcon } from "lucide-react";

import { StatusBadge } from "@/components/status/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type DashboardWidgetProps = {
  title: string;
  value: string;
  description: string;
  icon?: LucideIcon;
  tone?: "info" | "success" | "warning" | "danger" | "muted";
  footer?: string;
};

export function DashboardWidget({
  title,
  value,
  description,
  icon: Icon,
  tone = "info",
  footer,
}: DashboardWidgetProps) {
  return (
    <Card className="h-full border-border/70 bg-card/94">
      <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {Icon ? (
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-background/55 text-primary">
              <Icon className="h-4 w-4" />
            </div>
          ) : null}
          <StatusBadge label="Widget" tone={tone} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="break-words font-mono text-3xl font-semibold tracking-tight text-foreground">
          {value}
        </div>
        {footer ? (
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            {footer}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
