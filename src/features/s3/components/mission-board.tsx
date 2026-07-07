import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge, type BadgeTone } from "@/components/status/status-badge";
import { UnitBadge } from "@/components/status/unit-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/formatters";
import { MissionLifecycleStepper } from "@/features/s3/components/mission-lifecycle-stepper";

export type MissionBoardAction = {
  href: string;
  label: string;
  variant?: "default" | "outline" | "ghost";
};

export type MissionBoardItem = {
  id: string;
  title: string;
  description: string | null;
  eventType: string;
  eventTypeLabel: string;
  missionStatus: string;
  missionStatusLabel: string;
  startsAt: Date;
  hostUnitShortName: string | null;
  campaignTitle: string | null;
  participatingUnitsSummary: string | null;
  missingConop: boolean;
  missingAar: boolean;
  latestConopStatusLabel: string | null;
  latestAarStatusLabel: string | null;
  expectedAttendanceCount: number;
  rsvpCounts: {
    yes: number;
    no: number;
    maybe: number;
    missing: number;
  };
  finalAttendanceCounts: {
    present: number;
    absent: number;
    excused: number;
    late: number;
    loa: number;
    pending: number;
  };
  inspectHref: string;
  eventHref: string;
  actions: MissionBoardAction[];
};

export type MissionBoardColumn = {
  description: string;
  emptyDescription: string;
  emptyTitle: string;
  items: MissionBoardItem[];
  key: string;
  title: string;
};

function getMissionTone(status: string): BadgeTone {
  switch (status) {
    case "published":
    case "completed":
    case "aar-submitted":
      return "success";
    case "s3-review":
      return "warning";
    case "approved":
      return "info";
    case "archived":
      return "muted";
    default:
      return "muted";
  }
}

export function MissionBoard({
  columns,
}: {
  columns: MissionBoardColumn[];
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
      {columns.map((column) => (
        <Card key={column.key} className="border-border/80 bg-card/88">
          <CardHeader className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>{column.title}</CardTitle>
                <CardDescription>{column.description}</CardDescription>
              </div>
              <StatusBadge label={String(column.items.length)} tone="info" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {column.items.length > 0 ? (
              column.items.map((mission) => (
                <Card key={mission.id} className="border-border/70 bg-background/45">
                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <CardTitle className="text-lg">{mission.title}</CardTitle>
                        <CardDescription>
                          {formatDateTime(mission.startsAt)} / {mission.eventTypeLabel}
                        </CardDescription>
                      </div>
                      <StatusBadge
                        label={mission.missionStatusLabel}
                        tone={getMissionTone(mission.missionStatus)}
                      />
                    </div>
                    <MissionLifecycleStepper compact currentStatus={mission.missionStatus} />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {mission.hostUnitShortName ? (
                        <UnitBadge label={mission.hostUnitShortName} />
                      ) : (
                        <StatusBadge label="Unscoped" tone="muted" />
                      )}
                      {mission.campaignTitle ? (
                        <StatusBadge label={mission.campaignTitle} tone="info" />
                      ) : null}
                      {mission.missingConop ? (
                        <StatusBadge label="Missing published CONOP" tone="warning" />
                      ) : null}
                      {mission.missingAar ? (
                        <StatusBadge label="Patrol AAR needed" tone="danger" />
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {mission.description ?? "No operation brief has been written yet."}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-border/70 bg-card/70 p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          Attendance
                        </p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                          {mission.rsvpCounts.yes + mission.rsvpCounts.no + mission.rsvpCounts.maybe}/
                          {mission.expectedAttendanceCount} responded
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {mission.rsvpCounts.missing} missing RSVP / {mission.finalAttendanceCounts.pending} pending closeout
                        </p>
                      </div>
                      <div className="rounded-xl border border-border/70 bg-card/70 p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          CONOP / AAR
                        </p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                          {mission.latestConopStatusLabel ?? "No CONOP"} /{" "}
                          {mission.eventType === "patrol"
                            ? mission.latestAarStatusLabel ?? "Patrol AAR needed"
                            : "No AAR required"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {mission.participatingUnitsSummary ?? "Unit tasking is managed per deployment week."}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button asChild size="sm">
                        <Link href={mission.inspectHref}>Inspect</Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link href={mission.eventHref}>Open operation</Link>
                      </Button>
                      {mission.actions.map((action) => (
                        <Button asChild key={`${mission.id}-${action.label}`} size="sm" variant={action.variant ?? "outline"}>
                          <Link href={action.href}>{action.label}</Link>
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <EmptyState
                description={column.emptyDescription}
                title={column.emptyTitle}
              />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
