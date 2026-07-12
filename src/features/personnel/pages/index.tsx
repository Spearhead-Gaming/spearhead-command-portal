import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ShieldCheck, UserPlus } from "lucide-react";

import { ServiceTimeline } from "@/components/activity/service-timeline";
import { DashboardWidget } from "@/components/dashboard/dashboard-widget";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ReadinessCard } from "@/components/dashboard/readiness-card";
import { PageHeader } from "@/components/layout/page-header";
import { CollapsibleSection } from "@/components/layout/progressive-disclosure";
import { EmptyState } from "@/components/shared/empty-state";
import { RankBadge } from "@/components/status/rank-badge";
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
import { MemberReadinessCard } from "@/features/personnel/components/member-readiness-card";
import {
  PersonnelNextActionCard,
  type PersonnelNextAction,
} from "@/features/personnel/components/personnel-workflow";
import { QualificationsCatalogPage } from "@/features/qualifications/pages";
import { can } from "@/server/permissions/access";
import { getCurrentUser } from "@/server/auth/current-user";
import { formatCountLabel, formatDate, formatDateTime } from "@/lib/formatters";
import {
  MemberAttendanceSummaryCard,
  MemberAuditLogCard,
  MemberCampaignSummaryCard,
  MemberNotesCard,
  MemberQualificationsSummaryCard,
  MemberRecentActivityCard,
  MemberServiceLogsCard,
  MemberServiceOverviewCard,
} from "@/features/personnel/components/member-service-record-sections";
import {
  AssignPositionFormCard,
  AssignUnitFormCard,
  ChangeRankFormCard,
  ChangeStatusFormCard,
  CreateMemberFormCard,
  EditMemberBasicsFormCard,
} from "@/features/personnel/components/personnel-forms";
import { MemberInspectorDrawer } from "@/features/personnel/components/member-inspector-drawer";
import {
  getMemberProfile,
  getMemberProfileDashboardData,
  getPersonnelReferenceData,
  listMembers,
  listRosterAssignments,
} from "@/server/personnel";

type SearchParamsValue = string | string[] | undefined;
type SearchParamsRecord = Record<string, SearchParamsValue>;
type DiscordLinkedFilter = "" | "linked" | "unlinked" | undefined;

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

function getDiscordLinkedFilter(value: string | undefined): DiscordLinkedFilter {
  if (value === "linked" || value === "unlinked" || value === "") {
    return value;
  }

  return undefined;
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

function getStatusTone(statusKey: string): BadgeTone {
  switch (statusKey) {
    case "active":
      return "success";
    case "reserve":
      return "info";
    case "loa":
      return "warning";
    case "inactive":
    case "banned":
    case "discharged":
      return "danger";
    default:
      return "muted";
  }
}

function FiltersCard({
  actionPath,
  filters,
  options,
}: {
  actionPath: string;
  filters: {
    q?: string;
    unitId?: string;
    statusId?: string;
    positionId?: string;
    discordLinked?: string;
  };
  options: Awaited<ReturnType<typeof getPersonnelReferenceData>>;
}) {
  const fieldClassName =
    "flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

  return (
    <Card className="border-border/80 bg-card/82">
      <CardHeader>
        <CardTitle>Search and filter</CardTitle>
        <CardDescription>
          Narrow the roster by display name, unit, status, position, or Discord link state.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={actionPath} className="grid gap-4 md:grid-cols-3 xl:grid-cols-5" method="get">
          <input
            className={fieldClassName}
            defaultValue={filters.q ?? ""}
            name="q"
            placeholder="Search member or callsign"
          />
          <select className={fieldClassName} defaultValue={filters.unitId ?? ""} name="unitId">
            <option value="">All units</option>
            {options.units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.label}
              </option>
            ))}
          </select>
          <select
            className={fieldClassName}
            defaultValue={filters.statusId ?? ""}
            name="statusId"
          >
            <option value="">All statuses</option>
            {options.statuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.label}
              </option>
            ))}
          </select>
          <select
            className={fieldClassName}
            defaultValue={filters.positionId ?? ""}
            name="positionId"
          >
            <option value="">All positions</option>
            {options.positions.map((position) => (
              <option key={position.id} value={position.id}>
                {position.label}
              </option>
            ))}
          </select>
          <div className="flex gap-3">
            {"discordLinked" in filters ? (
              <select
                className={fieldClassName}
                defaultValue={filters.discordLinked ?? ""}
                name="discordLinked"
              >
                <option value="">Any Discord state</option>
                <option value="linked">Discord linked</option>
                <option value="unlinked">Discord unlinked</option>
              </select>
            ) : null}
            <Button className="shrink-0" type="submit" variant="outline">
              Apply
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
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
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">
            {tone === "danger" ? "Action blocked" : "Action completed"}
          </p>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        <StatusBadge
          label={tone === "danger" ? "Error" : "Saved"}
          tone={tone}
        />
      </CardContent>
    </Card>
  );
}

export async function MembersPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const filters = {
    q: getSearchParamValue(resolvedSearchParams, "q"),
    unitId: getSearchParamValue(resolvedSearchParams, "unitId"),
    statusId: getSearchParamValue(resolvedSearchParams, "statusId"),
    positionId: getSearchParamValue(resolvedSearchParams, "positionId"),
    discordLinked: getDiscordLinkedFilter(
      getSearchParamValue(resolvedSearchParams, "discordLinked"),
    ),
  };
  const inspectId = getSearchParamValue(resolvedSearchParams, "inspect");
  const panel = getSearchParamValue(resolvedSearchParams, "panel");
  const message = getSearchParamValue(resolvedSearchParams, "message");
  const error = getSearchParamValue(resolvedSearchParams, "error");

  const [membersData, options, inspectedMember] = await Promise.all([
    listMembers(filters),
    getPersonnelReferenceData(),
    inspectId ? getMemberProfileDashboardData(inspectId) : Promise.resolve(null),
  ]);

  const canCreate = can(membersData.user, "personnel.profile.create");
  const cleanHref = buildHref("/personnel/members", resolvedSearchParams, {
    inspect: undefined,
    panel: undefined,
    message: undefined,
    error: undefined,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={["Personnel", "Members"]}
        description="Search, inspect, and create official member records from the database-backed personnel foundation."
        title="Member List"
      />
      <Card className="border-border/80 bg-card/72">
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Personnel controls</p>
              <p className="text-sm text-muted-foreground">
                Use the inspector for context, then move into full-profile editing only when needed.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {canCreate ? (
              <Button asChild>
                <Link href={buildHref("/personnel/members", resolvedSearchParams, { panel: "create" })}>
                  <UserPlus className="h-4 w-4" />
                  Create member
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href="/personnel/roster">
                Open roster workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
      {message ? <FlashNotice message={message} tone="success" /> : null}
      {error ? <FlashNotice message={error} tone="danger" /> : null}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          hint="All visible member profiles"
          label="Profiles"
          tone="info"
          trend="Database-backed"
          value={String(membersData.summary.totalProfiles)}
        />
        <KpiCard
          hint="Profiles linked to a Discord-authenticated user"
          label="Discord Linked"
          tone="success"
          trend="Auth ready"
          value={String(membersData.summary.linkedProfiles)}
        />
        <DashboardWidget
          description="Members currently marked active"
          title="Active Members"
          tone="warning"
          value={String(membersData.summary.activeProfiles)}
        />
        <ReadinessCard
          hint="Applicant, recruit, or unlinked profiles needing follow-up"
          label="Needs Review"
          statusLabel="Personnel follow-up"
          value={String(membersData.summary.reviewProfiles)}
        />
      </section>
      {panel === "create" && canCreate ? (
        <CreateMemberFormCard options={options} returnTo={cleanHref} />
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <CollapsibleSection
            defaultOpen={Boolean(
              filters.q ||
                filters.unitId ||
                filters.statusId ||
                filters.positionId ||
                filters.discordLinked,
            )}
            description="Advanced filters stay one click away so the member list starts with the roster answer."
            title="Search and advanced filters"
          >
            <FiltersCard actionPath="/personnel/members" filters={filters} options={options} />
          </CollapsibleSection>
          <Card className="border-border/80 bg-card/88">
            <CardHeader>
              <CardTitle>Member directory</CardTitle>
              <CardDescription>
                {formatCountLabel(membersData.members.length, "member")} visible with the current filter set.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {membersData.members.length === 0 ? (
                <EmptyState
                  actionLabel={canCreate ? "Create First Member" : undefined}
                  description="No member profiles matched the current filters. Adjust the search or add the first profile."
                  title="No matching members"
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member / Discord Name</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden xl:table-cell">Join Date</TableHead>
                      <TableHead className="hidden xl:table-cell">Discord</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {membersData.members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div>
                            <p className="font-semibold text-foreground">{member.displayName}</p>
                            <p className="text-xs text-muted-foreground">
                              {member.callsign ?? "Discord-linked member profile"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {member.unit ? <UnitBadge label={member.unit.shortName} /> : "Unassigned"}
                        </TableCell>
                        <TableCell>{member.position?.title ?? "Unassigned"}</TableCell>
                        <TableCell>
                          <StatusBadge
                            label={member.status.label}
                            tone={getStatusTone(member.status.key)}
                          />
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">{formatDate(member.joinDate)}</TableCell>
                        <TableCell className="hidden xl:table-cell">
                          <StatusBadge
                            label={member.discordLinked ? "Linked" : "Pending"}
                            tone={member.discordLinked ? "success" : "warning"}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button asChild size="sm" variant="outline">
                              <Link
                                href={buildHref("/personnel/members", resolvedSearchParams, {
                                  inspect: member.id,
                                })}
                              >
                                Inspect
                              </Link>
                            </Button>
                            <Button asChild size="sm" variant="ghost">
                              <Link href={`/personnel/members/${member.id}`}>Open</Link>
                            </Button>
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
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Context over navigation</CardTitle>
              <CardDescription>
                Member inspection stays one click away, while roster edits live in dedicated profile and roster actions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Use filters to isolate one unit, status, or position at a time.</p>
              <p>Open the inspector for quick context before jumping into a full profile edit flow.</p>
              <p>Use the roster workspace for faster unit, position, status, and optional rank updates.</p>
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>What is live now</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Real database reads for member list and profile routes.</p>
              <p>Scoped permission checks in the service layer.</p>
              <p>Audit logging for profile creation and roster-sensitive changes.</p>
            </CardContent>
          </Card>
        </div>
      </div>
      <MemberInspectorDrawer
        closeHref={buildHref("/personnel/members", resolvedSearchParams, { inspect: undefined })}
        member={inspectedMember}
        open={Boolean(inspectedMember)}
      />
    </div>
  );
}

export async function MemberProfilePage({
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
  const [dashboard, options, user] = await Promise.all([
    getMemberProfileDashboardData(id),
    getPersonnelReferenceData(),
    getCurrentUser(),
  ]);

  if (!dashboard) {
    redirect("/forbidden");
  }

  const member = dashboard.member;
  const memberScope = member.unit ? { unitId: member.unit.id } : undefined;
  const canEditBasics = user
    ? can(user, "personnel.profile.edit", memberScope) || can(user, "personnel.profile.edit")
    : false;
  const canChangeRank = user
    ? can(user, "roster.rank.change", memberScope) || can(user, "roster.rank.change")
    : false;
  const canChangeUnit = user
    ? can(user, "roster.unit.assign", memberScope) || can(user, "roster.unit.assign")
    : false;
  const canChangePosition = user
    ? can(user, "roster.position.assign", memberScope) || can(user, "roster.position.assign")
    : false;
  const canChangeStatus = user
    ? can(user, "roster.status.change", memberScope) || can(user, "roster.status.change")
    : false;
  const hasRosterActions = canChangeRank || canChangeUnit || canChangePosition || canChangeStatus;
  const profileNextAction: PersonnelNextAction | null = !dashboard.readiness?.hasActiveUnitAssignment && canChangeUnit
    ? {
        href: buildHref(`/personnel/members/${member.id}`, resolvedSearchParams, { panel: "unit" }),
        label: "Assign unit",
        reason: "This member does not have an active unit assignment, so readiness cannot be fully evaluated.",
        responsible: "S1 / Unit Leadership",
        tone: "warning",
      }
    : dashboard.readiness && dashboard.readiness.missingRequirementCount > 0
      ? {
          href: `/training/qualification-matrix?memberProfileId=${member.id}`,
          label: "Review qualifications",
          reason: `${dashboard.readiness.missingRequirementCount} required qualification gap(s): ${dashboard.readiness.missingRequirementLabels.slice(0, 2).join(", ")}.`,
          responsible: "Training Staff",
          tone: "warning",
        }
      : dashboard.attendanceSummary && dashboard.attendanceSummary.absentCount > 0
        ? {
            href: "/operations/attendance",
            label: "Review attendance",
            reason: `${dashboard.attendanceSummary.absentCount} absence record(s) may affect readiness.`,
            responsible: "Unit Leadership",
            tone: "warning",
          }
        : canEditBasics
          ? {
              href: buildHref(`/personnel/members/${member.id}`, resolvedSearchParams, { panel: "edit" }),
              label: "Review profile",
              reason: "Profile overview is healthy; use edit only when portal-owned fields need correction.",
              responsible: "Personnel Staff",
              tone: "success",
            }
          : null;
  const cleanHref = buildHref(`/personnel/members/${member.id}`, resolvedSearchParams, {
    panel: undefined,
    message: undefined,
    error: undefined,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={["Personnel", "Members", "Profile"]}
        contextLabel={member.id}
        description="Official service record with readiness, history, and roster actions kept close to the profile header."
        title={member.displayName}
      />
      <Card className="border-border/80 bg-card/72">
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {member.rank ? <RankBadge label={member.rank.abbreviation} /> : null}
              {member.unit ? <UnitBadge label={member.unit.shortName} /> : null}
              <StatusBadge label={member.status.label} tone={getStatusTone(member.status.key)} />
              {dashboard.readiness ? (
                <StatusBadge
                  label={dashboard.readiness.statusLabel}
                  tone={dashboard.readiness.tone}
                />
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">
              {member.position?.title ?? "No current position"} · Joined {formatDate(member.joinDate)}
            </p>
          </div>
          <div className="flex flex-wrap items-start gap-3">
            {canEditBasics ? (
              <Button asChild>
                <Link href={buildHref(`/personnel/members/${member.id}`, resolvedSearchParams, { panel: "edit" })}>
                  Edit profile
                </Link>
              </Button>
            ) : null}
            {hasRosterActions ? (
              <details className="group rounded-xl border border-border/70 bg-background/35">
                <summary className="cursor-pointer list-none px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted/20 [&::-webkit-details-marker]:hidden">
                  Roster actions
                </summary>
                <div className="flex flex-col gap-2 border-t border-border/60 p-2">
                  {canChangeRank ? (
                    <Button asChild size="sm" variant="ghost">
                      <Link href={buildHref(`/personnel/members/${member.id}`, resolvedSearchParams, { panel: "rank" })}>
                        Set rank
                      </Link>
                    </Button>
                  ) : null}
                  {canChangeUnit ? (
                    <Button asChild size="sm" variant="ghost">
                      <Link href={buildHref(`/personnel/members/${member.id}`, resolvedSearchParams, { panel: "unit" })}>
                        Assign unit
                      </Link>
                    </Button>
                  ) : null}
                  {canChangePosition ? (
                    <Button asChild size="sm" variant="ghost">
                      <Link href={buildHref(`/personnel/members/${member.id}`, resolvedSearchParams, { panel: "position" })}>
                        Assign position
                      </Link>
                    </Button>
                  ) : null}
                  {canChangeStatus ? (
                    <Button asChild size="sm" variant="ghost">
                      <Link href={buildHref(`/personnel/members/${member.id}`, resolvedSearchParams, { panel: "status" })}>
                        Change status
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </details>
            ) : null}
          </div>
        </CardContent>
      </Card>
      {message ? <FlashNotice message={message} tone="success" /> : null}
      {error ? <FlashNotice message={error} tone="danger" /> : null}
      <PersonnelNextActionCard action={profileNextAction} title="Profile next action" />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardWidget
          description="Current unit assignment"
          title="Unit"
          tone="info"
          value={member.unit?.shortName ?? "Unassigned"}
        />
        <DashboardWidget
          description="Current billet or duty position"
          title="Position"
          tone="success"
          value={member.position?.title ?? "Unassigned"}
        />
        <KpiCard
          hint="Current roster status"
          label="Status"
          tone={getStatusTone(member.status.key)}
          trend="Roster live"
          value={member.status.label}
        />
        <ReadinessCard
          hint="Simple readiness snapshot based on status, assignment, attendance, and qualification gaps."
          label="Readiness"
          statusLabel={dashboard.readiness?.statusLabel ?? "Restricted"}
          value={
            dashboard.readiness?.score !== null && dashboard.readiness?.score !== undefined
              ? `${dashboard.readiness.score}%`
              : "N/A"
          }
        />
      </section>
      {panel === "edit" && canEditBasics ? (
        <EditMemberBasicsFormCard member={member} returnTo={cleanHref} />
      ) : null}
      {panel === "rank" && canChangeRank ? (
        <ChangeRankFormCard member={member} options={options} returnTo={cleanHref} />
      ) : null}
      {panel === "unit" && canChangeUnit ? (
        <AssignUnitFormCard member={member} options={options} returnTo={cleanHref} />
      ) : null}
      {panel === "position" && canChangePosition ? (
        <AssignPositionFormCard member={member} options={options} returnTo={cleanHref} />
      ) : null}
      {panel === "status" && canChangeStatus ? (
        <ChangeStatusFormCard member={member} options={options} returnTo={cleanHref} />
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <MemberServiceOverviewCard dashboard={dashboard} />
          <MemberReadinessCard readiness={dashboard.readiness} />
          <CollapsibleSection
            badgeLabel="Details"
            description="Roster history, qualifications, attendance, campaigns, and timeline details stay available without dominating the profile overview."
            title="Service record details"
          >
            <div className="space-y-6">
          <Card className="border-border/80 bg-card/88">
            <CardHeader>
              <CardTitle>Roster history</CardTitle>
              <CardDescription>
                Primary assignments are preserved instead of overwritten.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {member.rosterHistory.length === 0 ? (
                <EmptyState
                  description="No roster assignment history has been recorded yet."
                  title="No roster history"
                />
              ) : (
                <div className="space-y-3">
                  {member.rosterHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-xl border border-border/70 bg-background/40 p-4"
                    >
                      <p className="font-semibold text-foreground">
                        {[entry.unitName, entry.positionTitle, entry.rankAbbreviation]
                          .filter(Boolean)
                          .join(" · ") || "Roster assignment recorded"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {entry.endsAt
                          ? `${formatDate(entry.startsAt)} to ${formatDate(entry.endsAt)}`
                          : `Since ${formatDate(entry.startsAt)}`}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <MemberQualificationsSummaryCard dashboard={dashboard} />
          <MemberAttendanceSummaryCard dashboard={dashboard} />
          <MemberCampaignSummaryCard dashboard={dashboard} />
          {dashboard.permissions.canViewServiceRecord && dashboard.serviceTimeline ? (
            <ServiceTimeline
              description="User-facing service history built from roster, qualification, attendance, campaign, and audit signals."
              entries={dashboard.serviceTimeline}
              order="asc"
              title="Service timeline"
            />
          ) : (
            <Card className="border-border/80 bg-card/88">
              <CardHeader>
                <CardTitle>Service timeline</CardTitle>
                <CardDescription>
                  Human-readable service history stays permission-aware.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EmptyState
                  description="Service-record history is restricted for this viewer."
                  title="Timeline access restricted"
                />
              </CardContent>
            </Card>
          )}
            </div>
          </CollapsibleSection>
        </div>
        <div className="space-y-4">
          <MemberRecentActivityCard dashboard={dashboard} />
          <CollapsibleSection
            description="Permission-restricted notes and logs are available when reviewing the full record."
            title="Restricted notes and logs"
          >
            <div className="space-y-4">
              <MemberNotesCard dashboard={dashboard} />
              <MemberServiceLogsCard dashboard={dashboard} />
              <MemberAuditLogCard dashboard={dashboard} />
            </div>
          </CollapsibleSection>
        </div>
      </div>
    </div>
  );
}

export async function RosterPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const filters = {
    q: getSearchParamValue(resolvedSearchParams, "q"),
    unitId: getSearchParamValue(resolvedSearchParams, "unitId"),
    statusId: getSearchParamValue(resolvedSearchParams, "statusId"),
    positionId: getSearchParamValue(resolvedSearchParams, "positionId"),
  };
  const manageId = getSearchParamValue(resolvedSearchParams, "manage");
  const inspectId = getSearchParamValue(resolvedSearchParams, "inspect");
  const message = getSearchParamValue(resolvedSearchParams, "message");
  const error = getSearchParamValue(resolvedSearchParams, "error");

  const [rosterData, options, managedMember, inspectedMember] = await Promise.all([
    listRosterAssignments(filters),
    getPersonnelReferenceData(),
    manageId ? getMemberProfile(manageId) : Promise.resolve(null),
    inspectId ? getMemberProfileDashboardData(inspectId) : Promise.resolve(null),
  ]);

  const activeCount =
    rosterData.statusCounts.find((entry) => entry.label.toLowerCase() === "active")?.count ?? 0;
  const loaCount =
    rosterData.statusCounts.find((entry) => entry.label.toLowerCase() === "loa")?.count ?? 0;
  const inactiveCount = rosterData.statusCounts
    .filter((entry) => ["inactive", "reserve"].includes(entry.label.toLowerCase()))
    .reduce((total, entry) => total + entry.count, 0);

  const cleanHref = buildHref("/personnel/roster", resolvedSearchParams, {
    manage: undefined,
    inspect: undefined,
    message: undefined,
    error: undefined,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={["Personnel", "Roster"]}
        description="Roster management keeps unit, position, status, and optional rank actions inside one operational workspace."
        title="Roster"
      />
      {message ? <FlashNotice message={message} tone="success" /> : null}
      {error ? <FlashNotice message={error} tone="danger" /> : null}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          hint="Visible roster rows after filtering"
          label="Rostered"
          tone="success"
          trend="Primary assignments"
          value={String(rosterData.assignments.length)}
        />
        <KpiCard
          hint="Members on leave of absence"
          label="LOA"
          tone="warning"
          trend="Status tracked"
          value={String(loaCount)}
        />
        <DashboardWidget
          description="Members currently active"
          title="Active"
          tone="info"
          value={String(activeCount)}
        />
        <ReadinessCard
          hint="Reserve and inactive members needing leadership awareness"
          label="Inactive Risk"
          statusLabel="Watch list"
          value={String(inactiveCount)}
        />
      </section>
      {managedMember ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <ChangeStatusFormCard member={managedMember} options={options} returnTo={cleanHref} />
          <AssignUnitFormCard member={managedMember} options={options} returnTo={cleanHref} />
          <AssignPositionFormCard member={managedMember} options={options} returnTo={cleanHref} />
          <CollapsibleSection
            description="Ranks are optional for Spearhead and stay secondary to unit, billet, and status."
            title="Optional rank"
          >
            <ChangeRankFormCard member={managedMember} options={options} returnTo={cleanHref} />
          </CollapsibleSection>
        </div>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <CollapsibleSection
            defaultOpen={Boolean(filters.q || filters.unitId || filters.statusId || filters.positionId)}
            description="Search, unit, status, and billet filters stay available without dominating the roster workspace."
            title="Search and advanced filters"
          >
            <FiltersCard actionPath="/personnel/roster" filters={filters} options={options} />
          </CollapsibleSection>
          <Card className="border-border/80 bg-card/88">
            <CardHeader>
              <CardTitle>Roster workspace</CardTitle>
              <CardDescription>
                {formatCountLabel(rosterData.assignments.length, "assignment")} visible with the current filters.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rosterData.assignments.length === 0 ? (
                <EmptyState
                  description="No roster assignments matched the current filter set."
                  title="No roster rows"
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden lg:table-cell">Assignment Start</TableHead>
                      <TableHead className="hidden xl:table-cell">Last Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rosterData.assignments.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div>
                            <p className="font-semibold text-foreground">{member.displayName}</p>
                            <p className="text-xs text-muted-foreground">
                              {member.callsign ?? "No callsign"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {member.unit ? <UnitBadge label={member.unit.shortName} /> : "Unassigned"}
                        </TableCell>
                        <TableCell>{member.position?.title ?? "Unassigned"}</TableCell>
                        <TableCell>
                          <StatusBadge
                            label={member.status.label}
                            tone={getStatusTone(member.status.key)}
                          />
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">{formatDate(member.assignmentStartsAt)}</TableCell>
                        <TableCell className="hidden xl:table-cell">{formatDateTime(member.lastUpdatedAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button asChild size="sm" variant="outline">
                              <Link
                                href={buildHref("/personnel/roster", resolvedSearchParams, {
                                  inspect: member.id,
                                })}
                              >
                                Inspect
                              </Link>
                            </Button>
                            <Button asChild size="sm" variant="secondary">
                              <Link
                                href={buildHref("/personnel/roster", resolvedSearchParams, {
                                  manage: member.id,
                                })}
                              >
                                Manage
                              </Link>
                            </Button>
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
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Low-click management</CardTitle>
              <CardDescription>
                Open a row in manage mode to change unit, position, status, or optional rank without losing your filter context.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Inspector is for context.</p>
              <p>Manage is for action.</p>
              <p>Profile is for deeper record review.</p>
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Status mix</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {rosterData.statusCounts.map((entry) => (
                <div key={entry.statusId} className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{entry.label}</p>
                  <StatusBadge
                    label={String(entry.count)}
                    tone={getStatusTone(entry.label.toLowerCase())}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
      <MemberInspectorDrawer
        closeHref={buildHref("/personnel/roster", resolvedSearchParams, { inspect: undefined })}
        member={inspectedMember}
        open={Boolean(inspectedMember)}
      />
    </div>
  );
}

export async function QualificationsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  return <QualificationsCatalogPage searchParams={searchParams} />;
}
