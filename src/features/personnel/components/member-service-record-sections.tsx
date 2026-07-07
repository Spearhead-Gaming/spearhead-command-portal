import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { QualificationBadge } from "@/components/status/qualification-badge";
import { RankBadge } from "@/components/status/rank-badge";
import { StatusBadge } from "@/components/status/status-badge";
import { UnitBadge } from "@/components/status/unit-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/formatters";
import type { MemberProfileDashboardData } from "@/server/personnel/types";

type DashboardProps = {
  dashboard: MemberProfileDashboardData;
};

function getStatusTone(statusKey: string) {
  switch (statusKey) {
    case "active":
      return "success" as const;
    case "reserve":
      return "info" as const;
    case "loa":
      return "warning" as const;
    case "inactive":
    case "banned":
    case "discharged":
      return "danger" as const;
    default:
      return "muted" as const;
  }
}

function InfoField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm text-foreground">{value}</p>
    </div>
  );
}

export function MemberServiceOverviewCard({ dashboard }: DashboardProps) {
  const { member, serviceRecord } = dashboard;

  return (
    <Card className="border-border/80 bg-card/88">
      <CardHeader>
        <CardTitle>Service record overview</CardTitle>
        <CardDescription>
          Official identity, assignment, and profile metadata kept close to the header.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          {member.rank ? <RankBadge label={member.rank.abbreviation} /> : null}
          {member.unit ? <UnitBadge label={member.unit.shortName} /> : null}
          <StatusBadge label={member.status.label} tone={getStatusTone(member.status.key)} />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <InfoField label="Display name" value={member.displayName} />
          <InfoField label="Callsign" value={member.callsign ?? "Not set"} />
          <InfoField label="Unit" value={member.unit?.name ?? "Not assigned"} />
          <InfoField label="Position" value={member.position?.title ?? "Not assigned"} />
          <InfoField label="Status" value={member.status.label} />
          <InfoField label="Discord link" value={serviceRecord.discordLinkLabel} />
          <InfoField label="Join date" value={serviceRecord.joinDateLabel} />
          <InfoField label="Time in service" value={serviceRecord.timeInServiceLabel} />
          {member.rank ? (
            <>
              <InfoField label="Rank" value={member.rank.label} />
              <InfoField label="Time in grade" value={serviceRecord.timeInGradeLabel} />
            </>
          ) : null}
          <InfoField label="Steam ID" value={serviceRecord.steamIdLabel} />
          <InfoField label="Arma ID" value={serviceRecord.armaIdLabel} />
        </div>
      </CardContent>
    </Card>
  );
}

export function MemberQualificationsSummaryCard({ dashboard }: DashboardProps) {
  const { permissions, qualificationSummary, member } = dashboard;

  return (
    <Card className="border-border/80 bg-card/88">
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <CardTitle>Qualifications</CardTitle>
            <CardDescription>
              Earned, missing, and inactive qualification records tied to the member profile.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/personnel/qualifications">Open catalog</Link>
            </Button>
            {permissions.canViewQualifications ? (
              <Button asChild size="sm" variant="outline">
                <Link href={`/training/qualification-matrix?memberProfileId=${member.id}`}>
                  Open matrix
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!permissions.canViewQualifications ? (
          <EmptyState
            description="Qualification records are restricted for this viewer."
            title="Qualification access restricted"
          />
        ) : qualificationSummary &&
          qualificationSummary.earned.length === 0 &&
          qualificationSummary.pendingSignoff.length === 0 &&
          qualificationSummary.missingRequired.length === 0 &&
          qualificationSummary.expiringSoon.length === 0 &&
          qualificationSummary.revokedOrExpired.length === 0 ? (
          <EmptyState
            description="No earned, missing, or inactive qualification records are attached to this profile yet."
            title="No qualification records"
          />
        ) : (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">Earned qualifications</p>
                <StatusBadge
                  label={String(qualificationSummary?.earned.length ?? 0)}
                  tone="success"
                />
              </div>
              {qualificationSummary?.earned.length ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {qualificationSummary.earned.map((record) => (
                    <div
                      key={record.id}
                      className="rounded-xl border border-border/70 bg-background/45 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">{record.qualificationLabel}</p>
                        <QualificationBadge label={record.categoryLabel} />
                        <StatusBadge
                          label={record.isExpiringSoon ? "Expiring Soon" : "Qualified"}
                          tone={record.isExpiringSoon ? "warning" : "success"}
                        />
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Awarded {formatDate(record.awardedAt)}
                        {record.expiresAt ? ` | Expires ${formatDate(record.expiresAt)}` : ""}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        {record.requiredBy.length > 0
                          ? `Required by ${record.requiredBy.join(", ")}`
                          : "Not currently mapped as required"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No active qualification records are attached to this member.
                </p>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">Pending sign-off</p>
                <StatusBadge
                  label={String(qualificationSummary?.pendingSignoff.length ?? 0)}
                  tone="warning"
                />
              </div>
              {qualificationSummary?.pendingSignoff.length ? (
                <div className="space-y-3">
                  {qualificationSummary.pendingSignoff.map((record) => (
                    <div
                      key={record.id}
                      className="rounded-xl border border-warning/25 bg-warning/10 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">{record.qualificationLabel}</p>
                        <QualificationBadge label={record.categoryLabel} />
                        <StatusBadge label="Pending Sign-Off" tone="warning" />
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Awarded {formatDate(record.awardedAt)}
                        {record.awardedByDisplayName
                          ? ` by ${record.awardedByDisplayName}`
                          : ""}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No qualification records are currently awaiting sign-off.
                </p>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">Missing required</p>
                <StatusBadge
                  label={String(qualificationSummary?.missingRequired.length ?? 0)}
                  tone="warning"
                />
              </div>
              {qualificationSummary?.missingRequired.length ? (
                <div className="space-y-3">
                  {qualificationSummary.missingRequired.map((record) => (
                    <div
                      key={`${record.qualificationId}-${record.requiredBy.join("-")}`}
                      className="rounded-xl border border-warning/25 bg-warning/10 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">{record.qualificationLabel}</p>
                        <QualificationBadge label={record.categoryLabel} />
                        <StatusBadge label="Missing Required" tone="warning" />
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Required by {record.requiredBy.join(", ")}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No required qualifications are currently missing.
                </p>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">Expiring soon</p>
                <StatusBadge
                  label={String(qualificationSummary?.expiringSoon.length ?? 0)}
                  tone="warning"
                />
              </div>
              {qualificationSummary?.expiringSoon.length ? (
                <div className="space-y-3">
                  {qualificationSummary.expiringSoon.map((record) => (
                    <div
                      key={`${record.id}-expiring`}
                      className="rounded-xl border border-warning/25 bg-warning/10 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">{record.qualificationLabel}</p>
                        <QualificationBadge label={record.categoryLabel} />
                        <StatusBadge label="Expiring Soon" tone="warning" />
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {record.expiresAt
                          ? `Expires ${formatDate(record.expiresAt)}`
                          : "Expiration date not recorded"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No earned qualifications are approaching expiration.
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function MemberAttendanceSummaryCard({ dashboard }: DashboardProps) {
  const { attendanceSummary, permissions } = dashboard;

  return (
    <Card className="border-border/80 bg-card/88">
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <CardTitle>Attendance</CardTitle>
            <CardDescription>
              Recent RSVP and final attendance records attached to this service record.
            </CardDescription>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/operations/attendance">Open attendance reporting</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!permissions.canViewAttendance || !attendanceSummary ? (
          <EmptyState
            description="Attendance detail is restricted for this viewer or not yet visible."
            title="Attendance not available"
          />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-border/70 bg-background/45 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Attendance Rate
                </p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {attendanceSummary.attendanceRate !== null
                    ? `${attendanceSummary.attendanceRate}%`
                    : "N/A"}
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/45 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Finalized Events
                </p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {attendanceSummary.totalFinalized}
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/45 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Present / Late
                </p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {attendanceSummary.presentCount + attendanceSummary.lateCount}
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/45 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Upcoming RSVP
                </p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {attendanceSummary.upcomingRsvpCount}
                </p>
              </div>
            </div>
            {attendanceSummary.recentEvents.length > 0 ? (
              <div className="space-y-3">
                {attendanceSummary.recentEvents.map((entry) => (
                  <div
                    key={`${entry.eventId}-${entry.startsAt.toISOString()}`}
                    className="rounded-xl border border-border/70 bg-background/45 p-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{entry.eventTitle}</p>
                        <p className="text-sm text-muted-foreground">
                          {entry.hostUnitShortName ?? "Unscoped"} / {formatDateTime(entry.startsAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge
                          label={entry.rsvpStatus ? entry.rsvpStatus.toUpperCase() : "No RSVP"}
                          tone={
                            entry.rsvpStatus === "yes"
                              ? "success"
                              : entry.rsvpStatus === "maybe"
                                ? "warning"
                                : entry.rsvpStatus === "no"
                                  ? "danger"
                                  : "muted"
                          }
                        />
                        <StatusBadge
                          label={entry.finalStatus ? entry.finalStatus.toUpperCase() : "Pending"}
                          tone={
                            entry.finalStatus === "present"
                              ? "success"
                              : entry.finalStatus === "late" || entry.finalStatus === "excused"
                                ? "warning"
                                : entry.finalStatus === "absent"
                                  ? "danger"
                                  : entry.finalStatus === "loa"
                                    ? "info"
                                    : "muted"
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                description="No attendance records have been logged for this member yet."
                title="No attendance history"
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function MemberCampaignSummaryCard({ dashboard }: DashboardProps) {
  const { campaignSummary, permissions } = dashboard;

  return (
    <Card className="border-border/80 bg-card/88">
      <CardHeader>
        <CardTitle>Deployment participation</CardTitle>
        <CardDescription>
          High-level participation summary from deployment-linked operations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!permissions.canViewCampaigns || !campaignSummary ? (
          <EmptyState
            description="Deployment detail is restricted for this viewer or not yet visible."
            title="Deployment access restricted"
          />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-border/70 bg-background/45 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Deployments
                </p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {campaignSummary.totalCampaigns}
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/45 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Active / Planning
                </p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {campaignSummary.activeCampaigns}
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/45 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Completed
                </p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {campaignSummary.completedCampaigns}
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/45 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Linked Events
                </p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {campaignSummary.participationEventCount}
                </p>
              </div>
            </div>
            {campaignSummary.recentCampaigns.length > 0 ? (
              <div className="space-y-3">
                {campaignSummary.recentCampaigns.map((campaign) => (
                  <div
                    key={`${campaign.id}-${campaign.participatedAt.toISOString()}`}
                    className="rounded-xl border border-border/70 bg-background/45 p-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{campaign.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {campaign.relatedEventTitle ?? "Deployment-linked operation"} /{" "}
                          {formatDateTime(campaign.participatedAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge label={campaign.statusLabel} tone="info" />
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/operations/campaigns/${campaign.id}`}>Open</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                description="No deployment-linked operation participation is attached to this record yet."
                title="No deployment history"
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function MemberRecentActivityCard({ dashboard }: DashboardProps) {
  return (
    <Card className="border-border/80 bg-card/82">
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>
          Fast operational context without leaving the profile.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {dashboard.recentActivity.length > 0 ? (
          dashboard.recentActivity.map((entry) => (
            <div key={entry.id} className="rounded-xl border border-border/70 bg-background/45 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">{entry.title}</p>
                {entry.badgeLabel ? (
                  <StatusBadge label={entry.badgeLabel} tone={entry.badgeTone} />
                ) : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{entry.description}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                {formatDateTime(entry.timestamp)}
                {entry.actorDisplayName ? ` / ${entry.actorDisplayName}` : ""}
              </p>
            </div>
          ))
        ) : (
          <EmptyState
            description="Recent activity will appear once this member accumulates service-record history."
            title="No recent activity"
          />
        )}
      </CardContent>
    </Card>
  );
}

export function MemberNotesCard({ dashboard }: DashboardProps) {
  return (
    <Card className="border-border/80 bg-card/82">
      <CardHeader>
        <CardTitle>Notes</CardTitle>
        <CardDescription>
          Permission-restricted personnel notes stay separate from public-facing service history.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <EmptyState
          description={dashboard.notes.placeholder}
          title={dashboard.notes.canView ? "Notes model pending" : "Notes access restricted"}
        />
      </CardContent>
    </Card>
  );
}

export function MemberServiceLogsCard({ dashboard }: DashboardProps) {
  return (
    <Card className="border-border/80 bg-card/82">
      <CardHeader>
        <CardTitle>Profile logs</CardTitle>
        <CardDescription>
          Human-readable service and roster log entries from the existing audit trail.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!dashboard.permissions.canViewLogs || !dashboard.serviceLogs ? (
          <EmptyState
            description="Profile log visibility is restricted for this viewer."
            title="Logs access restricted"
          />
        ) : dashboard.serviceLogs.length > 0 ? (
          dashboard.serviceLogs.map((entry) => (
            <div key={entry.id} className="rounded-xl border border-border/70 bg-background/45 p-3">
              <p className="text-sm font-semibold text-foreground">{entry.summary}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                {formatDateTime(entry.createdAt)}
                {entry.actorDisplayName ? ` / ${entry.actorDisplayName}` : ""}
              </p>
              {entry.reason ? (
                <p className="mt-2 text-sm text-muted-foreground">{entry.reason}</p>
              ) : null}
            </div>
          ))
        ) : (
          <EmptyState
            description="No profile log entries have been recorded for this member yet."
            title="No logs yet"
          />
        )}
      </CardContent>
    </Card>
  );
}

export function MemberAuditLogCard({ dashboard }: DashboardProps) {
  return (
    <Card className="border-border/80 bg-card/82">
      <CardHeader>
        <CardTitle>Audit trail</CardTitle>
        <CardDescription>
          Append-only administrative evidence for sensitive profile and roster changes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!dashboard.permissions.canViewAudit || !dashboard.auditLogs ? (
          <EmptyState
            description="Audit log visibility is restricted for this viewer."
            title="Audit access restricted"
          />
        ) : dashboard.auditLogs.length > 0 ? (
          dashboard.auditLogs.map((entry) => (
            <div key={entry.id} className="rounded-xl border border-border/70 bg-background/45 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-foreground">{entry.summary}</p>
                <StatusBadge label={entry.action} tone="muted" />
              </div>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                {formatDateTime(entry.createdAt)}
                {entry.actorDisplayName ? ` / ${entry.actorDisplayName}` : ""}
              </p>
              {entry.reason ? (
                <p className="mt-2 text-sm text-muted-foreground">{entry.reason}</p>
              ) : null}
            </div>
          ))
        ) : (
          <EmptyState
            description="No audited profile or roster changes have been recorded for this member yet."
            title="No audit activity"
          />
        )}
      </CardContent>
    </Card>
  );
}
