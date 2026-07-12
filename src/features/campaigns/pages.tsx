import Link from "next/link";
import { notFound } from "next/navigation";

import { DashboardWidget } from "@/components/dashboard/dashboard-widget";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ReadinessCard } from "@/components/dashboard/readiness-card";
import { PageHeader } from "@/components/layout/page-header";
import { AdvancedFilters, CollapsibleSection } from "@/components/layout/progressive-disclosure";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge, type BadgeTone } from "@/components/status/status-badge";
import { UnitBadge } from "@/components/status/unit-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCountLabel, formatDate, formatDateTime } from "@/lib/formatters";
import {
  CampaignArchiveForm,
  CampaignPhaseForm,
  CampaignPublishForm,
  CampaignStatusForm,
  CreateCampaignForm,
  EditCampaignForm,
  LinkEventForm,
} from "@/features/campaigns/components/campaign-forms";
import { DeploymentCreateDrawer } from "@/features/campaigns/components/deployment-create-drawer";
import { DeploymentInspectorDrawer } from "@/features/campaigns/components/deployment-inspector-drawer";
import { DeploymentResourcesCard } from "@/features/campaigns/components/deployment-resources-card";
import { CompletionChecklist, NextActionCard } from "@/features/operations/components/workflow";
import type { OperationsJourneyStep, OperationsNextAction } from "@/server/operations-package/journey";
import { getCurrentUser } from "@/server/auth/current-user";
import {
  type CampaignFilters,
  getCampaignDetail,
  getCampaignReferenceData,
  listCampaigns,
} from "@/server/campaigns";
import { campaignStatusCatalog } from "@/server/database/catalogs";
import { listDeploymentResources } from "@/server/deployment-resources";
import { can } from "@/server/permissions/access";
import { getOperationalDocumentsForCampaign } from "@/server/s3";

type SearchParamsValue = string | string[] | undefined;
type SearchParamsRecord = Record<string, SearchParamsValue>;

function getSearchParamValue(
  searchParams: SearchParamsRecord,
  key: string,
) {
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

function getCampaignTone(status: string): BadgeTone {
  switch (status) {
    case "active":
      return "success";
    case "preparing":
      return "warning";
    case "planning":
      return "info";
    case "paused":
      return "warning";
    case "completed":
      return "muted";
    case "archived":
      return "danger";
    default:
      return "muted";
  }
}

function isCampaignStatus(value: string): value is NonNullable<CampaignFilters["status"]> {
  return campaignStatusCatalog.includes(value as (typeof campaignStatusCatalog)[number]);
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

function CampaignFiltersCard({
  filters,
  referenceData,
}: {
  filters: CampaignFilters;
  referenceData: Awaited<ReturnType<typeof getCampaignReferenceData>>;
}) {
  const fieldClassName =
    "flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

  return (
    <Card className="border-border/80 bg-card/82">
      <CardHeader>
        <CardTitle>Deployment filters</CardTitle>
        <CardDescription>
          Group deployments by status or name. Unit participation is automatic; unit tasking is managed per operation week.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action="/operations/deployments" className="space-y-4" method="get">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_14rem_14rem_auto]">
            <input className={fieldClassName} defaultValue={filters.q ?? ""} name="q" placeholder="Search deployment, phase, or key" />
            <select className={fieldClassName} defaultValue={filters.status ?? ""} name="status">
              <option value="">All statuses</option>
              {referenceData.statuses.map((status) => (
                <option key={status.key} value={status.key}>
                  {status.label}
                </option>
              ))}
            </select>
            <select className={fieldClassName} defaultValue={filters.unitId ?? ""} name="unitId">
              <option value="">All units</option>
              {referenceData.units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.label}
                </option>
              ))}
            </select>
            <div className="flex gap-3">
              <Button asChild type="button" variant="ghost">
                <Link href="/operations/deployments">Clear</Link>
              </Button>
              <Button type="submit" variant="outline">
                Apply
              </Button>
            </div>
          </div>
          <AdvancedFilters
            description="Creator, Zeus, date range, operation type, and current-week filters are reserved for the next service-layer expansion."
          >
            <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <input className={fieldClassName} disabled placeholder="Creator filter planned" />
              <input className={fieldClassName} disabled placeholder="Zeus filter planned" />
              <input className={fieldClassName} disabled type="date" />
              <input className={fieldClassName} disabled type="date" />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Creator, Zeus, date range, operation type, and current-week filters are reserved for the next service-layer expansion.
            </p>
          </AdvancedFilters>
        </form>
      </CardContent>
    </Card>
  );
}

function CampaignTimeline({
  events,
}: {
  events: Awaited<ReturnType<typeof getCampaignDetail>> extends infer T
    ? T extends { timeline: infer U }
      ? U
      : never
    : never;
}) {
  return (
    <div className="space-y-4">
      {events.map((event) => (
        <div key={event.id} className="rounded-xl border border-border/70 bg-background/45 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-foreground">{event.title}</p>
                <StatusBadge label={event.statusLabel} tone={event.status === "completed" ? "success" : event.status === "cancelled" ? "danger" : "info"} />
                <StatusBadge
                  label={event.missionStatusLabel}
                  tone={
                    event.missionStatus === "published"
                      ? "success"
                      : event.missionStatus === "s3-review"
                        ? "warning"
                        : event.missionStatus === "approved"
                          ? "info"
                          : "muted"
                  }
                />
                {event.hostUnit ? <UnitBadge label={event.hostUnit.shortName} /> : null}
                {event.deploymentWeek ? <StatusBadge label={`Week ${event.deploymentWeek}`} tone="info" /> : null}
                {event.operationVersionLabel ? (
                  <StatusBadge label={event.operationVersionLabel} tone="info" />
                ) : null}
                <StatusBadge
                  label={event.taskingStatus ? `Tasking ${event.taskingStatus}` : "Tasking pending"}
                  tone={event.taskingStatus === "published" ? "success" : "warning"}
                />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {formatDateTime(event.startsAt)}
                {event.endsAt ? ` to ${formatDateTime(event.endsAt)}` : ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusBadge
                  label={
                    event.publishedConopCount > 0
                      ? `CONOP ${event.latestConopStatusLabel ?? "ready"}`
                      : "No published CONOP"
                  }
                  tone={event.publishedConopCount > 0 ? "success" : "warning"}
                />
                <StatusBadge
                  label={event.aarCount > 0 ? `AAR ${event.latestAarStatusLabel ?? "started"}` : "No AAR"}
                  tone={event.reviewedAarCount > 0 ? "success" : event.aarCount > 0 ? "warning" : "muted"}
                />
                {event.latestAarNextVersionRecommendation ? (
                  <StatusBadge label={`Next: ${event.latestAarNextVersionRecommendation}`} tone="info" />
                ) : null}
                {event.missingRsvpCount > 0 ? (
                  <StatusBadge label={`${event.missingRsvpCount} missing RSVP`} tone="warning" />
                ) : null}
                <StatusBadge label={`${event.unitTaskingCount} unit taskings`} tone={event.unitTaskingCount > 0 ? "success" : "muted"} />
              </div>
              {event.selectedOperationVersion ||
              event.latestAarProgressionDecision ||
              event.latestAarProgressionRecommendation ||
              event.latestAarProgressionNotes ||
              event.latestAarPlanningNotesNextWeek ? (
                <div className="mt-3 rounded-xl border border-border/70 bg-card/55 p-3 text-sm text-muted-foreground">
                  {event.selectedOperationVersion ? (
                    <p>
                      <span className="font-semibold text-foreground">Selected version:</span>{" "}
                      {event.selectedOperationVersion}
                    </p>
                  ) : null}
                  {event.latestAarProgressionDecision ? (
                    <p className="mt-1">
                      <span className="font-semibold text-foreground">Progression decision:</span>{" "}
                      {event.latestAarProgressionDecision}
                    </p>
                  ) : null}
                  {event.latestAarProgressionRecommendation ? (
                    <p className="mt-1">
                      <span className="font-semibold text-foreground">AAR progression:</span>{" "}
                      {event.latestAarProgressionRecommendation}
                    </p>
                  ) : null}
                  {event.latestAarProgressionNotes ? (
                    <p className="mt-1">
                      <span className="font-semibold text-foreground">Progression notes:</span>{" "}
                      {event.latestAarProgressionNotes}
                    </p>
                  ) : null}
                  {event.latestAarPlanningNotesNextWeek ? (
                    <p className="mt-1">
                      <span className="font-semibold text-foreground">Next-week planning:</span>{" "}
                      {event.latestAarPlanningNotesNextWeek}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge
                label={event.attendanceLocked ? "Attendance Locked" : "Attendance Open"}
                tone={event.attendanceLocked ? "success" : "warning"}
              />
              <StatusBadge
                label={event.attendanceRate !== null ? `${event.attendanceRate}%` : "N/A"}
                tone={event.attendanceRate !== null && event.attendanceRate >= 80 ? "success" : "muted"}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function OperationalWeeksPanel({
  campaignId,
  weeks,
}: {
  campaignId: string;
  weeks: NonNullable<Awaited<ReturnType<typeof getCampaignDetail>>>["operationalWeeks"];
}) {
  if (weeks.length === 0) {
    return (
      <EmptyState
        description="Set an estimated duration or link operation events to populate the deployment weeks."
        title="No operational weeks yet"
      />
    );
  }

  return (
    <div className="space-y-3">
      {weeks.map((week) => (
        <details
          key={week.weekNumber}
          className="group rounded-xl border border-border/70 bg-background/45 p-4 open:border-primary/40"
          open={week.weekNumber === 1}
        >
          <summary className="flex cursor-pointer list-none flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-foreground">Week {week.weekNumber}</p>
                <StatusBadge label={week.statusLabel} tone={week.statusTone} />
                <StatusBadge label={`Planning ${week.planningStatus}`} tone={week.planningStatus === "review" ? "info" : "warning"} />
                <StatusBadge
                  label={week.taskingStatus ? `Tasking ${week.taskingStatus}` : "Tasking pending"}
                  tone={week.taskingStatus === "published" ? "success" : "warning"}
                />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {week.weekendOperation?.title ?? "Weekend Operation not linked"} / {week.patrols.length} patrols /{" "}
                {week.unitTaskingCount} unit taskings
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link href={`/operations/packages/${campaignId}/week/${week.weekNumber}`}>Open package</Link>
              </Button>
              <StatusBadge label={`Discord ${week.discordStatusLabel}`} tone={week.discordStatusLabel === "Published" ? "success" : "muted"} />
              <StatusBadge
                label={week.attendanceRate !== null ? `${week.attendanceRate}% attendance` : "Attendance pending"}
                tone={week.attendanceRate !== null && week.attendanceRate >= 80 ? "success" : "muted"}
              />
            </div>
          </summary>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <div className="rounded-xl border border-border/70 bg-card/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Weekend Operation
              </p>
              {week.weekendOperation ? (
                <div className="mt-2 space-y-2">
                  <p className="font-semibold text-foreground">{week.weekendOperation.title}</p>
                  <p className="text-sm text-muted-foreground">{formatDateTime(week.weekendOperation.startsAt)}</p>
                  {week.weekendOperation.selectedOperationVersion ||
                  week.weekendOperation.latestAarProgressionDecision ||
                  week.weekendOperation.latestAarPlanningNotesNextWeek ||
                  week.weekendOperation.latestAarNextVersionRecommendation ? (
                    <div className="rounded-lg border border-border/60 bg-background/50 p-2 text-sm text-muted-foreground">
                      {week.weekendOperation.selectedOperationVersion ? (
                        <p>
                          <span className="font-semibold text-foreground">Selected:</span>{" "}
                          {week.weekendOperation.selectedOperationVersion}
                        </p>
                      ) : null}
                      {week.weekendOperation.latestAarProgressionDecision ? (
                        <p className="mt-1">
                          <span className="font-semibold text-foreground">Decision:</span>{" "}
                          {week.weekendOperation.latestAarProgressionDecision}
                        </p>
                      ) : null}
                      {week.weekendOperation.latestAarNextVersionRecommendation ? (
                        <p className="mt-1">
                          <span className="font-semibold text-foreground">AAR recommends:</span>{" "}
                          {week.weekendOperation.latestAarNextVersionRecommendation}
                        </p>
                      ) : null}
                      {week.weekendOperation.latestAarPlanningNotesNextWeek ? (
                        <p className="mt-1">
                          <span className="font-semibold text-foreground">Next week:</span>{" "}
                          {week.weekendOperation.latestAarPlanningNotesNextWeek}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/operations/events/${week.weekendOperation.id}`}>Open operation</Link>
                  </Button>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Create or link the weekend operation for this week.</p>
              )}
            </div>
            <div className="rounded-xl border border-border/70 bg-card/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Patrols
              </p>
              {week.patrols.length > 0 ? (
                <div className="mt-2 space-y-2">
                  {week.patrols.map((patrol) => (
                    <div key={patrol.id} className="rounded-lg border border-border/60 bg-background/50 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">{patrol.title}</p>
                        <StatusBadge
                          label={patrol.aarCount > 0 ? "AAR submitted" : "AAR needed"}
                          tone={patrol.aarCount > 0 ? "success" : "warning"}
                        />
                      </div>
                      {patrol.latestAarProgressionDecision || patrol.latestAarPlanningNotesNextWeek ? (
                        <div className="mt-2 rounded-lg border border-border/60 bg-card/50 p-2 text-xs text-muted-foreground">
                          {patrol.latestAarProgressionDecision ? (
                            <p>
                              <span className="font-semibold text-foreground">Decision:</span>{" "}
                              {patrol.latestAarProgressionDecision}
                            </p>
                          ) : null}
                          {patrol.latestAarPlanningNotesNextWeek ? (
                            <p className="mt-1">
                              <span className="font-semibold text-foreground">Next week:</span>{" "}
                              {patrol.latestAarPlanningNotesNextWeek}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ))}
                  <Button asChild size="sm" variant="outline">
                    <Link href="/operations/aar-queue?panel=create">Submit Patrol AAR</Link>
                  </Button>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">No patrols are linked to this week yet.</p>
              )}
            </div>
            <div className="rounded-xl border border-border/70 bg-card/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Weekly Tasking
              </p>
              <div className="mt-2 space-y-2">
                <StatusBadge
                  label={week.taskingStatus ?? "Pending"}
                  tone={week.taskingStatus === "published" ? "success" : "warning"}
                />
                <p className="text-sm text-muted-foreground">
                  Unit Tasking replaces participating-unit selection. Every active community unit is included.
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/operations/packages/${campaignId}/week/${week.weekNumber}`}>Open package tasking</Link>
                </Button>
              </div>
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}

function DeploymentManagementEmptyState({ canCreate }: { canCreate: boolean }) {
  const items = [
    "Weekly Operations",
    "Patrols",
    "Unit Tasking",
    "Attendance",
    "Deployment Resources",
    "OPORD",
    "Player Primer",
    "Current Mod Preset",
    "Zeus Assignment",
  ];

  return (
    <Card className="border-primary/20 bg-primary/8">
      <CardHeader>
        <CardTitle>No deployments found</CardTitle>
        <CardDescription>
          Deployments are the operational container for the whole multi-week arc, not just a record name.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item} className="rounded-xl border border-border/70 bg-background/45 px-3 py-2 text-sm text-muted-foreground">
              <span className="font-semibold text-success">✓</span> {item}
            </div>
          ))}
        </div>
        {canCreate ? (
          <Button asChild>
            <Link href="/operations/deployments?panel=create">Create Deployment</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function DeploymentInspector({
  campaign,
  closeHref,
}: {
  campaign: Awaited<ReturnType<typeof getCampaignDetail>>;
  closeHref: string;
}) {
  if (!campaign) {
    return null;
  }

  return (
    <DeploymentInspectorDrawer
      closeHref={closeHref}
      open
      statusBadge={{ label: campaign.statusLabel, tone: getCampaignTone(campaign.status) }}
      subtitle={campaign.phase ?? "Deployment phase not set"}
      tabPanels={[
        {
          label: "Overview",
          content: (
            <div className="space-y-4">
              <p className="text-sm leading-6 text-muted-foreground">
                {campaign.summary ?? "No deployment overview has been written yet."}
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <StatusBadge label={`${campaign.totalEvents} operations`} tone="info" />
                <StatusBadge label={`${campaign.upcomingEvents} upcoming`} tone="warning" />
                <StatusBadge label={campaign.zeusName ?? "Zeus TBD"} tone="muted" />
              </div>
              <Button asChild>
                <Link href={`/operations/deployments/${campaign.id}`}>Open full deployment</Link>
              </Button>
            </div>
          ),
        },
        {
          label: "Resources",
          content: (
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>Deployment resources live on the detail page so OPORDs, primers, presets, maps, and radio plans stay versioned and auditable.</p>
              <Button asChild variant="outline">
                <Link href={`/operations/deployments/${campaign.id}#deployment-resources`}>Manage Resources</Link>
              </Button>
            </div>
          ),
        },
        {
          label: "Weekly Operations",
          content: <OperationalWeeksPanel campaignId={campaign.id} weeks={campaign.operationalWeeks} />,
        },
        {
          label: "Attendance",
          content: (
            <div className="space-y-3">
              <StatusBadge
                label={campaign.attendanceRate !== null ? `${campaign.attendanceRate}% attendance` : "Attendance pending"}
                tone={campaign.attendanceRate !== null && campaign.attendanceRate >= 80 ? "success" : "warning"}
              />
              <p className="text-sm text-muted-foreground">
                Attendance follows linked weekend operations and patrols, not a separate deployment-only record.
              </p>
            </div>
          ),
        },
        {
          label: "History",
          content: (
            <p className="text-sm text-muted-foreground">
              Deployment history is preserved through linked operation, resource version, and audit records.
            </p>
          ),
        },
      ]}
      title={campaign.title}
    />
  );
}

export async function CampaignsListPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const statusFilter = getSearchParamValue(resolvedSearchParams, "status");
  const filters: CampaignFilters = {
    q: getSearchParamValue(resolvedSearchParams, "q"),
    status:
      statusFilter === "" || (statusFilter && isCampaignStatus(statusFilter))
        ? statusFilter
        : undefined,
    unitId: getSearchParamValue(resolvedSearchParams, "unitId"),
  };
  const panel = getSearchParamValue(resolvedSearchParams, "panel");
  const inspectId = getSearchParamValue(resolvedSearchParams, "inspect");
  const message = getSearchParamValue(resolvedSearchParams, "message");
  const error = getSearchParamValue(resolvedSearchParams, "error");
  const [campaignData, referenceData, inspectedCampaign, user] = await Promise.all([
    listCampaigns(filters),
    getCampaignReferenceData(),
    inspectId ? getCampaignDetail(inspectId) : Promise.resolve(null),
    getCurrentUser(),
  ]);
  const canCreate = user
    ? can(user, "deployments.create") || can(user, "campaigns.create")
    : false;
  const cleanHref = buildHref("/operations/deployments", resolvedSearchParams, {
    panel: undefined,
    message: undefined,
    error: undefined,
  });
  const closeInspectHref = buildHref("/operations/deployments", resolvedSearchParams, {
    inspect: undefined,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={["Operations", "Deployments"]}
        description="Manage deployment records, Zeus ownership, phase, resources, and timeline links. Operational awareness lives in the Operations Center."
        title="Deployments"
      />
      <Card className="border-border/80 bg-card/72">
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Deployment management</p>
            <p className="text-sm text-muted-foreground">
              Create the shell, attach weekly operations and patrols, then manage resources from the deployment detail.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {canCreate ? (
              <Button asChild>
                <Link href={buildHref("/operations/deployments", resolvedSearchParams, { panel: "create" })}>
                  Create deployment
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href="/operations">Open Operations Center</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
      {message ? <FlashNotice message={message} tone="success" /> : null}
      {error ? <FlashNotice message={error} tone="danger" /> : null}
      {panel === "create" && canCreate ? (
        <DeploymentCreateDrawer closeHref={cleanHref}>
          <CreateCampaignForm returnTo={cleanHref} />
        </DeploymentCreateDrawer>
      ) : null}
      {panel === "create" && !canCreate ? (
        <FlashNotice
          message="You can view deployments, but your current session does not include deployments.create or campaigns.create."
          tone="danger"
        />
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <CampaignFiltersCard filters={filters} referenceData={referenceData} />
          {campaignData.campaigns.length === 0 ? (
            <DeploymentManagementEmptyState canCreate={canCreate} />
          ) : (
            <Card className="border-border/80 bg-card/88">
              <CardHeader>
                <CardTitle>Deployment records</CardTitle>
                <CardDescription>
                  {formatCountLabel(campaignData.campaigns.length, "deployment")} visible. Select a row to inspect without leaving the list.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {campaignData.groupedCampaigns.map((group) => (
                  <details key={group.status} className="group rounded-xl border border-border/70 bg-background/35 p-3" open={group.status === "active" || group.status === "planning"}>
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <StatusBadge label={group.statusLabel} tone={getCampaignTone(group.status)} />
                        <span className="text-sm text-muted-foreground">
                          {formatCountLabel(group.items.length, "deployment")}
                        </span>
                      </div>
                      <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground group-open:hidden">
                        Expand
                      </span>
                    </summary>
                    <div className="mt-3 divide-y divide-border/70">
                      {group.items.map((campaign) => (
                        <div key={campaign.id} className="grid gap-3 py-4 lg:grid-cols-[minmax(0,1.4fr)_11rem_11rem_auto] lg:items-center">
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground">{campaign.title}</p>
                            <p className="mt-1 truncate text-sm text-muted-foreground">
                              {campaign.phase ?? "No phase set"} / {campaign.nextEvent ? `Next ${formatDate(campaign.nextEvent.startsAt)}` : "No linked operations"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Zeus</p>
                            <p className="mt-1 truncate text-sm text-foreground">{campaign.zeusName ?? "TBD"}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Timeline</p>
                            <p className="mt-1 text-sm text-foreground">
                              {campaign.completedEvents}/{campaign.totalEvents || campaign.deploymentDurationWeeks || "?"} complete
                            </p>
                          </div>
                          <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
                            <Button asChild size="sm" variant="outline">
                              <Link href={buildHref("/operations/deployments", resolvedSearchParams, { inspect: campaign.id })}>
                                Inspect
                              </Link>
                            </Button>
                            <Button asChild size="sm">
                              <Link href={`/operations/deployments/${campaign.id}`}>View</Link>
                            </Button>
                            {campaign.nextEvent ? (
                              <Button asChild size="sm" variant="ghost">
                                <Link href={`/operations/events/${campaign.nextEvent.id}`}>Next op</Link>
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
        <div className="space-y-4">
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Progress model</CardTitle>
              <CardDescription>
                Progress comes from linked weekend operations and patrols instead of manually entered percentages.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Link weekend operations and patrols to move the deployment timeline forward.</p>
              <p>Use phase text to give members readable operational context.</p>
              <p>Attendance averages follow linked operation data, not a separate deployment record.</p>
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Resource model</CardTitle>
              <CardDescription>
                Resources are managed after creation so each upload or link update creates a version.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Attach OPORDs, player primers, mod presets, maps, radio plans, and additional files on the deployment detail page.</p>
              <p>Members see the current active version; staff can review history.</p>
            </CardContent>
          </Card>
        </div>
      </div>
      <DeploymentInspector campaign={inspectedCampaign} closeHref={closeInspectHref} />
    </div>
  );
}

export async function CampaignDetailFoundationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<SearchParamsRecord>;
}) {
  const [{ id }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({}),
  ]);
  const panel = getSearchParamValue(resolvedSearchParams, "panel");
  const message = getSearchParamValue(resolvedSearchParams, "message");
  const error = getSearchParamValue(resolvedSearchParams, "error");
  const [campaign, referenceData, user] = await Promise.all([
    getCampaignDetail(id),
    getCampaignReferenceData(),
    getCurrentUser(),
  ]);

  if (!campaign) {
    notFound();
  }

  const canEdit = user ? can(user, "campaigns.edit") : false;
  const canPublish = user ? can(user, "campaigns.publish") : false;
  const canArchive = user ? can(user, "campaigns.archive") : false;
  const canManageTimeline = user ? can(user, "campaigns.timeline.manage") : false;
  const canViewStats = user ? can(user, "campaigns.statistics.view") || can(user, "campaigns.view") : false;
  const canViewResources = user ? can(user, "deployments.resources.view") : false;
  const canManageResources = user
    ? can(user, "deployments.resources.upload") ||
      can(user, "deployments.resources.edit") ||
      can(user, "deployments.resources.delete") ||
      can(user, "deployments.edit")
    : false;
  const showResourceHistory = user ? canManageResources || can(user, "audit.view") : false;
  const [operationalDocuments, deploymentResources] = await Promise.all([
    getOperationalDocumentsForCampaign(campaign.id),
    canViewResources
      ? listDeploymentResources({
          campaignId: campaign.id,
          includeHistory: showResourceHistory,
        })
      : Promise.resolve([]),
  ]);
  const cleanHref = buildHref(`/operations/deployments/${campaign.id}`, resolvedSearchParams, {
    panel: undefined,
    message: undefined,
    error: undefined,
  });
  const firstWeek = campaign.operationalWeeks[0] ?? null;
  const firstWeekPackageHref = firstWeek
    ? `/operations/packages/${campaign.id}/week/${firstWeek.weekNumber}`
    : `/operations/deployments/${campaign.id}`;
  const hasOpord = deploymentResources.some((resource) => resource.resourceType === "OPORD");
  const hasPrimer = deploymentResources.some((resource) => resource.resourceType === "PLAYER_PRIMER");
  const hasModPreset = deploymentResources.some((resource) => resource.resourceType === "ARMA3_PRESET");
  const deploymentSetupSteps: OperationsJourneyStep[] = [
    {
      actionHref: cleanHref,
      actionLabel: "Open deployment",
      blockingIssues: [],
      description: "Deployment record exists and is the parent for operational weeks.",
      id: "deployment-created",
      label: "Deployment created",
      responsible: "Deployment Creator",
      status: "complete",
      warningMessages: [],
    },
    {
      actionHref: buildHref(`/operations/deployments/${campaign.id}`, resolvedSearchParams, { panel: "edit" }),
      actionLabel: "Edit duration",
      blockingIssues: [],
      description: "Estimated duration helps staff understand the deployment arc.",
      id: "duration-configured",
      label: "Duration configured",
      responsible: "Deployment Creator",
      status: campaign.deploymentDurationWeeks ? "complete" : "warning",
      warningMessages: campaign.deploymentDurationWeeks ? [] : ["Add estimated duration when the deployment arc is known."],
    },
    {
      actionHref: firstWeekPackageHref,
      actionLabel: "Open Week 1",
      blockingIssues: firstWeek ? [] : ["Generate or sync operational weeks for this deployment."],
      description: "Operational weeks provide the package workspaces.",
      id: "weeks-generated",
      label: "Operational weeks generated",
      responsible: "S3",
      status: firstWeek ? "complete" : "blocked",
      warningMessages: [],
    },
    {
      actionHref: buildHref(`/operations/deployments/${campaign.id}`, resolvedSearchParams, { panel: "edit" }),
      actionLabel: "Assign Zeus",
      blockingIssues: [],
      description: "Zeus is assigned or the creator is explicitly the Zeus.",
      id: "zeus-configured",
      label: "Zeus configured",
      responsible: "S3 / Deployment Creator",
      status: campaign.zeusName || campaign.zeusAssignmentType === "creator_is_zeus" ? "complete" : "warning",
      warningMessages: campaign.zeusName || campaign.zeusAssignmentType === "creator_is_zeus" ? [] : ["Assign Zeus or explicitly leave unassigned."],
    },
    {
      actionHref: canManageResources ? "#deployment-resources" : cleanHref,
      actionLabel: canManageResources ? "Add resources" : "Review resources",
      blockingIssues: [],
      description: "OPORD, player primer, and current mod preset are available when ready.",
      id: "resources-added",
      label: "Core resources added",
      responsible: "Deployment Creator / S3",
      status: hasOpord && hasPrimer && hasModPreset ? "complete" : "warning",
      warningMessages: [
        hasOpord ? null : "OPORD is optional but recommended.",
        hasPrimer ? null : "Player primer is optional but recommended.",
        hasModPreset ? null : "Current mod preset should be added before member prep.",
      ].filter((message): message is string => Boolean(message)),
    },
    {
      actionHref: firstWeekPackageHref,
      actionLabel: "Open package",
      blockingIssues: [],
      description: "Week 1 package is ready for planning, tasking, resources, readiness, and publish preview.",
      id: "week-one-opened",
      label: "Week 1 package opened",
      responsible: "S3",
      status: firstWeek ? "current" : "pending",
      warningMessages: [],
    },
    {
      actionHref: firstWeekPackageHref,
      actionLabel: "Schedule operation",
      blockingIssues: firstWeek?.weekendOperation ? [] : ["Schedule or link the first Weekend Operation."],
      description: "First Weekend Operation is linked to the initial operational week.",
      id: "weekend-operation-scheduled",
      label: "Weekend Operation scheduled",
      responsible: "S3",
      status: firstWeek?.weekendOperation ? "complete" : "blocked",
      warningMessages: [],
    },
  ];
  const deploymentNextStep = deploymentSetupSteps.find((step) => step.status !== "complete");
  const deploymentNextAction: OperationsNextAction | null = deploymentNextStep?.actionHref
    ? {
        href: deploymentNextStep.actionHref,
        label: deploymentNextStep.actionLabel ?? deploymentNextStep.label,
        reason:
          deploymentNextStep.blockingIssues[0] ??
          deploymentNextStep.warningMessages[0] ??
          deploymentNextStep.description,
        responsible: deploymentNextStep.responsible,
        status: deploymentNextStep.status === "complete" ? "pending" : deploymentNextStep.status,
      }
    : null;
  const deploymentSetupCompleteCount = deploymentSetupSteps.filter((step) => step.status === "complete").length;
  const deploymentSetupPercent = Math.round((deploymentSetupCompleteCount / deploymentSetupSteps.length) * 100);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={["Operations", "Deployments", "Detail"]}
        contextLabel={campaign.key}
        description="Readable deployment page with weekly operation timeline, Zeus assignment, unit tasking, and attendance-driven statistics."
        title={campaign.title}
      />
      <Card className="border-border/80 bg-card/72">
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label={campaign.statusLabel} tone={getCampaignTone(campaign.status)} />
              {campaign.phase ? <StatusBadge label={campaign.phase} tone="info" /> : null}
            </div>
            <p className="text-sm text-muted-foreground">
              {campaign.nextEvent ? `Next event ${formatDateTime(campaign.nextEvent.startsAt)}` : "No upcoming operation linked yet"}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {canEdit ? (
              <Button asChild>
                <Link href={buildHref(`/operations/deployments/${campaign.id}`, resolvedSearchParams, { panel: "edit" })}>
                  Edit deployment
                </Link>
              </Button>
            ) : null}
            {canPublish && !campaign.publishedAt ? (
              <Button asChild variant="outline">
                <Link href={buildHref(`/operations/deployments/${campaign.id}`, resolvedSearchParams, { panel: "publish" })}>
                  Publish
                </Link>
              </Button>
            ) : null}
            {canManageTimeline ? (
              <Button asChild variant="outline">
                <Link href={buildHref(`/operations/deployments/${campaign.id}`, resolvedSearchParams, { panel: "timeline" })}>
                  Manage timeline
                </Link>
              </Button>
            ) : null}
            {canArchive && campaign.status !== "archived" ? (
              <Button asChild variant="outline">
                <Link href={buildHref(`/operations/deployments/${campaign.id}`, resolvedSearchParams, { panel: "archive" })}>
                  Archive
                </Link>
              </Button>
            ) : null}
            {canManageResources ? (
              <Button asChild variant="outline">
                <Link href="#deployment-resources">Manage Resources</Link>
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
      {message ? <FlashNotice message={message} tone="success" /> : null}
      {error ? <FlashNotice message={error} tone="danger" /> : null}
      <NextActionCard action={deploymentNextAction} title="Deployment setup next action" />
      {deploymentSetupPercent >= 80 ? (
        <CollapsibleSection
          badgeLabel={`${deploymentSetupPercent}% complete`}
          badgeTone="success"
          description="The setup path is available for review without taking over the deployment page once most handoffs are complete."
          title="Deployment setup checklist"
        >
          <CompletionChecklist
            collapsedSummary="Review the remaining handoff state before opening the operational week package."
            steps={deploymentSetupSteps}
            title="Setup review"
          />
        </CollapsibleSection>
      ) : (
        <CompletionChecklist steps={deploymentSetupSteps} title="Deployment setup checklist" />
      )}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardWidget
          description="Linked event count"
          title="Weekly Operations"
          tone="info"
          value={String(campaign.totalEvents)}
        />
        <KpiCard
          hint="Completed operations on the timeline"
          label="Completed"
          tone="success"
          trend="Timeline-driven"
          value={String(campaign.completedEvents)}
        />
        <KpiCard
          hint="Upcoming operations still ahead"
          label="Upcoming"
          tone="warning"
          trend="Future operations"
          value={String(campaign.upcomingEvents)}
        />
        <ReadinessCard
          hint="Attendance average across linked events"
          label="Attendance"
          statusLabel="Participation"
          value={campaign.attendanceRate !== null ? `${campaign.attendanceRate}%` : "N/A"}
        />
      </section>
      {panel === "edit" && canEdit ? (
        <EditCampaignForm campaign={campaign} returnTo={cleanHref} />
      ) : null}
      {panel === "publish" && canPublish ? (
        <CampaignPublishForm campaignId={campaign.id} returnTo={cleanHref} />
      ) : null}
      {panel === "archive" && canArchive ? (
        <CampaignArchiveForm campaignId={campaign.id} returnTo={cleanHref} />
      ) : null}
      {panel === "status" && canEdit ? (
        <CampaignStatusForm campaign={campaign} referenceData={referenceData} returnTo={cleanHref} />
      ) : null}
      {panel === "phase" && canEdit ? (
        <CampaignPhaseForm campaign={campaign} returnTo={cleanHref} />
      ) : null}
      {panel === "timeline" && canManageTimeline ? (
        <LinkEventForm campaign={campaign} referenceData={referenceData} returnTo={cleanHref} />
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Card className="border-border/80 bg-card/88">
            <CardHeader>
              <CardTitle>Overview</CardTitle>
              <CardDescription>
                Deployment story, duration, Zeus assignment, and operational framing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-7 text-muted-foreground">
                {campaign.summary ?? "No deployment overview has been written yet."}
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-border/70 bg-background/45 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Duration</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {campaign.deploymentDurationWeeks ? `${campaign.deploymentDurationWeeks} weeks` : "Configurable"}
                  </p>
                </div>
                <div className="rounded-xl border border-border/70 bg-background/45 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Zeus</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {campaign.zeusName ?? "Not assigned yet"}
                  </p>
                </div>
                <div className="rounded-xl border border-border/70 bg-background/45 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Units</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    All active community units
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/88">
            <CardHeader>
              <CardTitle>Operational Timeline</CardTitle>
              <CardDescription>
                Deployment weeks expand into the weekend operation, patrols, tasking, attendance, Discord state, and follow-up work.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OperationalWeeksPanel campaignId={campaign.id} weeks={campaign.operationalWeeks} />
            </CardContent>
          </Card>
          {canViewResources ? (
            <div id="deployment-resources" className="scroll-mt-6">
              <DeploymentResourcesCard
                campaignId={campaign.id}
                canManage={canManageResources}
                resources={deploymentResources}
                returnTo={cleanHref}
                showHistory={showResourceHistory}
              />
            </div>
          ) : null}
          <Card className="border-border/80 bg-card/88">
            <CardHeader>
              <CardTitle>Flat event history</CardTitle>
              <CardDescription>
                Chronological event list retained for quick inspection and historical context.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {campaign.timeline.length > 0 ? (
                <CampaignTimeline events={campaign.timeline} />
              ) : (
                <EmptyState
                  description="No weekly operations or patrols have been linked to this deployment yet."
                  title="Timeline is empty"
                />
              )}
            </CardContent>
          </Card>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border/80 bg-card/88">
              <CardHeader>
                <CardTitle>Upcoming operation</CardTitle>
              </CardHeader>
              <CardContent>
                {campaign.nextEvent ? (
                  <div className="rounded-xl border border-border/70 bg-background/45 p-4">
                    <p className="font-semibold text-foreground">{campaign.nextEvent.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatDateTime(campaign.nextEvent.startsAt)} / {campaign.nextEvent.hostUnit?.name ?? "Unscoped"}
                    </p>
                    <div className="mt-3">
                      <Button asChild size="sm">
                        <Link href={`/operations/events/${campaign.nextEvent.id}`}>Open event</Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    description="No upcoming linked operations are scheduled."
                    title="No upcoming operation"
                  />
                )}
              </CardContent>
            </Card>
            <Card className="border-border/80 bg-card/88">
              <CardHeader>
                <CardTitle>Completed operations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {campaign.completedOperations.length > 0 ? (
                  campaign.completedOperations.map((event) => (
                    <div key={event.id} className="rounded-xl border border-border/70 bg-background/45 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-foreground">{event.title}</p>
                        <StatusBadge label={event.statusLabel} tone="success" />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatDateTime(event.startsAt)}
                      </p>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    description="No completed operations are attached to this deployment yet."
                    title="No completed operations"
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        <div className="space-y-4">
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Deployment controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {canEdit ? (
                <Button asChild className="w-full justify-start">
                  <Link href={buildHref(`/operations/deployments/${campaign.id}`, resolvedSearchParams, { panel: "status" })}>
                    Update status
                  </Link>
                </Button>
              ) : null}
              {canEdit ? (
                <Button asChild className="w-full justify-start" variant="outline">
                  <Link href={buildHref(`/operations/deployments/${campaign.id}`, resolvedSearchParams, { panel: "phase" })}>
                    Update phase
                  </Link>
                </Button>
              ) : null}
              {canManageTimeline ? (
                <Button asChild className="w-full justify-start" variant="outline">
                  <Link href={buildHref(`/operations/deployments/${campaign.id}`, resolvedSearchParams, { panel: "timeline" })}>
                    Link or unlink events
                  </Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Deployment statistics</CardTitle>
              <CardDescription>
                Linked-event progress and participation summary.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {canViewStats ? (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Progress</p>
                    <StatusBadge
                      label={campaign.progressPercent !== null ? `${campaign.progressPercent}%` : "N/A"}
                      tone={campaign.progressPercent !== null && campaign.progressPercent >= 70 ? "success" : "warning"}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Attendance</p>
                    <StatusBadge
                      label={campaign.attendanceRate !== null ? `${campaign.attendanceRate}%` : "N/A"}
                      tone={campaign.attendanceRate !== null && campaign.attendanceRate >= 80 ? "success" : "muted"}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Unit tasking</p>
                    <StatusBadge label="All active units" tone="info" />
                  </div>
                </>
              ) : (
                <EmptyState
                  description="Deployment statistics are hidden until the viewer has the appropriate reporting permission."
                  title="Statistics restricted"
                />
              )}
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Operational documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">CONOPs</p>
                {operationalDocuments.conops.length > 0 ? (
                  operationalDocuments.conops.map((conop) => (
                    <div key={conop.id} className="rounded-xl border border-border/70 bg-background/45 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-foreground">{conop.title}</p>
                        <StatusBadge
                          label={conop.statusLabel}
                          tone={conop.status === "published" ? "success" : "warning"}
                        />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {conop.event?.title ?? "Deployment-linked CONOP"}
                      </p>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    description="No CONOP records are linked to this deployment yet."
                    title="No CONOPs linked"
                  />
                )}
              </div>
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">AARs</p>
                {operationalDocuments.aars.length > 0 ? (
                  operationalDocuments.aars.map((aar) => (
                    <div key={aar.id} className="rounded-xl border border-border/70 bg-background/45 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-foreground">{aar.title}</p>
                        <StatusBadge
                          label={aar.statusLabel}
                          tone={aar.status === "reviewed" ? "success" : aar.status === "submitted" ? "warning" : "muted"}
                        />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {aar.event?.title ?? "Deployment-linked AAR"}
                      </p>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    description="No AAR records are linked to this deployment yet."
                    title="No AARs linked"
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
