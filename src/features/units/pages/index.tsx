import Link from "next/link";
import { notFound } from "next/navigation";

import { DashboardWidget } from "@/components/dashboard/dashboard-widget";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ReadinessCard } from "@/components/dashboard/readiness-card";
import { ActionGroup } from "@/components/layout/layout-primitives";
import { PageHeader } from "@/components/layout/page-header";
import { CollapsibleSection } from "@/components/layout/progressive-disclosure";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/status/status-badge";
import { UnitBadge } from "@/components/status/unit-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PersonnelNextActionCard } from "@/features/personnel/components/personnel-workflow";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCountLabel, formatDateTime } from "@/lib/formatters";
import { getUnitAttendanceSummary } from "@/server/attendance";
import { getUnitCampaignParticipationSummary } from "@/server/campaigns";
import { getUnitQualificationReadiness } from "@/server/qualifications";
import { listUnits } from "@/server/units";

function getCampaignTone(status: string) {
  switch (status) {
    case "active":
      return "success";
    case "planning":
      return "info";
    case "paused":
      return "warning";
    case "archived":
      return "danger";
    default:
      return "muted";
  }
}

export async function UnitsPage() {
  const unitsData = await listUnits();
  const totalActiveMembers = unitsData.units.reduce(
    (total, unit) => total + unit.activeMembers,
    0,
  );
  const totalLoaMembers = unitsData.units.reduce((total, unit) => total + unit.loaMembers, 0);
  const totalInactiveMembers = unitsData.units.reduce(
    (total, unit) => total + unit.inactiveMembers,
    0,
  );
  const totalOpenBillets = unitsData.units.reduce((total, unit) => total + unit.openBillets, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={["Units"]}
        description="Configured unit structure with live roster counts pulled from current member assignments."
        title="Units"
      />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          hint="Configured active units"
          label="Tracked Units"
          tone="info"
          trend="Seeded structure"
          value={String(unitsData.units.length)}
        />
        <DashboardWidget
          description="Members currently active across visible units"
          title="Active Members"
          tone="success"
          value={String(totalActiveMembers)}
        />
        <ReadinessCard
          hint="LOA members needing awareness"
          label="LOA Members"
          statusLabel="Personnel signal"
          value={String(totalLoaMembers)}
        />
        <KpiCard
          hint="Open billet placeholder based on configured positions"
          label="Open Billets"
          tone="warning"
          trend={`${totalInactiveMembers} inactive/reserve`}
          value={String(totalOpenBillets)}
        />
      </section>
      <Card className="border-border/80 bg-card/88">
        <CardHeader>
          <CardTitle>Unit directory</CardTitle>
          <CardDescription>
            {formatCountLabel(unitsData.units.length, "unit")} visible under the current permission scope.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {unitsData.units.length === 0 ? (
            <EmptyState
              description="No units are visible for this account yet."
              title="No visible units"
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {unitsData.units.map((unit) => (
                <Card key={unit.id} className="border-border/70 bg-background/45">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle>{unit.name}</CardTitle>
                        <CardDescription>
                          {unit.parentUnitName ? `Parent: ${unit.parentUnitName}` : "Top-level unit"}
                        </CardDescription>
                      </div>
                      <UnitBadge label={unit.shortName} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-border/70 bg-card/70 p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Active</p>
                        <p className="mt-1 text-2xl font-semibold text-foreground">{unit.activeMembers}</p>
                      </div>
                      <div className="rounded-xl border border-border/70 bg-card/70 p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">LOA</p>
                        <p className="mt-1 text-2xl font-semibold text-foreground">{unit.loaMembers}</p>
                      </div>
                      <div className="rounded-xl border border-border/70 bg-card/70 p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Inactive</p>
                        <p className="mt-1 text-2xl font-semibold text-foreground">{unit.inactiveMembers}</p>
                      </div>
                      <div className="rounded-xl border border-border/70 bg-card/70 p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Open Billets</p>
                        <p className="mt-1 text-2xl font-semibold text-foreground">{unit.openBillets}</p>
                      </div>
                    </div>
                    <Button asChild>
                      <Link href={`/units/${unit.key}`}>Open unit dashboard</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export async function UnitDetailPage({
  params,
}: {
  params: Promise<{ unitId: string }>;
}) {
  const { unitId } = await params;
  const { getUnitDashboard } = await import("@/server/units");
  const unit = await getUnitDashboard(unitId);

  if (!unit) {
    notFound();
  }

  const [attendanceSummary, campaignSummary, qualificationReadiness] = await Promise.all([
    getUnitAttendanceSummary(unit.id),
    getUnitCampaignParticipationSummary(unit.id),
    getUnitQualificationReadiness(unit.id),
  ]);
  const unitNextAction =
    qualificationReadiness && qualificationReadiness.missingRequiredCount > 0
      ? {
          href: `/training/qualification-matrix?unitId=${unit.id}&readiness=missing`,
          label: "Review missing qualifications",
          reason: `${qualificationReadiness.missingRequiredCount} required qualification gap(s) are visible for ${unit.shortName}.`,
          responsible: "Training Staff / Unit Leadership",
          tone: "warning" as const,
        }
      : attendanceSummary && (attendanceSummary.missingRsvpCount > 0 || attendanceSummary.noShowCount > 0)
        ? {
            href: `/operations/attendance?unitId=${unit.id}`,
            label: "Review attendance",
            reason: `${attendanceSummary.missingRsvpCount} missing RSVP and ${attendanceSummary.noShowCount} no-show signal(s) need follow-up.`,
            responsible: "Unit Leadership",
            tone: "warning" as const,
          }
        : unit.openBillets > 0
          ? {
              href: `/personnel/roster?unitId=${unit.id}`,
              label: "Manage assignments",
              reason: `${unit.openBillets} billet(s) are currently open for ${unit.shortName}.`,
              responsible: "Unit Leadership / S1",
              tone: "info" as const,
            }
          : null;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={["Units", unit.shortName]}
        description="Live unit dashboard with roster counts, billet visibility, and current member list."
        title={unit.name}
      />
      <Card className="border-border/80 bg-card/72">
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <UnitBadge label={unit.shortName} />
              <StatusBadge label={`${unit.rosterCount} rostered`} tone="info" />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {unit.parentUnitName ? `Part of ${unit.parentUnitName}` : "Top-level command unit"}
            </p>
          </div>
          <ActionGroup align="end">
            <Button asChild>
              <Link href={`/personnel/roster?unitId=${unit.id}`}>View roster workspace</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/units">Back to units</Link>
            </Button>
          </ActionGroup>
        </CardContent>
      </Card>
      <PersonnelNextActionCard action={unitNextAction} title="Unit next action" />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardWidget
          description="Members currently active in this unit"
          title="Active Members"
          tone="success"
          value={String(unit.activeMembers)}
        />
        <KpiCard
          hint="Members on leave of absence"
          label="LOA"
          tone="warning"
          trend="Roster status"
          value={String(unit.loaMembers)}
        />
        <KpiCard
          hint="Inactive or reserve members"
          label="Inactive"
          tone="danger"
          trend="Watch list"
          value={String(unit.inactiveMembers)}
        />
        <ReadinessCard
          hint="Configured positions without a current primary assignment"
          label="Open Billets"
          statusLabel="Billet placeholder"
          value={String(unit.openBillets)}
        />
      </section>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="border-border/80 bg-card/88">
          <CardHeader>
            <CardTitle>Unit roster</CardTitle>
            <CardDescription>
              {formatCountLabel(unit.roster.length, "member")} currently assigned.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {unit.roster.length === 0 ? (
              <EmptyState
                description="No active members are currently assigned to this unit."
                title="No rostered members"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unit.roster.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-foreground">{member.displayName}</p>
                          <p className="text-xs text-muted-foreground">{member.callsign ?? "No callsign"}</p>
                        </div>
                      </TableCell>
                      <TableCell>{member.position?.title ?? "Unassigned"}</TableCell>
                      <TableCell>
                        <StatusBadge label={member.status.label} tone="info" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/personnel/members/${member.id}`}>Open profile</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Qualification readiness</CardTitle>
              <CardDescription>
                Required qualification coverage for the current unit, including missing and pending sign-off states.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {qualificationReadiness ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border/70 bg-background/45 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        Readiness
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-foreground">
                        {qualificationReadiness.readinessPercent !== null
                          ? `${qualificationReadiness.readinessPercent}%`
                          : "N/A"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-background/45 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        Required Qualifications
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-foreground">
                        {qualificationReadiness.requiredQualifications}
                      </p>
                    </div>
                    <div className="rounded-xl border border-warning/25 bg-warning/10 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        Missing Required
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-foreground">
                        {qualificationReadiness.missingRequiredCount}
                      </p>
                    </div>
                    <div className="rounded-xl border border-warning/25 bg-warning/10 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        Pending Sign-Off
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-foreground">
                        {qualificationReadiness.pendingSignoffCount}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/45 p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Expiring Soon
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-foreground">
                      {qualificationReadiness.expiringSoonCount}
                    </p>
                  </div>
                  {qualificationReadiness.topMissingQualifications.length > 0 ? (
                    qualificationReadiness.topMissingQualifications.map((entry) => (
                      <div
                        key={entry.qualificationId}
                        className="rounded-xl border border-border/70 bg-background/45 p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-foreground">{entry.qualificationLabel}</p>
                          <StatusBadge label={`${entry.count} gap${entry.count === 1 ? "" : "s"}`} tone="warning" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      description="No missing required qualification gaps are visible for this unit."
                      title="Qualification coverage healthy"
                    />
                  )}
                </>
              ) : (
                <EmptyState
                  description="Qualification readiness is hidden until the viewer has matrix visibility for this unit."
                  title="Qualification readiness restricted"
                />
              )}
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Attendance summary</CardTitle>
              <CardDescription>
                Recent event participation and RSVP follow-up for this unit.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {attendanceSummary ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border/70 bg-background/45 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        Attendance Rate
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-foreground">
                        {attendanceSummary.attendanceRate !== null
                          ? `${attendanceSummary.attendanceRate}%`
                          : "N/A"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-background/45 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        Pending Closeout
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-foreground">
                        {attendanceSummary.pendingCloseout}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-background/45 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        Missing RSVP
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-foreground">
                        {attendanceSummary.missingRsvpCount}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-background/45 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        No-show
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-foreground">
                        {attendanceSummary.noShowCount}
                      </p>
                    </div>
                  </div>
                  {attendanceSummary.recentEvents.length > 0 ? (
                    attendanceSummary.recentEvents.map((event) => (
                      <div key={event.eventId} className="rounded-xl border border-border/70 bg-background/45 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-foreground">{event.title}</p>
                          <StatusBadge
                            label={event.attendanceLocked ? "Locked" : "Open"}
                            tone={event.attendanceLocked ? "success" : "warning"}
                          />
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatDateTime(event.startsAt)} / {event.missingRsvpCount} missing RSVP / {event.noShowCount} no-show
                        </p>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      description="No recent hosted events are available for this unit yet."
                      title="No attendance history"
                    />
                  )}
                </>
              ) : (
                <EmptyState
                  description="Attendance detail is hidden until the viewer has the appropriate attendance permissions."
                  title="Attendance restricted"
                />
              )}
            </CardContent>
          </Card>
          <CollapsibleSection
            badgeLabel={campaignSummary ? `${campaignSummary.activeCount} active` : "Restricted"}
            description="Linked deployment visibility for this unit based on hosted operations and timeline progress."
            title="Deployment participation"
          >
            <div className="space-y-3">
              {campaignSummary ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border/70 bg-background/45 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        Active deployments
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-foreground">
                        {campaignSummary.activeCount}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-background/45 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        Upcoming events
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-foreground">
                        {campaignSummary.upcomingEventCount}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/45 p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Average attendance
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-foreground">
                      {campaignSummary.attendanceRate !== null
                        ? `${campaignSummary.attendanceRate}%`
                        : "N/A"}
                    </p>
                  </div>
                  {campaignSummary.campaigns.length > 0 ? (
                    campaignSummary.campaigns.map((campaign) => (
                      <div key={campaign.id} className="rounded-xl border border-border/70 bg-background/45 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-foreground">{campaign.title}</p>
                          <StatusBadge
                            label={campaign.statusLabel}
                            tone={getCampaignTone(campaign.status)}
                          />
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {campaign.nextEvent
                            ? `${formatDateTime(campaign.nextEvent.startsAt)} / ${campaign.nextEvent.title}`
                            : "No upcoming linked event"}
                        </p>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      description="No deployments are currently linked to this unit's hosted operations."
                      title="No deployment linkage"
                    />
                  )}
                </>
              ) : (
                <EmptyState
                  description="Deployment participation becomes visible here when the viewer has deployment reporting access."
                  title="Deployments restricted"
                />
              )}
            </div>
          </CollapsibleSection>
          <CollapsibleSection
            badgeLabel={`${unit.openBillets} open`}
            badgeTone={unit.openBillets > 0 ? "warning" : "success"}
            description="Position and billet detail stays available without crowding the unit health summary."
            title="Positions / billets"
          >
            <div className="space-y-3">
              {unit.positions.length > 0 ? (
                unit.positions.map((position) => (
                  <div key={position.id} className="rounded-xl border border-border/70 bg-background/45 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-foreground">{position.title}</p>
                      {position.isLeadership ? (
                        <StatusBadge label="Leadership" tone="warning" />
                      ) : (
                        <StatusBadge label="Billet" tone="muted" />
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {position.assignedMemberName ?? "Open billet"}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState
                  description="No unit positions have been defined yet."
                  title="No configured billets"
                />
              )}
            </div>
          </CollapsibleSection>
        </div>
      </div>
    </div>
  );
}
