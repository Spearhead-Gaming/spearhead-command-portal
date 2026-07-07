import { ShieldCheck } from "lucide-react";

import { AttendanceBadge } from "@/components/status/attendance-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ReadinessCardProps = {
  label: string;
  value: string;
  hint: string;
  statusLabel?: string;
};

export function ReadinessCard({
  label,
  value,
  hint,
  statusLabel = "Readiness placeholder",
}: ReadinessCardProps) {
  return (
    <Card className="h-full border-border/70 bg-gradient-to-br from-card to-background/70">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-base">{label}</CardTitle>
            <CardDescription>{hint}</CardDescription>
          </div>
          <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-success/20 bg-success/10 text-success">
            <ShieldCheck className="h-4 w-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="font-mono text-3xl font-semibold tracking-tight text-foreground">
          {value}
        </div>
        <AttendanceBadge label={statusLabel} />
      </CardContent>
    </Card>
  );
}
