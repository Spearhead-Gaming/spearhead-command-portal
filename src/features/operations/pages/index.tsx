import Link from "next/link";
import { notFound } from "next/navigation";

import { DashboardWidget } from "@/components/dashboard/dashboard-widget";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ReadinessCard } from "@/components/dashboard/readiness-card";
import { PageHeader } from "@/components/layout/page-header";
import { CollapsibleSection } from "@/components/layout/progressive-disclosure";
import { EmptyState } from "@/components/shared/empty-state";
import { AttendanceBadge } from "@/components/status/attendance-badge";
import { StatusBadge, type BadgeTone } from "@/components/status/status-badge";
import { UnitBadge } from "@/components/status/unit-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCountLabel, formatDateTime } from "@/lib/formatters";
import {
  CampaignDetailFoundationPage,
  CampaignsListPage,
} from "@/features/campaigns/pages";
import { DeploymentResourcesCard } from "@/features/campaigns/components/deployment-resources-card";
import {
  AarsLibraryPage,
  ConopsLibraryPage,
  S3DashboardPage,
} from "@/features/s3/pages";
import {
  BulkAttendanceForm,
  LockAttendanceForm,
  SelfRsvpForm,
} from "@/features/operations/components/attendance-forms";
import {
  CreateEventForm,
  DiscordAnnouncementActionForm,
  EditEventForm,
  EventLifecycleActionForm,
} from "@/features/operations/components/event-forms";
import { getCurrentUser } from "@/server/auth/current-user";
import {
  getAttendanceReportData,
  getEventAttendanceWorkspace,
  getViewerEventRsvp,
} from "@/server/attendance";
import { getCampaignSummaryCard } from "@/server/campaigns";
import { listDeploymentResources } from "@/server/deployment-resources";
import { getEventDiscordAnnouncementStatus } from "@/server/discord";
import type { AttendanceReportFilters } from "@/server/attendance";
import { can } from "@/server/permissions/access";
import { getEventDetail, getEventReferenceData, listEvents } from "@/server/events";
import type { EventFilters } from "@/server/events";
import { getOperationalDocumentsForEvent } from "@/server/s3";
import { isMissionStatus } from "@/server/s3";
import {
  isEventStatus,
  isEventType,
  isFinalAttendanceStatus,
} from "@/server/events/utils";

type SearchParamsValue = string | string[] | undefined;
type SearchParamsRecord = Record<string, SearchParamsValue>;

const fieldClassName =
  "flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

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

function getEventTone(status: string): BadgeTone {
  switch (status) {
    case "published":
      return "success";
    case "draft":
      return "warning";
    case "cancelled":
      return "danger";
    case "completed":
      return "info";
    default:
      return "muted";
  }
}

function getAttendanceTone(value: string | null): BadgeTone {
  switch (value) {
    case "yes":
    case "present":
      return "success";
    case "maybe":
    case "late":
    case "excused":
      return "warning";
    case "no":
    case "absent":
      return "danger";
    case "loa":
      return "info";
    default:
      return "muted";
  }
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

function EventFiltersCard({
  filters,
  referenceData,
}: {
  filters: {
    q?: string;
    unitId?: string;
    campaignId?: string;
    eventType?: string;
    missionStatus?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  };
  referenceData: Awaited<ReturnType<typeof getEventReferenceData>>;
}) {
  return (
    <Card className="border-border/80 bg-card/82">
      <CardHeader>
        <CardTitle>Event filters</CardTitle>
        <CardDescription>
          Filter by deployment, operation lifecycle, publication state, and date range.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action="/operations/events" className="grid gap-4 md:grid-cols-3 xl:grid-cols-4" method="get">
          <input
            className={fieldClassName}
            defaultValue={filters.q ?? ""}
            name="q"
            placeholder="Search title, description, or unit"
          />
          <select className={fieldClassName} defaultValue={filters.unitId ?? ""} name="unitId">
            <option value="">All units</option>
            {referenceData.units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.label}
              </option>
            ))}
          </select>
          <select className={fieldClassName} defaultValue={filters.eventType ?? ""} name="eventType">
            <option value="">All event types</option>
            {referenceData.eventTypes.map((eventType) => (
              <option key={eventType.key} value={eventType.key}>
                {eventType.label}
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
          <select className={fieldClassName} defaultValue={filters.status ?? ""} name="status">
            <option value="">All statuses</option>
            {referenceData.statuses.map((status) => (
              <option key={status.key} value={status.key}>
                {status.label}
              </option>
            ))}
          </select>
          <input className={fieldClassName} defaultValue={filters.dateFrom ?? ""} name="dateFrom" type="date" />
          <div className="flex gap-3">
            <input className={fieldClassName} defaultValue={filters.dateTo ?? ""} name="dateTo" type="date" />
            <Button type="submit" variant="outline">
              Apply
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function AttendanceFiltersCard({
  filters,
  reportData,
  finalStatuses,
}: {
  filters: {
    q?: string;
    unitId?: string;
    eventId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  };
  reportData: Awaited<ReturnType<typeof getAttendanceReportData>>;
  finalStatuses: readonly string[];
}) {
  return (
    <Card className="border-border/80 bg-card/82">
      <CardHeader>
        <CardTitle>Attendance filters</CardTitle>
        <CardDescription>
          Find pending closeout, missing RSVP follow-up, and no-show patterns across recent events.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action="/operations/attendance" className="grid gap-4 md:grid-cols-3 xl:grid-cols-6" method="get">
          <input
            className={fieldClassName}
            defaultValue={filters.q ?? ""}
            name="q"
            placeholder="Search title or host unit"
          />
          <select className={fieldClassName} defaultValue={filters.unitId ?? ""} name="unitId">
            <option value="">All units</option>
            {reportData.unitOptions.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.label}
              </option>
            ))}
          </select>
          <select className={fieldClassName} defaultValue={filters.eventId ?? ""} name="eventId">
            <option value="">All events</option>
            {reportData.availableEvents.map((event) => (
              <option key={event.id} value={event.id}>
                {event.label}
              </option>
            ))}
          </select>
          <select className={fieldClassName} defaultValue={filters.status ?? ""} name="status">
            <option value="">All report states</option>
            <option value="missing-rsvp">Missing RSVP</option>
            <option value="no-show">No-show</option>
            {finalStatuses.map((status) => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
          <input className={fieldClassName} defaultValue={filters.dateFrom ?? ""} name="dateFrom" type="date" />
          <div className="flex gap-3">
            <input className={fieldClassName} defaultValue={filters.dateTo ?? ""} name="dateTo" type="date" />
            <Button type="submit" variant="outline">
              Apply
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export async function EventsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const eventTypeFilter = getSearchParamValue(resolvedSearchParams, "eventType");
  const statusFilter = getSearchParamValue(resolvedSearchParams, "status");
  const missionStatusFilter = getSearchParamValue(resolvedSearchParams, "missionStatus");
  const filters: EventFilters = {
    q: getSearchParamValue(resolvedSearchParams, "q"),
    unitId: getSearchParamValue(resolvedSearchParams, "unitId"),
    campaignId: getSearchParamValue(resolvedSearchParams, "campaignId"),
    eventType:
      eventTypeFilter === "" || (eventTypeFilter && isEventType(eventTypeFilter))
        ? eventTypeFilter
        : undefined,
    missionStatus:
      missionStatusFilter === "" || (missionStatusFilter && isMissionStatus(missionStatusFilter))
        ? missionStatusFilter
        : undefined,
    status:
      statusFilter === "" || (statusFilter && isEventStatus(statusFilter))
        ? statusFilter
        : undefined,
    dateFrom: getSearchParamValue(resolvedSearchParams, "dateFrom"),
    dateTo: getSearchParamValue(resolvedSearchParams, "dateTo"),
  };
  const panel = getSearchParamValue(resolvedSearchParams, "panel");
  const message = getSearchParamValue(resolvedSearchParams, "message");
  const error = getSearchParamValue(resolvedSearchParams, "error");
  const [eventsData, referenceData, user] = await Promise.all([
    listEvents(filters),
    getEventReferenceData(),
    getCurrentUser(),
  ]);
  const canCreate = user ? can(user, "events.create") : false;
  const canPublish = user ? can(user, "events.publish") : false;
  const cleanHref = buildHref("/operations/events", resolvedSearchParams, {
    panel: undefined,
    message: undefined,
    error: undefined,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={["Operations", "Events"]}
        description="Database-backed event schedule with publishing, RSVP, and attendance workflows kept in one operational lane."
        title="Events"
      />
      <Card className="border-border/80 bg-card/72">
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Event controls</p>
            <p className="text-sm text-muted-foreground">
              Keep scheduling, publication, and attendance entry tied to the same event record.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {canCreate ? (
              <Button asChild>
                <Link href={buildHref("/operations/events", resolvedSearchParams, { panel: "create" })}>
                  Create event
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href="/operations/attendance">Open attendance reporting</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
      {message ? <FlashNotice message={message} tone="success" /> : null}
      {error ? <FlashNotice message={error} tone="danger" /> : null}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          hint="Visible events after filters"
          label="Tracked Events"
          tone="info"
          trend="Operations live"
          value={String(eventsData.summary.totalEvents)}
        />
        <DashboardWidget
          description="Published and visible for RSVP tracking"
          title="Published"
          tone="success"
          value={String(eventsData.summary.publishedEvents)}
        />
        <KpiCard
          hint="Upcoming events still in the operations lane"
          label="Upcoming"
          tone="warning"
          trend={`${eventsData.summary.pastEvents} past in view`}
          value={String(eventsData.summary.upcomingEvents)}
        />
        <ReadinessCard
          hint="Members still missing RSVP responses"
          label="Missing RSVP"
          statusLabel="Follow-up queue"
          value={String(eventsData.summary.missingRsvpCount)}
        />
      </section>
      {panel === "create" && canCreate ? (
        <CreateEventForm referenceData={referenceData} returnTo={cleanHref} />
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <EventFiltersCard filters={filters} referenceData={referenceData} />
          <Card className="border-border/80 bg-card/88">
            <CardHeader>
              <CardTitle>Event schedule</CardTitle>
              <CardDescription>
                {formatCountLabel(eventsData.events.length, "event")} visible with the current filters.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {eventsData.events.length === 0 ? (
                <EmptyState
                  actionLabel={canCreate ? "Create First Event" : undefined}
                  description="No events matched the current filters."
                  title="No events found"
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Host Unit</TableHead>
                      <TableHead className="hidden xl:table-cell">Docs</TableHead>
                      <TableHead className="hidden xl:table-cell">RSVP</TableHead>
                      <TableHead className="hidden xl:table-cell">Attendance</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eventsData.events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          <div>
                            <p className="font-semibold text-foreground">{event.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {event.eventTypeLabel} / {event.campaign?.title ?? "No deployment link"}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground xl:hidden">
                              {event.rsvpCounts.yes}/{event.expectedCount} yes /{" "}
                              {event.attendanceLocked ? "attendance locked" : `${event.finalCounts.pending} pending`} /{" "}
                              {event.publishedConopCount > 0 ? "CONOP ready" : "CONOP gap"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
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
                            <StatusBadge label={event.statusLabel} tone={getEventTone(event.status)} />
                          </div>
                        </TableCell>
                        <TableCell>{formatDateTime(event.startsAt)}</TableCell>
                        <TableCell>
                          {event.hostUnit ? <UnitBadge label={event.hostUnit.shortName} /> : "Unscoped"}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          <div className="space-y-1">
                            <AttendanceBadge
                              label={event.publishedConopCount > 0 ? "CONOP ready" : "No published CONOP"}
                            />
                            <AttendanceBadge
                              label={
                                event.eventType === "patrol"
                                  ? event.aarCount > 0
                                    ? `AAR ${event.latestAarStatusLabel ?? "started"}`
                                    : "Patrol AAR required"
                                  : "No AAR required"
                              }
                            />
                          </div>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          <AttendanceBadge
                            label={`${event.rsvpCounts.yes}/${event.expectedCount} yes`}
                          />
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          <AttendanceBadge
                            label={
                              event.attendanceLocked
                                ? "Locked"
                                : `${event.finalCounts.pending} pending`
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/operations/events/${event.id}`}>Open</Link>
                            </Button>
                            {canPublish && event.status === "draft" ? (
                              <Button asChild size="sm" variant="ghost">
                                <Link href={`/operations/events/${event.id}?panel=publish`}>
                                  Publish
                                </Link>
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          <CollapsibleSection
            description="Events remain the source of truth while S3 documents and deployment context layer onto the same record."
            title="Operations picture"
          >
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Operation lifecycle shows where each operation sits in the S3 review and publication flow.</p>
              <p>Document readiness surfaces CONOP gaps and Patrol AAR follow-up before they become operational debt.</p>
              <p>Event detail remains the workspace for publishing, attendance, Discord hooks, and deployment context.</p>
            </div>
          </CollapsibleSection>
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Command watch</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {eventsData.events.slice(0, 4).map((event) => (
                <div key={event.id} className="rounded-xl border border-border/70 bg-background/45 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-foreground">{event.title}</p>
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
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {event.rsvpCounts.missing} missing RSVP | {event.publishedConopCount > 0 ? "CONOP ready" : "CONOP gap"} | {event.eventType === "patrol" ? event.aarCount > 0 ? "AAR started" : "AAR needed" : "No AAR required"}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export async function EventDetailPage({
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
  const [event, referenceData, user] = await Promise.all([
    getEventDetail(id),
    getEventReferenceData(),
    getCurrentUser(),
  ]);

  if (!event) {
    notFound();
  }

  const eventScope = event.hostUnit ? { unitId: event.hostUnit.id } : undefined;
  const canEdit = user ? can(user, "events.edit", eventScope) || can(user, "events.edit") : false;
  const canPublish = user ? can(user, "events.publish", eventScope) || can(user, "events.publish") : false;
  const canSendDiscordAnnouncement =
    user &&
    (can(user, "discord.notifications.send", eventScope) || can(user, "discord.notifications.send")) &&
    canPublish;
  const canCancel = user ? can(user, "events.cancel", eventScope) || can(user, "events.cancel") : false;
  const canArchive = user ? can(user, "events.archive", eventScope) || can(user, "events.archive") : false;
  const canViewAttendance =
    user ? can(user, "attendance.view", eventScope) || can(user, "attendance.view") : false;
  const canManageRsvp =
    user
      ? can(user, "attendance.rsvp.manage", eventScope) || can(user, "attendance.rsvp.manage")
      : false;
  const canRecordAttendance =
    user ? can(user, "attendance.record", eventScope) || can(user, "attendance.record") : false;
  const canEditAttendance =
    user ? can(user, "attendance.edit", eventScope) || can(user, "attendance.edit") : false;
  const canOverrideAttendance =
    user
      ? can(user, "attendance.override", eventScope) || can(user, "attendance.override")
      : false;
  const canLockAttendance =
    user ? can(user, "attendance.lock", eventScope) || can(user, "attendance.lock") : false;
  const canSelfRsvp =
    user?.memberProfileLinked && (can(user, "attendance.rsvp.view") || can(user, "attendance.rsvp.view", eventScope));
  const canViewResources = user ? can(user, "deployments.resources.view") : false;
  const canManageResources = user
    ? can(user, "deployments.resources.upload") ||
      can(user, "deployments.resources.edit") ||
      can(user, "deployments.resources.delete") ||
      can(user, "deployments.edit")
    : false;
  const showResourceHistory = user ? canManageResources || can(user, "audit.view") : false;
  const [attendanceWorkspace, viewerRsvp, discordAnnouncementStatus] = await Promise.all([
    canViewAttendance ? getEventAttendanceWorkspace(event.id) : Promise.resolve(null),
    canSelfRsvp ? getViewerEventRsvp(event.id) : Promise.resolve(null),
    getEventDiscordAnnouncementStatus({
      eventId: event.id,
      hostUnitId: event.hostUnit?.id ?? null,
    }),
  ]);
  const operationalDocuments = await getOperationalDocumentsForEvent(event.id);
  const relatedCampaign = event.campaign
    ? await getCampaignSummaryCard(event.campaign.id)
    : null;
  const inheritedResources = event.campaign?.id && canViewResources
    ? await listDeploymentResources({
        campaignId: event.campaign.id,
        eventId: event.id,
        includeEventSpecific: true,
        includeHistory: showResourceHistory,
      })
    : [];
  const cleanHref = buildHref(`/operations/events/${event.id}`, resolvedSearchParams, {
    panel: undefined,
    message: undefined,
    error: undefined,
  });
  const missingRsvpRows = attendanceWorkspace?.rows.filter((row) => row.isMissingRsvp) ?? [];
  const noShowRows = attendanceWorkspace?.rows.filter((row) => row.isNoShow) ?? [];
  const canManageFinalAttendance = canRecordAttendance || canEditAttendance || canOverrideAttendance;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={["Operations", "Events", "Detail"]}
        contextLabel={event.id}
        description="Single-event workspace for scheduling context, RSVP visibility, attendance closeout, and final lock."
        title={event.title}
      />
      <Card className="border-border/80 bg-card/72">
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label={event.statusLabel} tone={getEventTone(event.status)} />
              <StatusBadge label={event.eventTypeLabel} tone="info" />
              {event.hostUnit ? <UnitBadge label={event.hostUnit.shortName} /> : null}
            </div>
            <p className="text-sm text-muted-foreground">
              {formatDateTime(event.startsAt)}
              {event.endsAt ? ` to ${formatDateTime(event.endsAt)}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {canEdit ? (
              <Button asChild>
                <Link href={buildHref(`/operations/events/${event.id}`, resolvedSearchParams, { panel: "edit" })}>
                  Edit event
                </Link>
              </Button>
            ) : null}
            {canPublish && event.status === "draft" ? (
              <Button asChild variant="outline">
                <Link href={buildHref(`/operations/events/${event.id}`, resolvedSearchParams, { panel: "publish" })}>
                  Publish
                </Link>
              </Button>
            ) : null}
            {canSendDiscordAnnouncement && event.status === "published" ? (
              <Button asChild variant="outline">
                <Link href={buildHref(`/operations/events/${event.id}`, resolvedSearchParams, { panel: "discord" })}>
                  Send Discord Announcement
                </Link>
              </Button>
            ) : null}
            {canCancel && event.status !== "cancelled" && event.status !== "archived" ? (
              <Button asChild variant="outline">
                <Link href={buildHref(`/operations/events/${event.id}`, resolvedSearchParams, { panel: "cancel" })}>
                  Cancel
                </Link>
              </Button>
            ) : null}
            {canArchive && event.status !== "archived" ? (
              <Button asChild variant="outline">
                <Link href={buildHref(`/operations/events/${event.id}`, resolvedSearchParams, { panel: "archive" })}>
                  Archive
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="ghost">
              <Link href="/operations/events">Back to events</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
      {message ? <FlashNotice message={message} tone="success" /> : null}
      {error ? <FlashNotice message={error} tone="danger" /> : null}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          hint="Host-unit roster expected for attendance"
          label="Expected"
          tone="info"
          trend="Roster scoped"
          value={String(event.expectedCount)}
        />
        <DashboardWidget
          description="Members who RSVP'd yes"
          title="RSVP Yes"
          tone="success"
          value={String(event.rsvpCounts.yes)}
        />
        <KpiCard
          hint="Still missing RSVP"
          label="Missing RSVP"
          tone="warning"
          trend="Follow-up"
          value={String(event.rsvpCounts.missing)}
        />
        <ReadinessCard
          hint="Attendance lock and closeout state"
          label="Attendance"
          statusLabel={event.attendanceLocked ? "Locked" : "Open"}
          value={String(event.finalCounts.pending)}
        />
      </section>
      {panel === "edit" && canEdit ? (
        <EditEventForm event={event} referenceData={referenceData} returnTo={cleanHref} />
      ) : null}
      {panel === "publish" && canPublish ? (
        <EventLifecycleActionForm action="publish" eventId={event.id} returnTo={cleanHref} />
      ) : null}
      {panel === "discord" && canSendDiscordAnnouncement && event.status === "published" ? (
        <DiscordAnnouncementActionForm eventId={event.id} returnTo={cleanHref} />
      ) : null}
      {panel === "cancel" && canCancel ? (
        <EventLifecycleActionForm action="cancel" eventId={event.id} returnTo={cleanHref} />
      ) : null}
      {panel === "archive" && canArchive ? (
        <EventLifecycleActionForm action="archive" eventId={event.id} returnTo={cleanHref} />
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Card className="border-border/80 bg-card/88">
            <CardHeader>
              <CardTitle>Event summary</CardTitle>
              <CardDescription>
                Schedule, host unit, deployment link, and live attendance context tied to the same record.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Operation type
                </p>
                <div className="mt-1 flex flex-wrap gap-2">
                  <StatusBadge label={event.eventTypeLabel} tone="info" />
                  {event.deploymentWeek ? <StatusBadge label={`Week ${event.deploymentWeek}`} tone="muted" /> : null}
                  {event.operationVersionLabel ? (
                    <StatusBadge label={event.operationVersionLabel} tone="info" />
                  ) : null}
                  {event.aarRequired ? (
                    <StatusBadge
                      label={event.aarSubmittedAt ? "Patrol AAR submitted" : "Patrol AAR required"}
                      tone={event.aarSubmittedAt ? "success" : "warning"}
                    />
                  ) : null}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Host unit
                </p>
                <p className="mt-1 text-sm text-foreground">
                  {event.hostUnit?.name ?? "No host unit assigned"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Deployment
                </p>
                <p className="mt-1 text-sm text-foreground">
                  {event.campaign?.title ?? "No deployment link"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Selected version
                </p>
                <p className="mt-1 text-sm text-foreground">
                  {event.selectedOperationVersion ?? "No operation version selected yet"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Published
                </p>
                <p className="mt-1 text-sm text-foreground">
                  {event.publishedAt ? formatDateTime(event.publishedAt) : "Not published yet"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Discord channel
                </p>
                <p className="mt-1 text-sm text-foreground">
                  {discordAnnouncementStatus.mappedChannelId
                    ? `${discordAnnouncementStatus.serverName ?? "Mapped server"} / #${discordAnnouncementStatus.mappedChannelId}`
                    : "No mapped event channel"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Description
                </p>
                <p className="mt-1 text-sm text-foreground">
                  {event.description ?? "No event description has been added yet."}
                </p>
              </div>
            </CardContent>
          </Card>
          {event.campaign?.id && canViewResources ? (
            <DeploymentResourcesCard
              campaignId={event.campaign.id}
              canManage={canManageResources}
              eventId={event.id}
              resources={inheritedResources}
              returnTo={cleanHref}
              showHistory={showResourceHistory}
              title="Weekly Operation Package"
            />
          ) : null}
          <Card className="border-border/80 bg-card/88">
            <CardHeader>
              <CardTitle>Weekly tasking</CardTitle>
              <CardDescription>
                Operation-linked tasking publishes with the event and Discord announcement.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {event.weeklyTasking ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge label={`Week ${event.weeklyTasking.weekNumber}`} tone="info" />
                    <StatusBadge label={event.weeklyTasking.publishStatus} tone={event.weeklyTasking.publishStatus === "published" ? "success" : "warning"} />
                    <StatusBadge label={`${event.weeklyTasking.unitTaskings.length} unit taskings`} tone="muted" />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-border/70 bg-background/45 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Community brief
                      </p>
                      <p className="mt-2 text-sm leading-6 text-foreground">
                        {event.weeklyTasking.operationalSummary ?? "Operational summary pending."}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-background/45 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Command intent
                      </p>
                      <p className="mt-2 text-sm leading-6 text-foreground">
                        {event.weeklyTasking.commandersIntent ?? "Command intent pending."}
                      </p>
                    </div>
                  </div>
                  {event.weeklyTasking.unitTaskings.length > 0 ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {event.weeklyTasking.unitTaskings.map((tasking) => (
                        <div key={tasking.id} className="rounded-xl border border-border/70 bg-background/45 p-4">
                          <div className="mb-2 flex items-center gap-2">
                            <UnitBadge label={tasking.unitShortName} />
                            <StatusBadge label="Unit tasking" tone="info" />
                          </div>
                          <p className="text-sm font-semibold text-foreground">
                            {tasking.primaryObjective ?? "Primary objective pending"}
                          </p>
                          {tasking.secondaryObjective ? (
                            <p className="mt-2 text-sm text-muted-foreground">
                              Secondary: {tasking.secondaryObjective}
                            </p>
                          ) : null}
                          {tasking.specialInstructions ? (
                            <p className="mt-2 text-sm text-muted-foreground">
                              Instructions: {tasking.specialInstructions}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      description="Each operational week should contain tasking for every active community unit."
                      title="Unit tasking pending"
                    />
                  )}
                </>
              ) : (
                <EmptyState
                  description="Weekly tasking has not been created for this operation yet."
                  title="No weekly tasking"
                />
              )}
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/88">
            <CardHeader>
              <CardTitle>AAR and legacy CONOP records</CardTitle>
              <CardDescription>
                The active CONOP should live in the Weekly Operation Package above. Older rich CONOP records remain visible for continuity.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
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
                        Updated {formatDateTime(conop.updatedAt)}
                      </p>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    description="No CONOP records are linked to this event yet."
                    title="No CONOP linked"
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
                        Updated {formatDateTime(aar.updatedAt)}
                      </p>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    description="No AAR records are linked to this event yet."
                    title="No AAR linked"
                  />
                )}
              </div>
            </CardContent>
          </Card>
          {canSelfRsvp ? (
            <SelfRsvpForm
              eventId={event.id}
              memberProfileId={user?.memberProfileId}
              referenceData={referenceData}
              returnTo={cleanHref}
              viewerRsvp={viewerRsvp}
            />
          ) : null}
          {attendanceWorkspace ? (
            <>
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <DashboardWidget
                  description="Members with an RSVP response"
                  title="Responded"
                  tone="success"
                  value={String(attendanceWorkspace.summary.respondedCount)}
                />
                <KpiCard
                  hint="Members still missing an RSVP"
                  label="Missing RSVP"
                  tone="warning"
                  trend="Needs follow-up"
                  value={String(attendanceWorkspace.summary.missingRsvpCount)}
                />
                <KpiCard
                  hint="RSVP yes but final absent"
                  label="No-show"
                  tone="danger"
                  trend="Attendance gap"
                  value={String(attendanceWorkspace.summary.noShowCount)}
                />
                <ReadinessCard
                  hint="Present and late vs accountable absences"
                  label="Attendance Rate"
                  statusLabel="Finalized"
                  value={
                    attendanceWorkspace.summary.attendanceRate !== null
                      ? `${attendanceWorkspace.summary.attendanceRate}%`
                      : "N/A"
                  }
                />
              </section>
              {canManageRsvp || canManageFinalAttendance ? (
                <BulkAttendanceForm
                  canManageFinalAttendance={canManageFinalAttendance}
                  canManageRsvp={canManageRsvp}
                  eventId={event.id}
                  referenceData={referenceData}
                  returnTo={cleanHref}
                  workspace={attendanceWorkspace}
                />
              ) : (
                <Card className="border-border/80 bg-card/88">
                  <CardHeader>
                    <CardTitle>Attendance table</CardTitle>
                    <CardDescription>
                      Read-only attendance view for this event.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Member</TableHead>
                          <TableHead>RSVP</TableHead>
                          <TableHead>Final</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendanceWorkspace.rows.map((row) => (
                          <TableRow key={row.memberProfileId}>
                            <TableCell>{row.displayName}</TableCell>
                            <TableCell>
                              <StatusBadge
                                label={row.rsvpStatus?.toUpperCase() ?? "Missing"}
                                tone={getAttendanceTone(row.rsvpStatus)}
                              />
                            </TableCell>
                            <TableCell>
                              <StatusBadge
                                label={row.finalStatus?.toUpperCase() ?? "Pending"}
                                tone={getAttendanceTone(row.finalStatus)}
                              />
                            </TableCell>
                            <TableCell>{row.notes ?? "No notes"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="border-border/80 bg-card/88">
              <CardHeader>
                <CardTitle>Attendance access</CardTitle>
                <CardDescription>
                  This event is visible, but attendance detail is restricted by permission.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Attendance tables, RSVP management, and final attendance entry require attendance permissions.
              </CardContent>
            </Card>
          )}
        </div>
        <div className="space-y-4">
          {attendanceWorkspace && canLockAttendance ? (
            <LockAttendanceForm eventId={event.id} returnTo={cleanHref} />
          ) : null}
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Discord announcement</CardTitle>
              <CardDescription>
                Event announcements use the mapped `events` channel and write RSVP changes back into portal attendance records.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge
                  label={
                    discordAnnouncementStatus.status === "not-sent"
                      ? "Not sent"
                      : discordAnnouncementStatus.status
                  }
                  tone={
                    discordAnnouncementStatus.status === "sent"
                      ? "success"
                      : discordAnnouncementStatus.status === "failed"
                        ? "danger"
                        : discordAnnouncementStatus.status === "pending" ||
                            discordAnnouncementStatus.status === "retrying"
                          ? "warning"
                          : "muted"
                  }
                />
                {discordAnnouncementStatus.serverName ? (
                  <StatusBadge label={discordAnnouncementStatus.serverName} tone="info" />
                ) : null}
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  Mapped channel:{" "}
                  {discordAnnouncementStatus.mappedChannelId
                    ? `#${discordAnnouncementStatus.mappedChannelId}`
                    : "No mapping configured"}
                </p>
                <p>
                  Last destination:{" "}
                  {discordAnnouncementStatus.destinationKey ?? "No announcement has been sent yet"}
                </p>
                <p>
                  Updated: {discordAnnouncementStatus.updatedAtLabel ?? "Not sent yet"}
                </p>
                {discordAnnouncementStatus.errorMessage ? (
                  <p>{discordAnnouncementStatus.errorMessage}</p>
                ) : null}
              </div>
              {canSendDiscordAnnouncement && event.status === "published" ? (
                <Button asChild className="w-full justify-start" variant="outline">
                  <Link
                    href={buildHref(`/operations/events/${event.id}`, resolvedSearchParams, {
                      panel: "discord",
                    })}
                  >
                    {discordAnnouncementStatus.hasAnnouncement
                      ? "Send announcement again"
                      : "Send first announcement"}
                  </Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Related deployment</CardTitle>
              <CardDescription>
                Event-to-deployment linkage keeps the broader operational arc visible without leaving the event workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {relatedCampaign ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge
                      label={relatedCampaign.statusLabel}
                      tone={
                        relatedCampaign.status === "active"
                          ? "success"
                          : relatedCampaign.status === "planning"
                            ? "info"
                            : relatedCampaign.status === "paused"
                              ? "warning"
                              : relatedCampaign.status === "archived"
                                ? "danger"
                                : "muted"
                      }
                    />
                    {relatedCampaign.phase ? (
                      <StatusBadge label={relatedCampaign.phase} tone="info" />
                    ) : null}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{relatedCampaign.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {relatedCampaign.nextEvent
                        ? `Next operation ${formatDateTime(relatedCampaign.nextEvent.startsAt)}`
                        : "No upcoming linked operation"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/45 p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Deployment progress
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-foreground">
                      {relatedCampaign.progressPercent !== null
                        ? `${relatedCampaign.progressPercent}%`
                        : "N/A"}
                    </p>
                  </div>
                  <Button asChild className="w-full justify-start" variant="outline">
                    <Link href={`/operations/deployments/${relatedCampaign.id}`}>
                      Open deployment detail
                    </Link>
                  </Button>
                </>
              ) : (
                <EmptyState
                  description={
                    event.campaign
                      ? "Deployment context is hidden until the viewer has deployment visibility."
                      : "This event is not linked to a deployment yet."
                  }
                  title={event.campaign ? "Deployment restricted" : "No linked deployment"}
                />
              )}
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Missing RSVP</CardTitle>
              <CardDescription>
                Members still needing a response before the event.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {missingRsvpRows.length > 0 ? (
                missingRsvpRows.map((row) => (
                  <div key={row.memberProfileId} className="rounded-xl border border-border/70 bg-background/45 p-3">
                    <p className="font-semibold text-foreground">{row.displayName}</p>
                    <p className="text-sm text-muted-foreground">
                      {[row.positionTitle, row.rankAbbreviation].filter(Boolean).join(" / ") || "Unit member"}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState
                  description="All visible members have submitted an RSVP."
                  title="No missing RSVPs"
                />
              )}
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>No-show list</CardTitle>
              <CardDescription>
                RSVP yes paired with a final absent status.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {noShowRows.length > 0 ? (
                noShowRows.map((row) => (
                  <div key={row.memberProfileId} className="rounded-xl border border-danger/25 bg-danger/10 p-3">
                    <p className="font-semibold text-foreground">{row.displayName}</p>
                    <p className="text-sm text-muted-foreground">
                      Final status: {row.finalStatus?.toUpperCase() ?? "PENDING"}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState
                  description="No RSVP yes records currently resolve to absent."
                  title="No no-shows"
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export async function AttendancePage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const attendanceStatusFilter = getSearchParamValue(resolvedSearchParams, "status");
  const filters: AttendanceReportFilters = {
    q: getSearchParamValue(resolvedSearchParams, "q"),
    unitId: getSearchParamValue(resolvedSearchParams, "unitId"),
    eventId: getSearchParamValue(resolvedSearchParams, "eventId"),
    status:
      attendanceStatusFilter === "" ||
      attendanceStatusFilter === "missing-rsvp" ||
      attendanceStatusFilter === "no-show" ||
      (attendanceStatusFilter && isFinalAttendanceStatus(attendanceStatusFilter))
        ? attendanceStatusFilter
        : undefined,
    dateFrom: getSearchParamValue(resolvedSearchParams, "dateFrom"),
    dateTo: getSearchParamValue(resolvedSearchParams, "dateTo"),
  };
  const message = getSearchParamValue(resolvedSearchParams, "message");
  const error = getSearchParamValue(resolvedSearchParams, "error");
  const [reportData, referenceData] = await Promise.all([
    getAttendanceReportData(filters),
    getEventReferenceData(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={["Operations", "Attendance"]}
        description="Cross-event reporting for RSVP gaps, no-shows, pending closeout, and attendance readiness."
        title="Attendance"
      />
      {message ? <FlashNotice message={message} tone="success" /> : null}
      {error ? <FlashNotice message={error} tone="danger" /> : null}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          hint="Events in the current reporting view"
          label="Tracked Events"
          tone="info"
          trend="Reporting live"
          value={String(reportData.summary.trackedEvents)}
        />
        <DashboardWidget
          description="Events still missing final lock"
          title="Pending Closeout"
          tone="warning"
          value={String(reportData.summary.pendingCloseout)}
        />
        <KpiCard
          hint="All missing RSVP rows in the report scope"
          label="Missing RSVP"
          tone="warning"
          trend="Follow-up list"
          value={String(reportData.summary.missingRsvpCount)}
        />
        <ReadinessCard
          hint="Average attendance rate across report rows"
          label="Average Rate"
          statusLabel="Across events"
          value={
            reportData.summary.averageAttendanceRate !== null
              ? `${reportData.summary.averageAttendanceRate}%`
              : "N/A"
          }
        />
      </section>
      <CollapsibleSection
        defaultOpen={Boolean(filters.q || filters.unitId || filters.eventId || filters.status || filters.dateFrom || filters.dateTo)}
        description="Keep attendance focused on current follow-up first; expand filters for unit, event, status, or date-range reporting."
        title="Attendance filters"
      >
        <AttendanceFiltersCard
          filters={filters}
          finalStatuses={referenceData.finalStatuses}
          reportData={reportData}
        />
      </CollapsibleSection>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="border-border/80 bg-card/88">
          <CardHeader>
            <CardTitle>Attendance reporting</CardTitle>
            <CardDescription>
              {formatCountLabel(reportData.events.length, "event")} in the current report scope.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reportData.events.length === 0 ? (
              <EmptyState
                description="No events matched the current attendance report filters."
                title="No attendance results"
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead className="hidden lg:table-cell">Date</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Missing RSVP</TableHead>
                    <TableHead>No-show</TableHead>
                    <TableHead className="hidden xl:table-cell">Rate</TableHead>
                    <TableHead className="hidden lg:table-cell">Lock</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.events.map((event) => (
                    <TableRow key={event.eventId}>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-foreground">{event.title}</p>
                          <p className="text-xs text-muted-foreground">{event.eventTypeLabel}</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">{formatDateTime(event.startsAt)}</TableCell>
                      <TableCell>{event.hostUnitShortName ?? "Unscoped"}</TableCell>
                      <TableCell>
                        <AttendanceBadge label={String(event.missingRsvpCount)} />
                      </TableCell>
                      <TableCell>
                        <AttendanceBadge label={String(event.noShowCount)} />
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <AttendanceBadge
                          label={event.attendanceRate !== null ? `${event.attendanceRate}%` : "N/A"}
                        />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <StatusBadge
                          label={event.attendanceLocked ? "Locked" : "Open"}
                          tone={event.attendanceLocked ? "success" : "warning"}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/operations/events/${event.eventId}`}>Open event</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Missing RSVP follow-up</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {reportData.missingRsvpMembers.length > 0 ? (
                reportData.missingRsvpMembers.slice(0, 8).map((entry) => (
                  <div key={`${entry.eventId}-${entry.memberProfileId}`} className="rounded-xl border border-border/70 bg-background/45 p-3">
                    <p className="font-semibold text-foreground">{entry.displayName}</p>
                    <p className="text-sm text-muted-foreground">
                      {entry.eventTitle} / {entry.unitShortName ?? "Unscoped"}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState
                  description="No missing RSVP rows are currently visible."
                  title="No RSVP follow-up"
                />
              )}
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>No-show review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {reportData.noShows.length > 0 ? (
                reportData.noShows.slice(0, 8).map((entry) => (
                  <div key={`${entry.eventId}-${entry.memberProfileId}`} className="rounded-xl border border-danger/25 bg-danger/10 p-3">
                    <p className="font-semibold text-foreground">{entry.displayName}</p>
                    <p className="text-sm text-muted-foreground">
                      {entry.eventTitle} / {entry.unitShortName ?? "Unscoped"}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState
                  description="No RSVP yes records currently resolve to absent."
                  title="No no-shows"
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function CampaignsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  return <CampaignsListPage searchParams={searchParams} />;
}

export async function CampaignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<SearchParamsRecord>;
}) {
  return <CampaignDetailFoundationPage params={params} searchParams={searchParams} />;
}

export async function ConopsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  return <ConopsLibraryPage searchParams={searchParams} />;
}

export async function AarsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  return <AarsLibraryPage searchParams={searchParams} />;
}

export async function S3Page({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  return <S3DashboardPage searchParams={searchParams} />;
}
