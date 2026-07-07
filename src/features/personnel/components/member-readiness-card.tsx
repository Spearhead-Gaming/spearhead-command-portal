import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/status/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { MemberReadinessSummary } from "@/server/personnel/types";

type MemberReadinessCardProps = {
  readiness: MemberReadinessSummary | null;
  title?: string;
  description?: string;
  restrictedMessage?: string;
};

const readinessIconByTone = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: ShieldAlert,
  info: AlertTriangle,
  muted: AlertTriangle,
} as const;

export function MemberReadinessCard({
  readiness,
  title = "Readiness snapshot",
  description = "Simple operation-ready scoring based on status, attendance, qualification gaps, and active assignment context.",
  restrictedMessage = "Readiness detail is restricted until the viewer has service-record access.",
}: MemberReadinessCardProps) {
  if (!readiness) {
    return (
      <Card className="border-border/80 bg-card/88">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState description={restrictedMessage} title="Readiness unavailable" />
        </CardContent>
      </Card>
    );
  }

  const Icon = readinessIconByTone[readiness.tone];

  return (
    <Card className="border-border/80 bg-card/88">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-background/45 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-background/70 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{readiness.statusLabel}</p>
              <p className="text-sm text-muted-foreground">{readiness.summary}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge label={readiness.statusLabel} tone={readiness.tone} />
            <p className="text-2xl font-semibold text-foreground">
              {readiness.score !== null ? `${readiness.score}%` : "N/A"}
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-border/70 bg-background/45 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Status</p>
            <p className="mt-2 text-lg font-semibold text-foreground">{readiness.profileStatusLabel}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/45 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Attendance</p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {readiness.attendanceRate !== null ? `${readiness.attendanceRate}%` : "N/A"}
            </p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/45 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Assignment</p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {readiness.hasActiveUnitAssignment ? readiness.unitLabel ?? "Assigned" : "Unassigned"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {readiness.positionLabel ?? "Position not set"}
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-border/70 bg-background/45 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">Missing required qualifications</p>
            <StatusBadge
              label={String(readiness.missingRequirementCount)}
              tone={readiness.missingRequirementCount > 0 ? "warning" : "success"}
            />
          </div>
          {readiness.missingRequirementLabels.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {readiness.missingRequirementLabels.map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-xs font-medium text-warning"
                >
                  {label}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              No required qualification gaps are currently visible.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
