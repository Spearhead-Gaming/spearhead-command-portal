"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ServiceTimeline } from "@/components/activity/service-timeline";
import { InspectorDrawer } from "@/components/inspector/inspector-drawer";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/status/status-badge";
import { UnitBadge } from "@/components/status/unit-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/formatters";
import { MissionLifecycleStepper } from "@/features/s3/components/mission-lifecycle-stepper";
import type { MissionDetail } from "@/server/s3/types";

type MissionInspectorActionLinks = {
  approveHref?: string;
  archiveHref?: string;
  editHref?: string;
  eventHref: string;
  publishHref?: string;
  rejectHref?: string;
  reviewHref?: string;
  statusHref?: string;
};

function getMissionTone(status: string) {
  switch (status) {
    case "published":
    case "completed":
    case "aar-submitted":
      return "success" as const;
    case "s3-review":
      return "warning" as const;
    case "approved":
      return "info" as const;
    case "archived":
      return "muted" as const;
    default:
      return "muted" as const;
  }
}

export function MissionInspectorDrawer({
  actionLinks,
  closeHref,
  mission,
  open,
}: {
  actionLinks: MissionInspectorActionLinks;
  closeHref: string;
  mission: MissionDetail | null;
  open: boolean;
}) {
  const router = useRouter();

  if (!mission) {
    return null;
  }

  const campaignTabContent = mission.campaign ? (
    <Card className="border-border/70 bg-background/45">
      <CardHeader>
        <CardTitle>{mission.campaign.title}</CardTitle>
        <CardDescription>
          Deployment context stays attached to the operation record instead of forcing a full page jump.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <StatusBadge label={mission.campaign.status} tone="info" />
          {mission.hostUnit ? <UnitBadge label={mission.hostUnit.shortName} /> : null}
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href={`/operations/campaigns/${mission.campaign.id}`}>Open deployment detail</Link>
        </Button>
      </CardContent>
    </Card>
  ) : (
    <EmptyState
      description="This operation is not linked to a deployment yet."
      title="No linked deployment"
    />
  );

  return (
    <InspectorDrawer
      onClose={() => router.replace(closeHref)}
      open={open}
      sections={[]}
      statusBadge={{
        label: mission.missionStatusLabel,
        tone: getMissionTone(mission.missionStatus),
      }}
      subtitle="Operation inspector keeps lifecycle state, CONOP/AAR records, attendance readiness, Zeus ownership, and deployment context visible without losing the S3 queue."
      tabPanels={[
        {
          label: "Overview",
          content: (
            <div className="space-y-4">
              <Card className="border-border/70 bg-background/45">
                <CardHeader>
                  <CardTitle>Lifecycle</CardTitle>
                  <CardDescription>
                    Operation status remains aligned to the documented Draft through Archived flow.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <MissionLifecycleStepper currentStatus={mission.missionStatus} />
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge label={mission.statusLabel} tone="info" />
                    {mission.hostUnit ? <UnitBadge label={mission.hostUnit.shortName} /> : null}
                    {mission.campaign ? <StatusBadge label={mission.campaign.title} tone="info" /> : null}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border/70 bg-card/70 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Window</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {formatDateTime(mission.startsAt)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {mission.endsAt ? `Ends ${formatDateTime(mission.endsAt)}` : "End time not set"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-card/70 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Assignments</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {mission.missionMakerName ?? "Planner TBD"} / {mission.zeusName ?? "Zeus TBD"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {mission.missionCommanderName ?? "Operation lead not assigned"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-card/70 p-3 sm:col-span-2">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        Operation version
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {mission.operationVersionLabel ?? "No version label"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {mission.selectedOperationVersion ?? "No selected branch/path recorded yet"}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {mission.description ?? "No operation brief has been documented yet."}
                  </p>
                </CardContent>
              </Card>
            </div>
          ),
        },
        {
          label: "CONOP",
          content: (
            <div className="space-y-4">
              {mission.conops.length > 0 ? (
                mission.conops.map((conop) => (
                  <Card key={conop.id} className="border-border/70 bg-background/45">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-lg">{conop.title}</CardTitle>
                          <CardDescription>
                            {conop.event?.title ?? conop.campaign?.title ?? "Operation-linked CONOP"}
                          </CardDescription>
                        </div>
                        <StatusBadge
                          label={conop.statusLabel}
                          tone={conop.status === "published" ? "success" : "warning"}
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-muted-foreground">
                      <p>
                        {conop.missionMakerName ?? "Planner TBD"} / {conop.zeusName ?? "Zeus TBD"}
                      </p>
                      <p>Updated {formatDateTime(conop.updatedAt)}</p>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <EmptyState
                  description="Use the Weekly Operation Package on the event detail to attach the active CONOP file or link."
                  title="No legacy CONOP records"
                />
              )}
            </div>
          ),
        },
        {
          label: "Attendance",
          content: (
            <Card className="border-border/70 bg-background/45">
              <CardHeader>
                <CardTitle>Attendance readiness</CardTitle>
                <CardDescription>
                  RSVP progress and final closeout stay visible from the operation queue.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border/70 bg-card/70 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">RSVP coverage</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {mission.rsvpCounts.yes + mission.rsvpCounts.no + mission.rsvpCounts.maybe}/
                    {mission.expectedAttendanceCount} responded
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {mission.rsvpCounts.missing} still missing
                  </p>
                </div>
                <div className="rounded-xl border border-border/70 bg-card/70 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Final closeout</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {mission.finalAttendanceCounts.present} present / {mission.finalAttendanceCounts.pending} pending
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {mission.attendanceLocked ? "Attendance locked" : "Attendance still open"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ),
        },
        {
          label: "Deployment",
          content: campaignTabContent,
        },
        {
          label: "AAR",
          content: (
            <div className="space-y-4">
              {mission.aars.length > 0 ? (
                mission.aars.map((aar) => (
                  <Card key={aar.id} className="border-border/70 bg-background/45">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-lg">{aar.title}</CardTitle>
                          <CardDescription>
                            {aar.event?.title ?? aar.campaign?.title ?? "Operation-linked AAR"}
                          </CardDescription>
                        </div>
                        <StatusBadge
                          label={aar.statusLabel}
                          tone={
                            aar.status === "reviewed"
                              ? "success"
                              : aar.status === "submitted"
                                ? "warning"
                                : "muted"
                          }
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-muted-foreground">
                      <p>
                        {aar.reviewedByName ? `Reviewed by ${aar.reviewedByName}` : "Awaiting review"}
                      </p>
                      <p>Updated {formatDateTime(aar.updatedAt)}</p>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <EmptyState
                  description="No AAR has been captured for this operation yet."
                  title="No AAR records"
                />
              )}
            </div>
          ),
        },
        {
          label: "Activity",
          content: (
            <ServiceTimeline
              description="Lifecycle, publication, and document readiness remain visible without leaving the S3 board."
              emptyDescription="Operation activity will appear here as lifecycle, CONOP, and AAR history expands."
              entries={[
                {
                  id: `${mission.id}-status`,
                  type: "audit",
                  title: `Operation is ${mission.missionStatusLabel}`,
                  timestamp: mission.publishedAt ?? mission.startsAt,
                  description: `Event state is ${mission.statusLabel}.`,
                  actorDisplayName: mission.missionCommanderName ?? null,
                  badgeLabel: mission.missionStatusLabel,
                  badgeTone: "info" as const,
                  relatedLabel: mission.campaign?.title ?? mission.hostUnit?.shortName ?? null,
                  relatedHref: mission.campaign ? `/operations/campaigns/${mission.campaign.id}` : null,
                  details: [
                    mission.hostUnit?.name ?? "Unscoped operation",
                    mission.eventTypeLabel,
                  ],
                  isSensitive: false,
                },
                ...(mission.conops[0]
                  ? [
                      {
                        id: `${mission.id}-conop`,
                        type: "audit" as const,
                        title: `Latest CONOP is ${mission.conops[0].statusLabel}`,
                        timestamp: mission.conops[0].updatedAt,
                        description: mission.conops[0].title,
                        actorDisplayName: mission.conops[0].missionMakerName ?? null,
                        badgeLabel: mission.conops[0].statusLabel,
                        badgeTone:
                          mission.conops[0].status === "published"
                            ? ("success" as const)
                            : ("warning" as const),
                        relatedLabel: mission.conops[0].event?.title ?? mission.conops[0].campaign?.title ?? null,
                        relatedHref: mission.conops[0].event ? `/operations/events/${mission.conops[0].event.id}` : null,
                        details: [
                          mission.conops[0].missionMakerName ?? "Planner TBD",
                          mission.conops[0].zeusName ?? "Zeus TBD",
                        ],
                        isSensitive: false,
                      },
                    ]
                  : []),
                ...(mission.aars[0]
                  ? [
                      {
                        id: `${mission.id}-aar`,
                        type: "audit" as const,
                        title: `Latest AAR is ${mission.aars[0].statusLabel}`,
                        timestamp: mission.aars[0].updatedAt,
                        description: mission.aars[0].title,
                        actorDisplayName: mission.aars[0].reviewedByName ?? null,
                        badgeLabel: mission.aars[0].statusLabel,
                        badgeTone:
                          mission.aars[0].status === "reviewed"
                            ? ("success" as const)
                            : ("warning" as const),
                        relatedLabel: mission.aars[0].event?.title ?? mission.aars[0].campaign?.title ?? null,
                        relatedHref: mission.aars[0].event ? `/operations/events/${mission.aars[0].event.id}` : null,
                        details: [mission.aars[0].reviewedByName ?? "Awaiting reviewer"],
                        isSensitive: false,
                      },
                    ]
                  : []),
              ]}
              order="desc"
              title="Operation activity"
            />
          ),
        },
        {
          label: "Controls",
          content: (
            <div className="space-y-4">
              <Card className="border-border/70 bg-background/45">
                <CardHeader>
                  <CardTitle>Operation actions</CardTitle>
                  <CardDescription>
                    Server-side lifecycle validation still decides what can be committed.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                  <Button asChild>
                    <Link href={actionLinks.eventHref}>Open event detail</Link>
                  </Button>
                  {actionLinks.editHref ? (
                    <Button asChild variant="outline">
                      <Link href={actionLinks.editHref}>Edit operation</Link>
                    </Button>
                  ) : null}
                  {actionLinks.statusHref ? (
                    <Button asChild variant="outline">
                      <Link href={actionLinks.statusHref}>Update event status</Link>
                    </Button>
                  ) : null}
                  {actionLinks.reviewHref ? (
                    <Button asChild variant="outline">
                      <Link href={actionLinks.reviewHref}>Submit for review</Link>
                    </Button>
                  ) : null}
                  {actionLinks.approveHref ? (
                    <Button asChild variant="outline">
                      <Link href={actionLinks.approveHref}>Approve operation</Link>
                    </Button>
                  ) : null}
                  {actionLinks.rejectHref ? (
                    <Button asChild variant="outline">
                      <Link href={actionLinks.rejectHref}>Return to draft</Link>
                    </Button>
                  ) : null}
                  {actionLinks.publishHref ? (
                    <Button asChild variant="outline">
                      <Link href={actionLinks.publishHref}>Publish operation</Link>
                    </Button>
                  ) : null}
                  {actionLinks.archiveHref ? (
                    <Button asChild variant="outline">
                      <Link href={actionLinks.archiveHref}>Archive operation</Link>
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          ),
        },
      ]}
      title={mission.title}
    >
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href={actionLinks.eventHref}>Open full operation workspace</Link>
        </Button>
        <Button onClick={() => router.replace(closeHref)} variant="ghost">
          Close inspector
        </Button>
      </div>
    </InspectorDrawer>
  );
}
