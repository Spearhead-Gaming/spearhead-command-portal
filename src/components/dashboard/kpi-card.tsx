import { ArrowUpRight } from "lucide-react";

import { StatusBadge } from "@/components/status/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type KpiCardProps = {
  label: string;
  value: string;
  hint: string;
  trend?: string;
  tone?: "info" | "success" | "warning" | "danger" | "muted";
};

export function KpiCard({
  label,
  value,
  hint,
  trend = "Stable placeholder",
  tone = "info",
}: KpiCardProps) {
  return (
    <Card className="h-full border-border/70 bg-card/92">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-base">{label}</CardTitle>
            <CardDescription>{hint}</CardDescription>
          </div>
          <StatusBadge className="self-start" label="KPI" tone={tone} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="font-mono text-3xl font-semibold tracking-tight text-foreground">
          {value}
        </div>
        <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-border/70 bg-background/45 px-3 py-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
          <ArrowUpRight className="h-3.5 w-3.5 text-accent" />
          <span className="truncate">{trend}</span>
        </div>
      </CardContent>
    </Card>
  );
}
