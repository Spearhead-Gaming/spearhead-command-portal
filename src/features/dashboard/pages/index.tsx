import Link from "next/link";

import { DashboardWidget } from "@/components/dashboard/dashboard-widget";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ReadinessCard } from "@/components/dashboard/readiness-card";
import { PageHeader } from "@/components/layout/page-header";
import { AttentionPanel, CollapsibleSection } from "@/components/layout/progressive-disclosure";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/status/status-badge";
import { UnitBadge } from "@/components/status/unit-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/formatters";
import { getCommandDashboardData } from "@/server/dashboard";
import type {
  DashboardActivityItem,
  DashboardListItem,
  DashboardTone,
} from "@/server/dashboard";

function toneForPercent(value: number | null): DashboardTone {
  if (value === null) {
    return "muted";
  }

  if (value >= 80) {
    return "success";
  }

  if (value >= 60) {
    return "warning";
  }

  return "danger";
}

function percentLabel(value: number | null) {
  return value === null ? "N/A" : `${value}%`;
}

function WidgetList(props: {
  emptyDescription: string;
  emptyTitle: string;
  items: DashboardListItem[];
}) {
  if (props.items.length === 0) {
    return <EmptyState description={props.emptyDescription} title={props.emptyTitle} />;
  }

  return (
    <div className="space-y-3">
      {props.items.map((item) => {
        const content = (
          <div className="rounded-xl border border-border/70 bg-background/45 p-3 transition hover:border-primary/45">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{item.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.meta}</p>
              </div>
              {item.statusLabel ? (
                <StatusBadge label={item.statusLabel} tone={item.tone ?? "muted"} />
              ) : null}
            </div>
          </div>
        );

        return item.href ? (
          <Link key={item.id} href={item.href}>
            {content}
          </Link>
        ) : (
          <div key={item.id}>{content}</div>
        );
      })}
    </div>
  );
}

function ActivityList(props: {
  emptyDescription: string;
  emptyTitle: string;
  items: DashboardActivityItem[];
}) {
  if (props.items.length === 0) {
    return <EmptyState description={props.emptyDescription} title={props.emptyTitle} />;
  }

  return (
    <div className="space-y-3">
      {props.items.map((item) => (
        <div key={item.id} className="rounded-xl border border-border/70 bg-background/45 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{item.summary}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {item.entityType} / {formatDateTime(item.createdAt)}
              </p>
            </div>
            <StatusBadge label={item.action.split(".").at(-1) ?? item.action} tone={item.tone} />
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionCard(props: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <Card className="border-border/80 bg-card/88">
      <CardHeader>
        <CardTitle>{props.title}</CardTitle>
        <CardDescription>{props.description}</CardDescription>
      </CardHeader>
      <CardContent>{props.children}</CardContent>
    </Card>
  );
}

export async function DashboardPage() {
  const dashboard = await getCommandDashboardData();
  const memberNextEvent = dashboard.member.nextEvent;
  const recentActivityItems = dashboard.visibility.audit
    ? dashboard.admin.auditActivity
    : [
        ...dashboard.unitLeadership.recentRosterChanges,
        ...dashboard.personnel.recentChanges,
      ].slice(0, 6);
  const attentionItems = [
    dashboard.community.pendingForms > 0
      ? {
          actionLabel: "Review",
          href: "/administration/submissions",
          label: "Pending forms",
          meta: `${dashboard.community.pendingForms} submission(s) need staff attention.`,
          tone: "warning" as const,
        }
      : null,
    dashboard.community.failedNotifications > 0
      ? {
          actionLabel: "Open deliveries",
          href: "/administration/notifications",
          label: "Failed notifications",
          meta: `${dashboard.community.failedNotifications} delivery issue(s) need review.`,
          tone: "danger" as const,
        }
      : null,
    dashboard.attendance.missingRsvps > 0
      ? {
          actionLabel: "Open attendance",
          href: "/operations/attendance",
          label: "Missing RSVPs",
          meta: `${dashboard.attendance.missingRsvps} attendance record(s) need RSVP/final attention.`,
          tone: "warning" as const,
        }
      : null,
    dashboard.s3.conopReviewQueue > 0
      ? {
          actionLabel: "Open S3",
          href: "/operations/s3",
          label: "CONOP review queue",
          meta: `${dashboard.s3.conopReviewQueue} CONOP item(s) need S3 review.`,
          tone: "warning" as const,
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={["Dashboard"]}
        description="Role-aware command overview built from personnel, readiness, operations, workflow, Discord, and system data."
        title="Command Dashboard"
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardWidget
          description="Members currently tracked in the visible command scope"
          footer={`${dashboard.community.activeMembers} active / ${dashboard.community.loaMembers} LOA`}
          title="Community Strength"
          tone="info"
          value={String(dashboard.community.totalMembers)}
        />
        <ReadinessCard
          hint="Attendance readiness from final attendance records"
          label="Attendance"
          statusLabel="Readiness"
          value={percentLabel(dashboard.readiness.attendancePercent)}
        />
        <ReadinessCard
          hint="Required qualification coverage across visible members"
          label="Qualification Readiness"
          statusLabel="Training signal"
          value={percentLabel(dashboard.readiness.qualificationPercent)}
        />
        <KpiCard
          hint="Forms, failed notifications, and active deployments needing awareness"
          label="Command Queue"
          tone={
            dashboard.community.pendingForms + dashboard.community.failedNotifications > 0
              ? "warning"
              : "success"
          }
          trend={`${dashboard.community.activeCampaigns} active deployments`}
          value={String(dashboard.community.pendingForms + dashboard.community.failedNotifications)}
        />
      </section>

      <AttentionPanel items={attentionItems} />

      {dashboard.member.currentModPreset ? (
        <SectionCard
          description="The current active deployment preset is always a download, never rendered in-browser."
          title="Current Mod Preset"
        >
          <Link href={dashboard.member.currentModPreset.href ?? "#"}>
            <div className="rounded-xl border border-primary/25 bg-primary/10 p-4 transition hover:border-primary/60">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-foreground">{dashboard.member.currentModPreset.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{dashboard.member.currentModPreset.meta}</p>
                </div>
                <StatusBadge label="Download Mod Preset" tone="info" />
              </div>
            </div>
          </Link>
        </SectionCard>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <SectionCard
          description="Next operations and training that visible members can act on."
          title="Upcoming"
        >
          <WidgetList
            emptyDescription="No upcoming published or draft events are visible in this command scope."
            emptyTitle="No upcoming events"
            items={dashboard.community.upcomingEvents}
          />
        </SectionCard>
        <SectionCard
          description="Recent operational movement from the highest-permission activity source available to this viewer."
          title="Recent Activity"
        >
          <ActivityList
            emptyDescription="No visible activity is available yet."
            emptyTitle="No recent activity"
            items={recentActivityItems}
          />
        </SectionCard>
      </section>

      <CollapsibleSection
        badgeLabel="Collapsed"
        description="Role-aware analytics, readiness breakdowns, and admin signals remain available without crowding the default dashboard."
        title="Secondary analytics"
      >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-6">
          <SectionCard
            description="Command-level indicators that answer what needs attention first."
            title="Community Overview"
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                hint="Active profiles in visible units"
                label="Active"
                tone="success"
                value={String(dashboard.community.activeMembers)}
              />
              <KpiCard
                hint="Leave of absence profiles"
                label="LOA"
                tone="warning"
                value={String(dashboard.community.loaMembers)}
              />
              <KpiCard
                hint="Inactive, reserve, retired, discharged, or banned"
                label="Inactive"
                tone="danger"
                value={String(dashboard.community.inactiveMembers)}
              />
              <KpiCard
                hint="Discord integration health"
                label="Discord"
                tone={dashboard.visibility.discordHealth ? "info" : "muted"}
                value={dashboard.community.discordHealthLabel}
              />
            </div>
          </SectionCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard
              description="Next operations and training that visible members can act on."
              title="Upcoming Events"
            >
              <WidgetList
                emptyDescription="No upcoming published or draft events are visible in this command scope."
                emptyTitle="No upcoming events"
                items={dashboard.community.upcomingEvents}
              />
            </SectionCard>

            <SectionCard
              description="Visible unit strength, billet pressure, and readiness signal."
              title="Unit Strength"
            >
              <WidgetList
                emptyDescription="No unit dashboard data is visible for this account yet."
                emptyTitle="No visible unit strength"
                items={dashboard.community.unitStrength}
              />
            </SectionCard>
          </div>

          {dashboard.visibility.units ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <SectionCard
                description="Unit readiness combines active strength, LOA/inactive pressure, and open billets."
                title="Unit Readiness"
              >
                <WidgetList
                  emptyDescription="No unit readiness records are visible yet."
                  emptyTitle="No unit readiness"
                  items={dashboard.unitLeadership.unitReadiness}
                />
              </SectionCard>
              <SectionCard
                description="Qualification and attendance gaps that unit leadership can inspect quickly."
                title="Readiness Issues"
              >
                <div className="space-y-4">
                  <WidgetList
                    emptyDescription="No missing required qualifications are visible."
                    emptyTitle="No qualification gaps"
                    items={dashboard.unitLeadership.missingQualifications}
                  />
                  <WidgetList
                    emptyDescription="No missing RSVP issues are visible."
                    emptyTitle="No attendance issues"
                    items={dashboard.unitLeadership.attendanceIssues}
                  />
                </div>
              </SectionCard>
            </div>
          ) : null}

          {dashboard.visibility.s3 ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <SectionCard
                description="Operation lifecycle work for S3 review, approval, publication, and patrol AAR closeout."
                title="S3 Operations"
              >
                <div className="mb-4 grid gap-3 sm:grid-cols-3">
                  <KpiCard
                    hint="Operations waiting for review"
                    label="Review"
                    tone="warning"
                    value={String(dashboard.s3.missionReviewQueue)}
                  />
                  <KpiCard
                    hint="Approved operations not yet published"
                    label="Unpublished"
                    tone="info"
                    value={String(dashboard.s3.approvedUnpublishedMissions)}
                  />
                  <KpiCard
                    hint="AARs submitted for review"
                    label="AAR Queue"
                    tone="warning"
                    value={String(dashboard.s3.aarQueue)}
                  />
                </div>
                <WidgetList
                  emptyDescription="No upcoming S3 operations are visible."
                  emptyTitle="No operation queue"
                  items={dashboard.s3.upcomingMissions}
                />
              </SectionCard>
              <SectionCard
                description="Active deployment arcs and CONOP review pressure."
                title="Deployment Operations"
              >
                <div className="mb-4">
                  <KpiCard
                    hint="Draft CONOPs that need review or publication"
                    label="CONOP Review"
                    tone={dashboard.s3.conopReviewQueue > 0 ? "warning" : "success"}
                    value={String(dashboard.s3.conopReviewQueue)}
                  />
                </div>
                <WidgetList
                  emptyDescription="No active deployments are visible for S3."
                  emptyTitle="No active deployments"
                  items={dashboard.s3.activeCampaigns}
                />
              </SectionCard>
            </div>
          ) : null}

          {dashboard.visibility.qualifications || dashboard.visibility.qualificationMatrix ? (
            <SectionCard
              description="Training analytics across qualification catalog, records, requirements, and signoff state."
              title="Training Analytics"
            >
              <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <KpiCard
                  hint="Active qualification catalog entries"
                  label="Catalog"
                  tone="info"
                  value={String(dashboard.training.totalQualifications)}
                />
                <KpiCard
                  hint="Members with at least one active qualification"
                  label="Qualified Members"
                  tone="success"
                  value={String(dashboard.training.qualifiedMemberCount)}
                />
                <KpiCard
                  hint="Required qualification gaps"
                  label="Missing"
                  tone={dashboard.training.missingRequired > 0 ? "warning" : "success"}
                  value={String(dashboard.training.missingRequired)}
                />
                <KpiCard
                  hint="Records awaiting instructor signoff"
                  label="Signoffs"
                  tone={dashboard.training.pendingSignoffs > 0 ? "warning" : "muted"}
                  value={String(dashboard.training.pendingSignoffs)}
                />
                <KpiCard
                  hint="Qualifications expiring within 30 days"
                  label="Expiring"
                  tone={dashboard.training.expiringSoon > 0 ? "warning" : "muted"}
                  value={String(dashboard.training.expiringSoon)}
                />
              </div>
              <WidgetList
                emptyDescription="No unit qualification readiness rows are visible."
                emptyTitle="No readiness rows"
                items={dashboard.training.unitQualificationReadiness}
              />
            </SectionCard>
          ) : null}

          {dashboard.visibility.attendance ? (
            <SectionCard
              description="Attendance reporting highlights low participation, missing closeout, and recent no-shows."
              title="Attendance Analytics"
            >
              <div className="mb-4 grid gap-3 sm:grid-cols-3">
                <KpiCard
                  hint="Average accountable attendance"
                  label="Average"
                  tone={toneForPercent(dashboard.attendance.averageAttendance)}
                  value={percentLabel(dashboard.attendance.averageAttendance)}
                />
                <KpiCard
                  hint="Upcoming or recent records missing RSVP/final attention"
                  label="Missing RSVP"
                  tone={dashboard.attendance.missingRsvps > 0 ? "warning" : "success"}
                  value={String(dashboard.attendance.missingRsvps)}
                />
                <KpiCard
                  hint="Recent RSVP yes with absent final status"
                  label="No-shows"
                  tone={dashboard.attendance.recentNoShows.length > 0 ? "danger" : "success"}
                  value={String(dashboard.attendance.recentNoShows.length)}
                />
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <WidgetList
                  emptyDescription="No low-attendance members are visible."
                  emptyTitle="No low attendance"
                  items={dashboard.attendance.lowAttendanceMembers}
                />
                <WidgetList
                  emptyDescription="No events need attendance closeout."
                  emptyTitle="Attendance closed out"
                  items={dashboard.attendance.openAttendanceEvents}
                />
                <WidgetList
                  emptyDescription="No recent no-shows are visible."
                  emptyTitle="No no-shows"
                  items={dashboard.attendance.recentNoShows}
                />
              </div>
            </SectionCard>
          ) : null}
        </div>

        <div className="space-y-6">
          <SectionCard
            description="Personal context remains visible for members and linked staff accounts."
            title="My Readiness"
          >
            <div className="space-y-4">
              <div className="rounded-xl border border-border/70 bg-background/45 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {dashboard.member.unitLabel ? <UnitBadge label={dashboard.member.unitLabel} /> : null}
                  <StatusBadge
                    label={dashboard.member.discordLinked ? "Discord linked" : "Discord pending"}
                    tone={dashboard.member.discordLinked ? "success" : "warning"}
                  />
                </div>
                <p className="mt-3 text-3xl font-semibold text-foreground">
                  {percentLabel(dashboard.readiness.memberPercent)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {dashboard.member.qualificationCount} qualifications /{" "}
                  {dashboard.member.missingRequiredQualifications} missing required
                </p>
              </div>
              {memberNextEvent ? (
                <WidgetList
                  emptyDescription="No next event is visible."
                  emptyTitle="No next event"
                  items={[memberNextEvent]}
                />
              ) : (
                <EmptyState
                  description="No upcoming published event is visible for your unit or global scope."
                  title="No next event"
                />
              )}
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/operations/events">Open events</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/personnel/qualifications">Open qualifications</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/operations/patrols?panel=start">Start Patrol</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/operations/aar-queue?panel=create">Submit Patrol AAR</Link>
                </Button>
              </div>
            </div>
          </SectionCard>

          {dashboard.visibility.personnel ? (
            <SectionCard
              description="S1-focused personnel movement and workflow queues."
              title="Personnel Watch"
            >
              <div className="mb-4 grid gap-3 sm:grid-cols-2">
                <KpiCard
                  hint="Recruit, transfer, and LOA forms awaiting review"
                  label="Applications"
                  tone={dashboard.personnel.pendingApplications > 0 ? "warning" : "success"}
                  value={String(dashboard.personnel.pendingApplications)}
                />
                <KpiCard
                  hint="Active portal users not linked to member profiles"
                  label="Unlinked"
                  tone={dashboard.personnel.unlinkedUsers > 0 ? "warning" : "success"}
                  value={String(dashboard.personnel.unlinkedUsers)}
                />
              </div>
              <WidgetList
                emptyDescription="No profile statuses have visible members."
                emptyTitle="No status breakdown"
                items={dashboard.personnel.statusBreakdown}
              />
            </SectionCard>
          ) : null}

          {dashboard.visibility.admin ||
          dashboard.visibility.audit ||
          dashboard.visibility.notifications ||
          dashboard.visibility.discordHealth ? (
            <SectionCard
              description="System health, Discord delivery issues, and sensitive activity."
              title="Admin Signals"
            >
              <div className="mb-4 grid gap-3 sm:grid-cols-2">
                <KpiCard
                  hint="Active Discord server mappings"
                  label="Discord Servers"
                  tone="info"
                  value={String(dashboard.admin.discordConnectedServers)}
                />
                <KpiCard
                  hint="Current bot/environment health"
                  label="Discord Health"
                  tone={dashboard.visibility.discordHealth ? "info" : "muted"}
                  value={dashboard.admin.discordStatusLabel}
                />
              </div>
              <WidgetList
                emptyDescription="No failed or pending deliveries need attention."
                emptyTitle="Deliveries healthy"
                items={dashboard.admin.failedDeliveries}
              />
              <div className="mt-4">
                <WidgetList
                  emptyDescription="No system actions are pending."
                  emptyTitle="System clear"
                  items={dashboard.admin.pendingSystemActions}
                />
              </div>
            </SectionCard>
          ) : null}

          {dashboard.visibility.audit ? (
            <SectionCard
              description="Recent audited events across administrative and workflow-sensitive actions."
              title="Activity Feed"
            >
              <ActivityList
                emptyDescription="No audit activity is available yet."
                emptyTitle="No recent activity"
                items={dashboard.admin.auditActivity}
              />
            </SectionCard>
          ) : (
            <SectionCard
              description="Role-limited operational activity from visible personnel and roster changes."
              title="Activity Feed"
            >
              <ActivityList
                emptyDescription="No visible personnel activity is available yet."
                emptyTitle="No recent activity"
                items={[
                  ...dashboard.unitLeadership.recentRosterChanges,
                  ...dashboard.personnel.recentChanges,
                ].slice(0, 6)}
              />
            </SectionCard>
          )}
        </div>
      </div>
      </CollapsibleSection>
    </div>
  );
}
