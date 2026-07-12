import Link from "next/link";

import { DashboardWidget } from "@/components/dashboard/dashboard-widget";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ReadinessCard } from "@/components/dashboard/readiness-card";
import { PageHeader } from "@/components/layout/page-header";
import { CollapsibleSection } from "@/components/layout/progressive-disclosure";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge, type BadgeTone } from "@/components/status/status-badge";
import { UnitBadge } from "@/components/status/unit-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RecommendationQueue } from "@/features/operations/components/command-decision-support";
import { HealthSummaryPanel } from "@/features/operations/components/health";
import { GoNoGoBoard } from "@/features/operations/components/readiness";
import { OperationsHandoffRail } from "@/features/operations/components/workflow";
import { formatDateTime } from "@/lib/formatters";
import { getCurrentUser } from "@/server/auth/current-user";
import { getOperationsCenterDashboardData } from "@/server/dashboard";
import { can } from "@/server/permissions/access";
import { MissionBoard, type MissionBoardColumn } from "@/features/s3/components/mission-board";
import { MissionInspectorDrawer } from "@/features/s3/components/mission-inspector-drawer";
import {
  AarForm,
  AarReviewForm,
  ConopForm,
  ConopPublishForm,
  MissionForm,
  MissionLifecycleForm,
  MissionStatusForm,
} from "@/features/s3/components/s3-forms";
import {
  getAarDetail,
  getConopDetail,
  getMissionDetail,
  getS3DashboardData,
  getS3ReferenceData,
  isMissionStatus,
  listAars,
  listConops,
  listMissions,
} from "@/server/s3";
import type {
  AarFilters,
  ConopFilters,
  MissionFilters,
  S3ReferenceData,
} from "@/server/s3";
import { isAarStatus, isConopStatus } from "@/server/s3";
import { isEventType } from "@/server/events/utils";

type SearchParamsValue = string | string[] | undefined;
type SearchParamsRecord = Record<string, SearchParamsValue>;

function getSearchParamValue(searchParams: SearchParamsRecord, key: string) {
  const value = searchParams[key];

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function buildHref(
  pathname: string,
  searchParams: SearchParamsRecord,
  updates: Record<string, string | undefined | null>,
) {
  const nextParams = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    const normalized = Array.isArray(value) ? value[0] : value;

    if (normalized) {
      nextParams.set(key, normalized);
    }
  }

  for (const [key, value] of Object.entries(updates)) {
    if (value) {
      nextParams.set(key, value);
    } else {
      nextParams.delete(key);
    }
  }

  const query = nextParams.toString();

  return query ? `${pathname}?${query}` : pathname;
}

function FlashNotice({
  message,
  tone,
}: {
  message: string;
  tone: BadgeTone;
}) {
  return (
    <Card
      className={
        tone === "danger"
          ? "border-danger/30 bg-danger/10"
          : "border-success/30 bg-success/10"
      }
    >
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {tone === "danger" ? "Action blocked" : "Action completed"}
          </p>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        <StatusBadge label={tone === "danger" ? "Error" : "Saved"} tone={tone} />
      </CardContent>
    </Card>
  );
}

function getConopTone(status: string): BadgeTone {
  return status === "published" ? "success" : "warning";
}

function getAarTone(status: string): BadgeTone {
  switch (status) {
    case "reviewed":
      return "success";
    case "submitted":
      return "warning";
    case "pending-map":
      return "danger";
    default:
      return "muted";
  }
}

function isTruthySearchParam(value: string | undefined) {
  return value === "true" || value === "1" || value === "on";
}

function canManageMissionAction(
  user: Awaited<ReturnType<typeof getCurrentUser>>,
  permissionKey: string,
  hostUnitId?: string | null,
) {
  if (!user) {
    return false;
  }

  return can(user, permissionKey) || (hostUnitId ? can(user, permissionKey, { unitId: hostUnitId }) : false);
}

function MissionFiltersCard({
  filters,
  referenceData,
}: {
  filters: MissionFilters;
  referenceData: S3ReferenceData;
}) {
  const fieldClassName =
    "flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

  return (
    <Card className="border-border/80 bg-card/82">
      <CardHeader>
        <CardTitle>Operation filters</CardTitle>
        <CardDescription>
          Filter the S3 operation queue by lifecycle, unit, deployment, operation type, and follow-up risk.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action="/operations/s3" className="grid gap-4 md:grid-cols-3 xl:grid-cols-4" method="get">
          <input className={fieldClassName} defaultValue={filters.q ?? ""} name="q" placeholder="Search title, planner, Zeus, or deployment" />
          <select className={fieldClassName} defaultValue={filters.unitId ?? ""} name="unitId">
            <option value="">All units</option>
            {referenceData.units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.label}
              </option>
            ))}
          </select>
          <select className={fieldClassName} defaultValue={filters.campaignId ?? ""} name="campaignId">
            <option value="">All deployments</option>
            {referenceData.campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.label}
              </option>
            ))}
          </select>
          <select className={fieldClassName} defaultValue={filters.missionStatus ?? ""} name="missionStatus">
            <option value="">All operation states</option>
            {referenceData.missionStatuses.map((status) => (
              <option key={status.key} value={status.key}>
                {status.label}
              </option>
            ))}
          </select>
          <select className={fieldClassName} defaultValue={filters.eventType ?? ""} name="eventType">
            <option value="">All operation types</option>
            {referenceData.eventTypes.map((eventType) => (
              <option key={eventType.key} value={eventType.key}>
                {eventType.label}
              </option>
            ))}
          </select>
          <input className={fieldClassName} defaultValue={filters.dateFrom ?? ""} name="dateFrom" type="date" />
          <input className={fieldClassName} defaultValue={filters.dateTo ?? ""} name="dateTo" type="date" />
          <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border/70 bg-background/35 px-3 py-2 text-sm text-muted-foreground">
            <label className="flex items-center gap-2">
              <input defaultChecked={filters.missingConop ?? false} name="missingConop" type="checkbox" />
              Missing CONOP
            </label>
            <label className="flex items-center gap-2">
              <input defaultChecked={filters.missingAar ?? false} name="missingAar" type="checkbox" />
              Patrol AAR needed
            </label>
          </div>
          <div className="flex gap-3">
            <Button asChild type="button" variant="ghost">
              <Link href="/operations/s3">Clear</Link>
            </Button>
            <Button type="submit" variant="outline">
              Apply
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function DocumentFiltersCard({
  action,
  title,
  description,
  filters,
  referenceData,
  statusOptions,
}: {
  action: string;
  title: string;
  description: string;
  filters: ConopFilters | AarFilters;
  referenceData: S3ReferenceData;
  statusOptions: Array<{ key: string; label: string }>;
}) {
  const fieldClassName =
    "flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

  return (
    <Card className="border-border/80 bg-card/82">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" method="get">
          <input className={fieldClassName} defaultValue={filters.q ?? ""} name="q" placeholder="Search title, event, deployment, or content" />
          <select className={fieldClassName} defaultValue={filters.eventId ?? ""} name="eventId">
            <option value="">All events</option>
            {referenceData.events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.label}
              </option>
            ))}
          </select>
          <select className={fieldClassName} defaultValue={filters.campaignId ?? ""} name="campaignId">
            <option value="">All deployments</option>
            {referenceData.campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.label}
              </option>
            ))}
          </select>
          <div className="flex gap-3">
            <select className={fieldClassName} defaultValue={filters.status ?? ""} name="status">
              <option value="">All statuses</option>
              {statusOptions.map((status) => (
                <option key={status.key} value={status.key}>
                  {status.label}
                </option>
              ))}
            </select>
            <Button type="submit" variant="outline">
              Apply
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function OperationsCenterList({
  emptyDescription,
  emptyTitle,
  items,
  tone = "info",
}: {
  emptyDescription: string;
  emptyTitle: string;
  items: Array<{
    id: string;
    href?: string;
    meta: string;
    statusLabel?: string;
    title: string;
  }>;
  tone?: BadgeTone;
}) {
  if (items.length === 0) {
    return <EmptyState description={emptyDescription} title={emptyTitle} />;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="rounded-xl border border-border/70 bg-background/45 p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-foreground">{item.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.meta}</p>
            </div>
            {item.statusLabel ? <StatusBadge label={item.statusLabel} tone={tone} /> : null}
          </div>
          {item.href ? (
            <Button asChild className="mt-3" size="sm" variant="outline">
              <Link href={item.href}>Open</Link>
            </Button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export async function OperationsCenterPage() {
  const commandCenter = await getOperationsCenterDashboardData();
  const dashboardData = commandCenter.s3Dashboard;
  const currentDeployment = dashboardData.activeCampaigns[0] ?? null;
  const currentPackage = commandCenter.currentPackage;
  const nextOperation = dashboardData.upcomingMissions[0] ?? null;
  const pendingActionCount =
    dashboardData.awaitingReviewMissions.length +
    dashboardData.approvedUnpublishedMissions.length +
    dashboardData.conopsNeedingReview.length +
    dashboardData.completedMissingAars.length +
    dashboardData.missingScreenshotAars.length +
    dashboardData.patrolAarsAwaitingReview.length;
  const respondedPercent =
    dashboardData.attendanceReadiness.expectedAttendanceCount > 0
      ? Math.round(
          (dashboardData.attendanceReadiness.respondedCount /
            dashboardData.attendanceReadiness.expectedAttendanceCount) *
            100,
        )
      : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={["Operations", "Operations Center"]}
        description="Command decision support for the current deployment, operational week, readiness, critical issues, and recommended handoffs."
        title="Operations Center"
      />
      <Card className="overflow-hidden border-primary/20 bg-linear-to-br from-primary/12 via-card/88 to-background">
        <CardContent className="grid gap-6 p-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label="Current focus" tone="info" />
              {currentDeployment ? (
                <StatusBadge label={currentDeployment.statusLabel} tone="success" />
              ) : (
                <StatusBadge label="No active deployment" tone="warning" />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
                {currentDeployment?.title ?? "No active deployment selected"}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                {currentDeployment
                  ? `${currentDeployment.phase ?? "Phase not set"} / Week ${currentDeployment.currentWeekNumber ?? "TBD"} / ${currentDeployment.nextEventTitle ?? "No next weekend operation linked"}`
                  : "Create or activate a deployment to give S3 and members a single operational center of gravity."}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-border/70 bg-background/45 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Next Operation</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {nextOperation?.title ?? "No published operation"}
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/45 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Planning Status</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {currentDeployment ? currentDeployment.planningStatus : "No active package"}
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/45 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Attendance</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {respondedPercent}% RSVP coverage
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/45 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Pending Actions</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{pendingActionCount} items</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/50 p-4">
            <p className="text-sm font-semibold text-foreground">Quick actions</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Refreshed {formatDateTime(commandCenter.lastRefreshedAt)}
            </p>
            <div className="mt-4 grid gap-3">
              {commandCenter.quickActions.slice(0, 7).map((action) => (
                <Button asChild key={action.id} variant={action.primary ? "default" : "outline"}>
                  <Link href={action.href}>{action.label}</Link>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      {currentPackage && currentDeployment?.packageHref ? (
        <RecommendationQueue
          fallbackHref={currentDeployment.packageHref}
          recommendations={currentPackage.recommendations.active}
          returnTo="/operations"
        />
      ) : null}
      {currentPackage?.recommendations.active.some((recommendation) => recommendation.priority === "critical") ? (
        <Card className="border-danger/35 bg-danger/10">
          <CardHeader>
            <CardTitle>Critical Issues</CardTitle>
            <CardDescription>Critical CDSS recommendations that need command attention.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {currentPackage.recommendations.active
              .filter((recommendation) => recommendation.priority === "critical")
              .slice(0, 4)
              .map((recommendation) => (
                <div key={recommendation.id} className="rounded-xl border border-danger/25 bg-background/45 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{recommendation.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{recommendation.reason}</p>
                    </div>
                    <StatusBadge label={recommendation.category} tone="danger" />
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      ) : null}
      {currentPackage?.health && currentDeployment?.packageHref ? (
        <HealthSummaryPanel
          health={currentPackage.health}
          packageHref={currentDeployment.packageHref}
          showInspector={false}
        />
      ) : null}
      {currentPackage?.readiness && currentDeployment?.packageHref ? (
        <GoNoGoBoard
          packageHref={currentDeployment.packageHref}
          readiness={currentPackage.readiness}
          showChecklist={false}
        />
      ) : null}
      <OperationsHandoffRail
        currentStep={currentPackage ? `${currentPackage.completion.percent}% package ready` : "No active package"}
        handoffs={[
          {
            description: "Members see the current operation package, RSVP, resources, and mod preset without needing staff context.",
            from: "S3",
            status: "info",
            to: "Members",
          },
          {
            description: "Zeus and deployment creators receive package readiness, CONOP, tasking, and progression context before publication.",
            from: "S3",
            status: "warning",
            to: "Zeus",
          },
          {
            description: "Patrol leaders submit AARs and screenshots so S3 can fold progression notes into the next week.",
            from: "Patrols",
            status: "success",
            to: "S3",
          },
          {
            description: "Command reviews health, intent alignment, and progression recommendations before the next operational decision.",
            from: "S3",
            status: "info",
            to: "Command",
          },
        ]}
      />
      <CollapsibleSection
        badgeLabel={`${commandCenter.widgets.length} modules`}
        description="Widget registry, refresh cadence, and collapse defaults are available for staff diagnostics without competing with live operations."
        title="Secondary diagnostics"
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {commandCenter.widgets.slice(0, 8).map((widget) => (
            <div key={widget.id} className="rounded-xl border border-border/70 bg-background/45 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{widget.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{widget.dataProvider}</p>
                </div>
                <StatusBadge label={widget.size.toUpperCase()} tone="muted" />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {widget.refreshIntervalSeconds ? `${widget.refreshIntervalSeconds}s refresh` : "Manual refresh"} /{" "}
                {widget.collapsedByDefault ? "Collapsed" : "Expanded"}
              </p>
            </div>
          ))}
        </div>
      </CollapsibleSection>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
        <div className="space-y-6">
          <Card className="border-border/80 bg-card/88">
            <CardHeader>
              <CardTitle>Needs attention</CardTitle>
              <CardDescription>
                Command-facing queues that should be handled before the next operation cycle.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-2">
              <OperationsCenterList
                emptyDescription="No operations are waiting on S3 review."
                emptyTitle="Review queue clear"
                items={dashboardData.awaitingReviewMissions.map((mission) => ({
                  id: mission.id,
                  href: `/operations/s3?inspect=${mission.id}`,
                  meta: `${formatDateTime(mission.startsAt)} / ${mission.hostUnit?.shortName ?? "Unscoped"}`,
                  statusLabel: mission.missionStatusLabel,
                  title: mission.title,
                }))}
                tone="warning"
              />
              <OperationsCenterList
                emptyDescription="No patrols are missing AAR follow-up."
                emptyTitle="AAR queue clear"
                items={dashboardData.completedMissingAars.map((mission) => ({
                  id: mission.id,
                  href: `/operations/aar-queue?panel=create&eventId=${mission.id}`,
                  meta: `${formatDateTime(mission.startsAt)} / ${mission.hostUnit?.shortName ?? "Unscoped"}`,
                  statusLabel: "Needs AAR",
                  title: mission.title,
                }))}
                tone="danger"
              />
              <OperationsCenterList
                emptyDescription="No Patrol AARs are waiting for S3 review."
                emptyTitle="Review queue clear"
                items={dashboardData.patrolAarsAwaitingReview.map((aar) => ({
                  id: aar.id,
                  href: `/operations/aar-queue?panel=review&aarId=${aar.id}`,
                  meta: `${aar.event?.title ?? "Patrol"} / ${aar.hasMapScreenshot ? "Map attached" : "Map required"}`,
                  statusLabel: aar.statusLabel,
                  title: aar.title,
                }))}
                tone="warning"
              />
              <OperationsCenterList
                emptyDescription="No submitted Patrol AARs are missing map screenshots."
                emptyTitle="Screenshots complete"
                items={dashboardData.missingScreenshotAars.map((aar) => ({
                  id: aar.id,
                  href: `/operations/aar-queue?aarId=${aar.id}`,
                  meta: `${aar.event?.title ?? "Patrol"} / map screenshot required`,
                  statusLabel: "Missing Screenshot",
                  title: aar.title,
                }))}
                tone="danger"
              />
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/88">
            <CardHeader>
              <CardTitle>Active patrols</CardTitle>
              <CardDescription>
                Lightweight patrols currently running or recently started. These do not use Weekend Operation attendance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OperationsCenterList
                emptyDescription="No active patrols are currently running."
                emptyTitle="No active patrols"
                items={dashboardData.activePatrols.map((mission) => ({
                  id: mission.id,
                  href: `/operations/patrols?inspect=${mission.id}`,
                  meta: `${formatDateTime(mission.startsAt)} / ${mission.campaign?.title ?? "Unassigned deployment"}`,
                  statusLabel: mission.eventTypeLabel,
                  title: mission.title,
                }))}
                tone="success"
              />
            </CardContent>
          </Card>
          <CollapsibleSection
            badgeLabel={`${commandCenter.dashboard.attendance.missingRsvps + commandCenter.dashboard.training.missingRequired} signals`}
            badgeTone={
              commandCenter.dashboard.attendance.missingRsvps + commandCenter.dashboard.training.missingRequired > 0
                ? "warning"
                : "success"
            }
            description="Personnel, attendance, qualification, and leadership signals are still available, but Operations Center keeps package execution first."
            title="Personnel readiness signals"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <DashboardWidget
                description="Community-level active member count in the current visibility scope"
                title="Active Members"
                tone="success"
                value={String(commandCenter.dashboard.community.activeMembers)}
              />
              <DashboardWidget
                description="Members or events needing attendance attention"
                title="Attendance Issues"
                tone={commandCenter.dashboard.attendance.missingRsvps > 0 ? "warning" : "success"}
                value={String(commandCenter.dashboard.attendance.missingRsvps)}
              />
              <DashboardWidget
                description="Required qualification gaps and expiring qualification signals"
                title="Qualification Gaps"
                tone={commandCenter.dashboard.training.missingRequired > 0 ? "warning" : "success"}
                value={String(commandCenter.dashboard.training.missingRequired)}
              />
              <DashboardWidget
                description="Leadership and unit readiness items visible to this user"
                title="Unit Readiness"
                tone={commandCenter.dashboard.unitLeadership.unitReadiness.length > 0 ? "info" : "muted"}
                value={String(commandCenter.dashboard.unitLeadership.unitReadiness.length)}
              />
              <div className="md:col-span-2">
                <Button asChild size="sm" variant="outline">
                  <Link href="/personnel">Open Personnel Dashboard</Link>
                </Button>
              </div>
            </div>
          </CollapsibleSection>
          <Card className="border-border/80 bg-card/88">
            <CardHeader>
              <CardTitle>Upcoming</CardTitle>
              <CardDescription>
                Published operations and patrols coming up next, with the assigned Zeus or planner visible at a glance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OperationsCenterList
                emptyDescription="No published upcoming operations are visible yet."
                emptyTitle="No upcoming operations"
                items={dashboardData.upcomingMissions.map((mission) => ({
                  id: mission.id,
                  href: `/operations/events/${mission.id}`,
                  meta: `${formatDateTime(mission.startsAt)} / ${mission.zeusName ?? mission.missionMakerName ?? "Zeus TBD"}`,
                  statusLabel: mission.eventTypeLabel,
                  title: mission.title,
                }))}
              />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Active deployments</CardTitle>
              <CardDescription>
                Only deployments with active operational work are shown here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OperationsCenterList
                emptyDescription="No active deployments currently have visible operations."
                emptyTitle="No active deployments"
                items={dashboardData.activeCampaigns.map((campaign) => ({
                  id: campaign.id,
                  href: campaign.packageHref ?? `/operations/deployments/${campaign.id}`,
                  meta: `${campaign.phase ?? "Phase not set"} / Week ${campaign.currentWeekNumber ?? "TBD"} / ${campaign.releaseVersion ?? "No release"} / ${campaign.nextEventTitle ?? "No next operation linked"}`,
                  statusLabel: campaign.releaseStatus ?? campaign.planningStatus,
                  title: campaign.title,
                }))}
                tone="success"
              />
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Assigned Zeus</CardTitle>
              <CardDescription>Upcoming operations with known or missing Zeus ownership.</CardDescription>
            </CardHeader>
            <CardContent>
              <OperationsCenterList
                emptyDescription="No upcoming Zeus assignments are visible yet."
                emptyTitle="No Zeus assignments"
                items={dashboardData.missionMakerAssignments.map((assignment) => ({
                  id: assignment.missionId,
                  href: `/operations/events/${assignment.missionId}`,
                  meta: `${formatDateTime(assignment.startsAt)} / ${assignment.hostUnitShortName ?? "Unscoped"}`,
                  statusLabel: assignment.zeusName ?? "Zeus TBD",
                  title: assignment.title,
                }))}
                tone="info"
              />
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>
                Portal notifications, failed deliveries, and Discord-facing delivery health.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Unread notifications</p>
                <StatusBadge label={String(commandCenter.notificationCenter.unreadCount)} tone={commandCenter.notificationCenter.unreadCount > 0 ? "warning" : "success"} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Failed deliveries</p>
                <StatusBadge label={String(commandCenter.notificationDeliveryOverview.summary.failed)} tone={commandCenter.notificationDeliveryOverview.summary.failed > 0 ? "danger" : "success"} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Recent Discord activity</p>
                <StatusBadge label={commandCenter.dashboard.admin.discordStatusLabel} tone={commandCenter.dashboard.admin.discordConnectedServers > 0 ? "success" : "warning"} />
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button asChild size="sm" variant="outline">
                  <Link href="/dashboard">Open Dashboard</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/administration/notifications">Open Deliveries</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>Chronological operational activity from packages, audit logs, roster changes, and system events.</CardDescription>
            </CardHeader>
            <CardContent>
              <OperationsCenterList
                emptyDescription="Operational activity will appear after package, roster, or system changes."
                emptyTitle="No recent activity"
                items={commandCenter.activityFeed.map((entry) => ({
                  id: entry.id,
                  href: entry.href,
                  meta: `${entry.entityType} / ${formatDateTime(entry.createdAt)}`,
                  statusLabel: entry.action,
                  title: entry.summary,
                }))}
                tone="info"
              />
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Progression recommendations</CardTitle>
              <CardDescription>Recent reviewed Patrol AARs that can influence next-week planning.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboardData.recentProgressionRecommendations.length > 0 ? (
                dashboardData.recentProgressionRecommendations.map((aar) => (
                  <div key={aar.id} className="rounded-xl border border-border/70 bg-background/45 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-foreground">{aar.title}</p>
                      <StatusBadge label={aar.statusLabel} tone={getAarTone(aar.status)} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {aar.event?.title ?? aar.campaign?.title ?? "Unlinked Patrol AAR"}
                    </p>
                    <Button asChild className="mt-3" size="sm" variant="outline">
                      <Link href={`/operations/aar-queue?aarId=${aar.id}`}>Open progression context</Link>
                    </Button>
                  </div>
                ))
              ) : (
                <EmptyState description="Reviewed Patrol AAR progression notes will appear here." title="No progression recommendations" />
              )}
            </CardContent>
          </Card>
          <CollapsibleSection
            badgeLabel={`${commandCenter.timeline.length} items`}
            description="Planning, publishing, Weekend Operations, Patrol AARs, intent assessments, and progression signals remain available as history."
            title="Deployment timeline"
          >
              <OperationsCenterList
                emptyDescription="Timeline items appear once deployments, operations, releases, AARs, or assessments exist."
                emptyTitle="No timeline yet"
                items={commandCenter.timeline.map((item) => ({
                  id: item.id,
                  href: item.href,
                  meta: `${item.type} / ${item.timestamp ? formatDateTime(item.timestamp) : item.meta}`,
                  statusLabel: item.timestamp ? item.meta : undefined,
                  title: item.label,
                }))}
                tone="info"
              />
          </CollapsibleSection>
        </div>
      </div>
    </div>
  );
}

export async function S3DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const missionStatus = getSearchParamValue(resolvedSearchParams, "missionStatus");
  const eventType = getSearchParamValue(resolvedSearchParams, "eventType");
  const panel = getSearchParamValue(resolvedSearchParams, "panel");
  const missionId = getSearchParamValue(resolvedSearchParams, "missionId");
  const inspectId = getSearchParamValue(resolvedSearchParams, "inspect");
  const message = getSearchParamValue(resolvedSearchParams, "message");
  const error = getSearchParamValue(resolvedSearchParams, "error");
  const filters: MissionFilters = {
    q: getSearchParamValue(resolvedSearchParams, "q"),
    unitId: getSearchParamValue(resolvedSearchParams, "unitId"),
    campaignId: getSearchParamValue(resolvedSearchParams, "campaignId"),
    missionStatus:
      missionStatus === "" || (missionStatus && isMissionStatus(missionStatus))
        ? missionStatus
        : undefined,
    eventType:
      eventType === "" || (eventType && isEventType(eventType))
        ? eventType
        : undefined,
    dateFrom: getSearchParamValue(resolvedSearchParams, "dateFrom"),
    dateTo: getSearchParamValue(resolvedSearchParams, "dateTo"),
    missingConop: isTruthySearchParam(getSearchParamValue(resolvedSearchParams, "missingConop")),
    missingAar: isTruthySearchParam(getSearchParamValue(resolvedSearchParams, "missingAar")),
  };
  const [missionData, dashboardData, referenceData, selectedMission, inspectedMission, user] = await Promise.all([
    listMissions(filters),
    getS3DashboardData(),
    getS3ReferenceData("s3.missions.view"),
    missionId ? getMissionDetail(missionId) : Promise.resolve(null),
    inspectId ? getMissionDetail(inspectId) : Promise.resolve(null),
    getCurrentUser(),
  ]);
  const cleanHref = buildHref("/operations/s3", resolvedSearchParams, {
    panel: undefined,
    missionId: undefined,
    message: undefined,
    error: undefined,
  });
  const canCreateDeployment = user
    ? can(user, "deployments.create") || can(user, "campaigns.create")
    : false;
  const closeInspectHref = buildHref("/operations/s3", resolvedSearchParams, {
    inspect: undefined,
  });
  const respondedPercent =
    dashboardData.attendanceReadiness.expectedAttendanceCount > 0
      ? Math.round(
          (dashboardData.attendanceReadiness.respondedCount /
            dashboardData.attendanceReadiness.expectedAttendanceCount) *
            100,
        )
      : 0;
  const buildPanelHref = (nextPanel: string, targetMissionId: string) =>
    buildHref("/operations/s3", resolvedSearchParams, {
      inspect: undefined,
      panel: nextPanel,
      missionId: targetMissionId,
      message: undefined,
      error: undefined,
    });
  const buildInspectHref = (targetMissionId: string) =>
    buildHref("/operations/s3", resolvedSearchParams, {
      inspect: targetMissionId,
      panel: undefined,
      missionId: undefined,
      message: undefined,
      error: undefined,
    });
  const missionBoardColumns: MissionBoardColumn[] = [
    {
      key: "draft",
      title: "Draft",
      description: "Operation records still being assembled before review submission.",
      emptyTitle: "No draft operations",
      emptyDescription: "Draft operations will collect here until they are ready for S3 review.",
      items: missionData.missions.filter((mission) => mission.missionStatus === "draft"),
    },
    {
      key: "s3-review",
      title: "S3 Review",
      description: "Operations queued for review and command-level decision support.",
      emptyTitle: "No review queue",
      emptyDescription: "Nothing is currently waiting for S3 review.",
      items: missionData.missions.filter((mission) => mission.missionStatus === "s3-review"),
    },
    {
      key: "approved",
      title: "Approved",
      description: "Operation records approved and waiting for publication or final adjustments.",
      emptyTitle: "No approved operations",
      emptyDescription: "Approved operations will appear here until they are published.",
      items: missionData.missions.filter((mission) => mission.missionStatus === "approved"),
    },
    {
      key: "published",
      title: "Published",
      description: "Published operations with active attendance and readiness follow-up.",
      emptyTitle: "No published operations",
      emptyDescription: "Published operations will appear here when they are live.",
      items: missionData.missions.filter((mission) => mission.missionStatus === "published"),
    },
    {
      key: "completed",
      title: "Completed",
      description: "Executed operations with closeout activity moving toward archival.",
      emptyTitle: "No completed operations",
      emptyDescription: "Completed operations with closed follow-up will collect here.",
      items: missionData.missions.filter(
        (mission) =>
          (mission.missionStatus === "completed" && !mission.missingAar) ||
          mission.missionStatus === "aar-submitted",
      ),
    },
    {
      key: "needs-aar",
      title: "Needs AAR",
      description: "Patrols still missing submitted follow-up.",
      emptyTitle: "No AAR backlog",
      emptyDescription: "Post-operation follow-up is currently in good shape.",
      items: missionData.missions.filter((mission) => mission.missingAar),
    },
    {
      key: "archived",
      title: "Archived",
      description: "Historical operation records preserved for reference.",
      emptyTitle: "No archived operations",
      emptyDescription: "Archived operations will remain visible here for reference.",
      items: missionData.missions.filter((mission) => mission.missionStatus === "archived"),
    },
  ].map((column) => ({
    ...column,
    items: column.items.map((mission) => {
      const actions = [];
      const canEdit = canManageMissionAction(user, "s3.missions.edit", mission.hostUnit?.id);
      const canReview = canManageMissionAction(user, "s3.missions.review", mission.hostUnit?.id);
      const canApprove = canManageMissionAction(user, "s3.missions.approve", mission.hostUnit?.id);
      const canReject = canManageMissionAction(user, "s3.missions.reject", mission.hostUnit?.id);
      const canPublishMission = canManageMissionAction(user, "s3.missions.publish", mission.hostUnit?.id);
      const canArchive = canManageMissionAction(user, "s3.missions.archive", mission.hostUnit?.id);

      if (mission.missionStatus === "draft" && canReview) {
        actions.push({ href: buildPanelHref("review", mission.id), label: "Send for review", variant: "outline" as const });
      } else if (mission.missionStatus === "s3-review" && canApprove) {
        actions.push({ href: buildPanelHref("approve", mission.id), label: "Approve", variant: "outline" as const });
      } else if (mission.missionStatus === "s3-review" && canReject) {
        actions.push({ href: buildPanelHref("reject", mission.id), label: "Return to draft", variant: "outline" as const });
      } else if (mission.missionStatus === "approved" && canPublishMission) {
        actions.push({ href: buildPanelHref("publish", mission.id), label: "Publish", variant: "outline" as const });
      } else if (mission.missionStatus !== "archived" && canArchive && mission.status === "completed") {
        actions.push({ href: buildPanelHref("archive", mission.id), label: "Archive", variant: "outline" as const });
      }

      if (canEdit) {
        actions.push({ href: buildPanelHref("edit", mission.id), label: "Edit", variant: "ghost" as const });
      }

      return {
        id: mission.id,
        title: mission.title,
        description: mission.description,
        eventType: mission.eventType,
        eventTypeLabel: mission.eventTypeLabel,
        missionStatus: mission.missionStatus,
        missionStatusLabel: mission.missionStatusLabel,
        startsAt: mission.startsAt,
        hostUnitShortName: mission.hostUnit?.shortName ?? null,
        campaignTitle: mission.campaign?.title ?? null,
        participatingUnitsSummary: mission.participatingUnitsSummary,
        missingConop: mission.missingConop,
        missingAar: mission.missingAar,
        latestConopStatusLabel: mission.latestConopStatusLabel,
        latestAarStatusLabel: mission.latestAarStatusLabel,
        expectedAttendanceCount: mission.expectedAttendanceCount,
        rsvpCounts: mission.rsvpCounts,
        finalAttendanceCounts: mission.finalAttendanceCounts,
        inspectHref: buildInspectHref(mission.id),
        eventHref: `/operations/events/${mission.id}`,
        actions: actions.slice(0, 2),
      };
    }),
  }));
  const inspectedMissionActionLinks = inspectedMission
    ? {
        eventHref: `/operations/events/${inspectedMission.id}`,
        editHref: canManageMissionAction(user, "s3.missions.edit", inspectedMission.hostUnit?.id)
          ? buildPanelHref("edit", inspectedMission.id)
          : undefined,
        statusHref: canManageMissionAction(user, "s3.missions.edit", inspectedMission.hostUnit?.id)
          ? buildPanelHref("status", inspectedMission.id)
          : undefined,
        reviewHref:
          inspectedMission.missionStatus === "draft" &&
          canManageMissionAction(user, "s3.missions.review", inspectedMission.hostUnit?.id)
            ? buildPanelHref("review", inspectedMission.id)
            : undefined,
        approveHref:
          inspectedMission.missionStatus === "s3-review" &&
          canManageMissionAction(user, "s3.missions.approve", inspectedMission.hostUnit?.id)
            ? buildPanelHref("approve", inspectedMission.id)
            : undefined,
        rejectHref:
          inspectedMission.missionStatus === "s3-review" &&
          canManageMissionAction(user, "s3.missions.reject", inspectedMission.hostUnit?.id)
            ? buildPanelHref("reject", inspectedMission.id)
            : undefined,
        publishHref:
          inspectedMission.missionStatus === "approved" &&
          canManageMissionAction(user, "s3.missions.publish", inspectedMission.hostUnit?.id)
            ? buildPanelHref("publish", inspectedMission.id)
            : undefined,
        archiveHref:
          inspectedMission.missionStatus !== "archived" &&
          canManageMissionAction(user, "s3.missions.archive", inspectedMission.hostUnit?.id)
            ? buildPanelHref("archive", inspectedMission.id)
            : undefined,
      }
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={["Operations", "Operations Center"]}
        description="Operational command center for deployments, weekend operations, patrols, Zeus assignment, weekly tasking, Discord publication, and AAR review."
        title="Operations Center Board"
      />
      <Card className="border-border/80 bg-card/72">
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Operations control</p>
            <p className="text-sm text-muted-foreground">
              Create deployments first, then manage weekend operations, patrols, tasking, Zeus ownership, and follow-up from the event records.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {canCreateDeployment ? (
              <Button asChild>
                <Link href="/operations/deployments?panel=create">
                  Create Deployment
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href={buildHref("/operations/s3", resolvedSearchParams, { panel: "create", eventType: "operation" })}>
                Create Weekend Operation
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/operations/patrols?panel=start">Start Patrol</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/operations/deployments">Open Deployments</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/operations/aar-queue">Review Patrol AARs</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
      {message ? <FlashNotice message={message} tone="success" /> : null}
      {error ? <FlashNotice message={error} tone="danger" /> : null}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          hint="Operations in the current S3 workspace scope"
          label="Tracked Operations"
          tone="info"
          trend="Lifecycle live"
          value={String(missionData.summary.totalMissions)}
        />
        <DashboardWidget
          description="Operations waiting on S3 review and command decision"
          title="Awaiting Review"
          tone="warning"
          value={String(missionData.summary.reviewMissions)}
        />
        <KpiCard
          hint="RSVP response coverage across tracked operations"
          label="Attendance Readiness"
          tone="success"
          trend={`${dashboardData.attendanceReadiness.missingRsvpCount} missing RSVP`}
          value={`${respondedPercent}%`}
        />
        <ReadinessCard
          hint="Patrols still missing a submitted AAR"
          label="Patrol AARs"
          statusLabel="Review queue"
          value={String(missionData.summary.missionsMissingAar)}
        />
      </section>
      {panel === "create" ? (
        <MissionForm defaultEventType={filters.eventType ?? null} referenceData={referenceData} returnTo={cleanHref} />
      ) : null}
      {panel === "edit" && selectedMission ? (
        <MissionForm mission={selectedMission} referenceData={referenceData} returnTo={cleanHref} />
      ) : null}
      {panel === "status" && selectedMission ? (
        <MissionStatusForm mission={selectedMission} referenceData={referenceData} returnTo={cleanHref} />
      ) : null}
      {panel === "review" && selectedMission ? (
        <MissionLifecycleForm actionKey="review" missionId={selectedMission.id} returnTo={cleanHref} />
      ) : null}
      {panel === "approve" && selectedMission ? (
        <MissionLifecycleForm actionKey="approve" missionId={selectedMission.id} returnTo={cleanHref} />
      ) : null}
      {panel === "reject" && selectedMission ? (
        <MissionLifecycleForm actionKey="reject" missionId={selectedMission.id} returnTo={cleanHref} />
      ) : null}
      {panel === "publish" && selectedMission ? (
        <MissionLifecycleForm actionKey="publish" missionId={selectedMission.id} returnTo={cleanHref} />
      ) : null}
      {panel === "archive" && selectedMission ? (
        <MissionLifecycleForm actionKey="archive" missionId={selectedMission.id} returnTo={cleanHref} />
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <MissionFiltersCard filters={filters} referenceData={referenceData} />
          <Card className="border-border/80 bg-card/88">
            <CardHeader>
              <CardTitle>Operations board</CardTitle>
              <CardDescription>
                Move from planning to review, publishing, execution, and patrol AAR follow-up without losing command context.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {missionData.missions.length === 0 ? (
                <EmptyState
                  description="No operations matched the current S3 filters."
                  title="No operations found"
                />
              ) : (
                <MissionBoard columns={missionBoardColumns} />
              )}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>S3 readiness</CardTitle>
              <CardDescription>
                One view for attendance posture, CONOP coverage, and publication backlog.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Tracked attendance operations</p>
                <StatusBadge label={String(dashboardData.attendanceReadiness.trackedMissions)} tone="info" />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">RSVP response coverage</p>
                <StatusBadge
                  label={`${respondedPercent}%`}
                  tone={respondedPercent >= 80 ? "success" : respondedPercent >= 60 ? "warning" : "danger"}
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Published operations</p>
                <StatusBadge label={String(missionData.summary.publishedMissions)} tone="success" />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Draft CONOPs</p>
                <StatusBadge label={String(dashboardData.conopStatusSummary.draft)} tone="warning" />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Missing AAR follow-up</p>
                <StatusBadge label={String(missionData.summary.missionsMissingAar)} tone="danger" />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Missing screenshots</p>
                <StatusBadge label={String(dashboardData.missingScreenshotAars.length)} tone="danger" />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">AARs awaiting review</p>
                <StatusBadge label={String(dashboardData.patrolAarsAwaitingReview.length)} tone="warning" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Active deployments</CardTitle>
              <CardDescription>Current deployments with their next linked weekend operation or patrol.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboardData.activeCampaigns.length > 0 ? (
                dashboardData.activeCampaigns.map((campaign) => (
                  <div key={campaign.id} className="rounded-xl border border-border/70 bg-background/45 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-foreground">{campaign.title}</p>
                      <StatusBadge label={campaign.releaseVersion ?? campaign.planningStatus} tone={campaign.releaseStatus === "published" ? "success" : "info"} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {campaign.phase ?? "No phase set"} / Week {campaign.currentWeekNumber ?? "TBD"} / {campaign.releaseStatus ?? "Pending publication"} / {campaign.nextEventTitle ?? "No next operation linked"}
                    </p>
                    {campaign.packageHref ? (
                      <Button asChild className="mt-3" size="sm" variant="outline">
                        <Link href={campaign.packageHref}>Open package</Link>
                      </Button>
                    ) : null}
                  </div>
                ))
              ) : (
                <EmptyState description="No active deployments are currently in scope." title="No active deployments" />
              )}
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>CONOP review queue</CardTitle>
              <CardDescription>Draft CONOPs still waiting to be published.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboardData.conopsNeedingReview.length > 0 ? (
                dashboardData.conopsNeedingReview.map((conop) => (
                  <div key={conop.id} className="rounded-xl border border-border/70 bg-background/45 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-foreground">{conop.title}</p>
                      <StatusBadge label={conop.statusLabel} tone={getConopTone(conop.status)} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {conop.event?.title ?? conop.campaign?.title ?? "Unlinked"}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState description="No CONOP drafts are waiting in the review queue." title="Queue is clear" />
              )}
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Patrol AAR queue</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboardData.completedMissingAars.length > 0 ? (
                dashboardData.completedMissingAars.map((mission) => (
                  <div key={mission.id} className="rounded-xl border border-danger/25 bg-danger/10 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-foreground">{mission.title}</p>
                      <StatusBadge label="Needs AAR" tone="danger" />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatDateTime(mission.startsAt)} {mission.hostUnit ? ` / ${mission.hostUnit.shortName}` : ""}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState description="No patrols are waiting on AAR follow-up right now." title="AAR backlog clear" />
              )}
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>AAR review signals</CardTitle>
              <CardDescription>Submitted AARs, missing map screenshots, and recent progression context.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboardData.missingScreenshotAars.map((aar) => (
                <div key={aar.id} className="rounded-xl border border-danger/25 bg-danger/10 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-foreground">{aar.title}</p>
                    <StatusBadge label="Missing Screenshot" tone="danger" />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{aar.event?.title ?? "Patrol AAR"}</p>
                </div>
              ))}
              {dashboardData.patrolAarsAwaitingReview.map((aar) => (
                <div key={aar.id} className="rounded-xl border border-warning/25 bg-warning/10 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-foreground">{aar.title}</p>
                    <StatusBadge label="Awaiting Review" tone="warning" />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{aar.event?.title ?? "Patrol AAR"}</p>
                </div>
              ))}
              {dashboardData.missingScreenshotAars.length === 0 && dashboardData.patrolAarsAwaitingReview.length === 0 ? (
                <EmptyState description="No submitted Patrol AARs need S3 follow-up right now." title="Review signals clear" />
              ) : null}
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Assigned Zeus</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboardData.missionMakerAssignments.length > 0 ? (
                dashboardData.missionMakerAssignments.map((assignment) => (
                  <div key={assignment.missionId} className="rounded-xl border border-border/70 bg-background/45 p-3">
                    <p className="font-semibold text-foreground">{assignment.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {assignment.missionMakerName ?? "Planner TBD"} / {assignment.zeusName ?? "Zeus TBD"}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      {formatDateTime(assignment.startsAt)} {assignment.hostUnitShortName ? ` / ${assignment.hostUnitShortName}` : ""}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState description="No upcoming Zeus assignments are available yet." title="No assignments" />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <MissionInspectorDrawer
        actionLinks={
          inspectedMissionActionLinks ?? {
            eventHref: inspectId ? `/operations/events/${inspectId}` : "/operations/events",
          }
        }
        closeHref={closeInspectHref}
        mission={inspectedMission}
        open={Boolean(inspectedMission)}
      />
    </div>
  );
}

export async function ConopsLibraryPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const panel = getSearchParamValue(resolvedSearchParams, "panel");
  const conopId = getSearchParamValue(resolvedSearchParams, "conopId");
  const status = getSearchParamValue(resolvedSearchParams, "status");
  const message = getSearchParamValue(resolvedSearchParams, "message");
  const error = getSearchParamValue(resolvedSearchParams, "error");
  const filters: ConopFilters = {
    q: getSearchParamValue(resolvedSearchParams, "q"),
    eventId: getSearchParamValue(resolvedSearchParams, "eventId"),
    campaignId: getSearchParamValue(resolvedSearchParams, "campaignId"),
    status: status === "" || (status && isConopStatus(status)) ? status : undefined,
  };
  const [conopData, referenceData, selectedConop] = await Promise.all([
    listConops(filters),
    getS3ReferenceData("s3.conops.view"),
    conopId ? getConopDetail(conopId) : Promise.resolve(null),
  ]);
  const cleanHref = buildHref("/operations/conops", resolvedSearchParams, {
    panel: undefined,
    message: undefined,
    error: undefined,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={["Operations", "CONOPs"]}
        description="Structured CONOP library tied to mission and campaign records instead of scattered documents."
        title="CONOPs"
      />
      <Card className="border-border/80 bg-card/72">
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">CONOP workspace</p>
            <p className="text-sm text-muted-foreground">
              Draft, review, publish, and link operational briefs directly to the missions they support.
            </p>
          </div>
          <Button asChild>
            <Link href={buildHref("/operations/conops", resolvedSearchParams, { panel: "create" })}>
              Create CONOP
            </Link>
          </Button>
        </CardContent>
      </Card>
      {message ? <FlashNotice message={message} tone="success" /> : null}
      {error ? <FlashNotice message={error} tone="danger" /> : null}
      <section className="grid gap-4 md:grid-cols-3">
        <KpiCard hint="Total CONOP records in scope" label="Tracked CONOPs" tone="info" value={String(conopData.summary.total)} />
        <DashboardWidget description="Draft CONOPs needing attention" title="Drafts" tone="warning" value={String(conopData.summary.draft)} />
        <ReadinessCard hint="Published operational briefs" label="Published" statusLabel="Reference ready" value={String(conopData.summary.published)} />
      </section>
      {panel === "create" ? <ConopForm referenceData={referenceData} returnTo={cleanHref} /> : null}
      {panel === "edit" && selectedConop ? (
        <ConopForm conop={selectedConop} referenceData={referenceData} returnTo={cleanHref} />
      ) : null}
      {panel === "publish" && selectedConop ? (
        <ConopPublishForm conopId={selectedConop.id} returnTo={cleanHref} />
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <DocumentFiltersCard
            action="/operations/conops"
            description="Filter the CONOP library by linked mission, campaign, or publish state."
            filters={filters}
            referenceData={referenceData}
            statusOptions={referenceData.conopStatuses}
            title="CONOP filters"
          />
          {conopData.conops.length === 0 ? (
            <EmptyState description="No CONOPs matched the current filters." title="No CONOPs found" />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {conopData.conops.map((conop) => (
                <Card key={conop.id} className="border-border/70 bg-background/45">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle>{conop.title}</CardTitle>
                        <CardDescription>
                          {conop.event?.title ?? conop.campaign?.title ?? "Unlinked CONOP"}
                        </CardDescription>
                      </div>
                      <StatusBadge label={conop.statusLabel} tone={getConopTone(conop.status)} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {conop.event?.hostUnitShortName ? <UnitBadge label={conop.event.hostUnitShortName} /> : null}
                      {conop.missionMakerName ? <StatusBadge label={`MM: ${conop.missionMakerName}`} tone="info" /> : null}
                      {conop.zeusName ? <StatusBadge label={`Zeus: ${conop.zeusName}`} tone="muted" /> : null}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Updated {formatDateTime(conop.updatedAt)}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Button asChild size="sm">
                        <Link href={buildHref("/operations/conops", resolvedSearchParams, { conopId: conop.id })}>
                          Inspect
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link href={buildHref("/operations/conops", resolvedSearchParams, { panel: "edit", conopId: conop.id })}>
                          Edit
                        </Link>
                      </Button>
                      {conop.status !== "published" ? (
                        <Button asChild size="sm" variant="outline">
                          <Link href={buildHref("/operations/conops", resolvedSearchParams, { panel: "publish", conopId: conop.id })}>
                            Publish
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-4">
          {selectedConop ? (
            <Card className="border-border/80 bg-card/82">
              <CardHeader>
                <CardTitle>{selectedConop.title}</CardTitle>
                <CardDescription>
                  OPORD-style sections for quick review and one-click navigation back to the linked operation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge label={selectedConop.statusLabel} tone={getConopTone(selectedConop.status)} />
                  {selectedConop.event?.hostUnitShortName ? <UnitBadge label={selectedConop.event.hostUnitShortName} /> : null}
                </div>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p><span className="font-semibold text-foreground">Situation:</span> {selectedConop.situation ?? "Not documented yet."}</p>
                  <p><span className="font-semibold text-foreground">Operation brief:</span> {selectedConop.mission ?? "Not documented yet."}</p>
                  <p><span className="font-semibold text-foreground">Execution:</span> {selectedConop.execution ?? "Not documented yet."}</p>
                  <p><span className="font-semibold text-foreground">Sustainment:</span> {selectedConop.sustainment ?? "Not documented yet."}</p>
                  <p><span className="font-semibold text-foreground">Command & signal:</span> {selectedConop.commandSignal ?? "Not documented yet."}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {selectedConop.event ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/operations/events/${selectedConop.event.id}`}>Open event</Link>
                    </Button>
                  ) : null}
                  {selectedConop.campaign ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/operations/deployments/${selectedConop.campaign.id}`}>Open deployment</Link>
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ) : (
            <EmptyState description="Select a CONOP to inspect the operational brief in the side rail." title="No CONOP selected" />
          )}
        </div>
      </div>
    </div>
  );
}

export async function AarsLibraryPage({
  basePath = "/operations/aars",
  searchParams,
}: {
  basePath?: string;
  searchParams?: Promise<SearchParamsRecord>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const panel = getSearchParamValue(resolvedSearchParams, "panel");
  const aarId = getSearchParamValue(resolvedSearchParams, "aarId");
  const status = getSearchParamValue(resolvedSearchParams, "status");
  const message = getSearchParamValue(resolvedSearchParams, "message");
  const error = getSearchParamValue(resolvedSearchParams, "error");
  const filters: AarFilters = {
    q: getSearchParamValue(resolvedSearchParams, "q"),
    eventId: getSearchParamValue(resolvedSearchParams, "eventId"),
    campaignId: getSearchParamValue(resolvedSearchParams, "campaignId"),
    status: status === "" || (status && isAarStatus(status)) ? status : undefined,
  };
  const [aarData, referenceData, selectedAar] = await Promise.all([
    listAars(filters),
    getS3ReferenceData("s3.aars.view"),
    aarId ? getAarDetail(aarId) : Promise.resolve(null),
  ]);
  const cleanHref = buildHref(basePath, resolvedSearchParams, {
    panel: undefined,
    message: undefined,
    error: undefined,
  });
  const selectedMapScreenshot =
    selectedAar?.attachments.find((attachment) => attachment.attachmentType === "map_screenshot") ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={["Operations", "AARs"]}
        description="After-action review queue for capturing debriefs, lessons learned, and follow-up tied to real operations."
        title="AARs"
      />
      <Card className="border-border/80 bg-card/72">
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">AAR workspace</p>
            <p className="text-sm text-muted-foreground">
              Track submitted debriefs, review status, and operation/deployment linkage from one operational queue.
            </p>
          </div>
          <Button asChild>
            <Link href={buildHref(basePath, resolvedSearchParams, { panel: "create" })}>
              Submit AAR
            </Link>
          </Button>
        </CardContent>
      </Card>
      {message ? <FlashNotice message={message} tone="success" /> : null}
      {error ? <FlashNotice message={error} tone="danger" /> : null}
      <section className="grid gap-4 md:grid-cols-3">
        <KpiCard hint="Total AAR records in scope" label="Tracked AARs" tone="info" value={String(aarData.summary.total)} />
        <DashboardWidget description="Submitted AARs awaiting S3 review" title="Awaiting Review" tone="warning" value={String(aarData.summary.submitted)} />
        <DashboardWidget description="AAR text exists, but the map screenshot is still required" title="Missing Screenshot" tone="danger" value={String(aarData.summary.pendingMap)} />
        <ReadinessCard hint="Reviewed and finalized debriefs" label="Reviewed" statusLabel="Closed loop" value={String(aarData.summary.reviewed)} />
      </section>
      {panel === "create" ? (
        <AarForm
          defaultEventId={filters.eventId ?? null}
          referenceData={referenceData}
          returnTo={cleanHref}
        />
      ) : null}
      {panel === "edit" && selectedAar ? (
        <AarForm aar={selectedAar} referenceData={referenceData} returnTo={cleanHref} />
      ) : null}
      {panel === "review" && selectedAar ? (
        <AarReviewForm aar={selectedAar} referenceData={referenceData} returnTo={cleanHref} />
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <DocumentFiltersCard
            action={basePath}
            description="Filter the AAR queue by linked operation, deployment, or review status."
            filters={filters}
            referenceData={referenceData}
            statusOptions={referenceData.aarStatuses}
            title="AAR filters"
          />
          {aarData.aars.length === 0 ? (
            <EmptyState description="No AARs matched the current filters." title="No AARs found" />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {aarData.aars.map((aar) => (
                <Card key={aar.id} className="border-border/70 bg-background/45">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle>{aar.title}</CardTitle>
                        <CardDescription>
                          {aar.event?.title ?? aar.campaign?.title ?? "Unlinked AAR"}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <StatusBadge label={aar.statusLabel} tone={getAarTone(aar.status)} />
                        <StatusBadge
                          label={aar.hasMapScreenshot ? "Map attached" : "Map required"}
                          tone={aar.hasMapScreenshot ? "success" : "danger"}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {aar.reviewedByName ? `Reviewed by ${aar.reviewedByName}` : "Not reviewed yet"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Updated {formatDateTime(aar.updatedAt)}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Button asChild size="sm">
                        <Link href={buildHref(basePath, resolvedSearchParams, { aarId: aar.id })}>
                          Inspect
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link href={buildHref(basePath, resolvedSearchParams, { panel: "edit", aarId: aar.id })}>
                          Edit
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link href={buildHref(basePath, resolvedSearchParams, { panel: "review", aarId: aar.id })}>
                          Review
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-4">
          {selectedAar ? (
            <Card className="border-border/80 bg-card/82">
              <CardHeader>
                <CardTitle>{selectedAar.title}</CardTitle>
                <CardDescription>
                  Debrief detail stays linked to the operation and deployment record for later review and reporting.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge label={selectedAar.statusLabel} tone={getAarTone(selectedAar.status)} />
                  {selectedAar.event?.hostUnitShortName ? <UnitBadge label={selectedAar.event.hostUnitShortName} /> : null}
                </div>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="rounded-xl border border-border/70 bg-background/45 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-foreground">Map screenshot</p>
                      <StatusBadge
                        label={selectedMapScreenshot ? "Attached" : "Required"}
                        tone={selectedMapScreenshot ? "success" : "danger"}
                      />
                    </div>
                    {selectedMapScreenshot ? (
                      <div className="mt-3 space-y-3">
                        {/* eslint-disable-next-line @next/next/no-img-element -- AAR screenshots are permission-checked private files. */}
                        <img
                          alt={`${selectedAar.title} map screenshot`}
                          className="max-h-[28rem] w-full rounded-lg border border-border/70 object-contain"
                          src={selectedMapScreenshot.downloadUrl}
                        />
                        <p>
                          {selectedMapScreenshot.fileName} uploaded {formatDateTime(selectedMapScreenshot.createdAt)}
                        </p>
                        <Button asChild size="sm" variant="outline">
                          <Link href={selectedMapScreenshot.downloadUrl}>Download original</Link>
                        </Button>
                      </div>
                    ) : (
                      <p className="mt-2">
                        This Patrol AAR cannot be marked reviewed until a PNG, JPG, JPEG, or WEBP map screenshot is uploaded.
                      </p>
                    )}
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/45 p-4">
                    <p className="font-semibold text-foreground">Official patrol report</p>
                    <p className="mt-2"><span className="font-semibold text-foreground">DTG:</span> {selectedAar.dtg ?? "Not documented yet."}</p>
                    <p className="mt-2"><span className="font-semibold text-foreground">Tasking:</span> {selectedAar.tasking ?? "Not documented yet."}</p>
                    <p className="mt-2"><span className="font-semibold text-foreground">Callsigns:</span> {selectedAar.callsigns ?? "Not documented yet."}</p>
                    <p className="mt-2">
                      <span className="font-semibold text-foreground">Casualties:</span>{" "}
                      FKIA {selectedAar.fkia ?? "0"} / FWIA {selectedAar.fwia ?? "0"} / FMIA {selectedAar.fmia ?? "0"} / EKIA {selectedAar.ekia ?? "0"}
                    </p>
                    <p className="mt-2"><span className="font-semibold text-foreground">Report:</span> {selectedAar.report ?? selectedAar.summary ?? "Not documented yet."}</p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/45 p-4">
                    <p className="font-semibold text-foreground">Deployment progression</p>
                    <p className="mt-2">
                      <span className="font-semibold text-foreground">Progression decision:</span>{" "}
                      {selectedAar.aarProgressionDecision ?? "No progression decision recorded."}
                    </p>
                    <p className="mt-2">
                      <span className="font-semibold text-foreground">Recommended next version:</span>{" "}
                      {selectedAar.aarNextVersionRecommendation ?? "No recommendation recorded."}
                    </p>
                    <p className="mt-2">
                      <span className="font-semibold text-foreground">Progression recommendation:</span>{" "}
                      {selectedAar.aarProgressionRecommendation ?? "No progression decision recorded."}
                    </p>
                    <p className="mt-2">
                      <span className="font-semibold text-foreground">Progression notes:</span>{" "}
                      {selectedAar.aarProgressionNotes ?? "No progression notes recorded."}
                    </p>
                    <p className="mt-2">
                      <span className="font-semibold text-foreground">Enemy activity:</span>{" "}
                      {selectedAar.aarEnemyActivityNotes ?? "No enemy activity notes recorded."}
                    </p>
                    <p className="mt-2">
                      <span className="font-semibold text-foreground">Friendly activity:</span>{" "}
                      {selectedAar.aarFriendlyActivityNotes ?? "No friendly activity notes recorded."}
                    </p>
                    <p className="mt-2">
                      <span className="font-semibold text-foreground">Unit performance:</span>{" "}
                      {selectedAar.aarUnitPerformanceNotes ?? "No unit performance notes recorded."}
                    </p>
                    <p className="mt-2">
                      <span className="font-semibold text-foreground">Tasking adjustments:</span>{" "}
                      {selectedAar.aarTaskingAdjustments ?? "No tasking adjustments recorded."}
                    </p>
                    <p className="mt-2">
                      <span className="font-semibold text-foreground">Next-week planning:</span>{" "}
                      {selectedAar.aarPlanningNotesNextWeek ?? "No planning notes recorded."}
                    </p>
                    <p className="mt-2">
                      <span className="font-semibold text-foreground">Lessons learned:</span>{" "}
                      {selectedAar.aarLessonsLearned ?? "No lessons learned recorded."}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/45 p-4">
                    <p className="font-semibold text-foreground">Attachments</p>
                    {selectedAar.attachments.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {selectedAar.attachments.map((attachment) => (
                          <div key={attachment.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/55 p-3">
                            <div>
                              <p className="font-medium text-foreground">{attachment.label}</p>
                              <p className="text-xs text-muted-foreground">
                                {attachment.fileName} / {attachment.attachmentType} / {formatDateTime(attachment.createdAt)}
                              </p>
                            </div>
                            <Button asChild size="sm" variant="outline">
                              <Link href={attachment.downloadUrl}>Download</Link>
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2">No attachments have been uploaded yet.</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  {selectedAar.event ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/operations/events/${selectedAar.event.id}`}>Open event</Link>
                    </Button>
                  ) : null}
                  {selectedAar.campaign ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/operations/deployments/${selectedAar.campaign.id}`}>Open deployment</Link>
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ) : (
            <EmptyState description="Select an AAR to inspect the debrief in the side rail." title="No AAR selected" />
          )}
        </div>
      </div>
    </div>
  );
}
