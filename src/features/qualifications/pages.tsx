import Link from "next/link";

import { DashboardWidget } from "@/components/dashboard/dashboard-widget";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ReadinessCard } from "@/components/dashboard/readiness-card";
import { PageHeader } from "@/components/layout/page-header";
import { CollapsibleSection } from "@/components/layout/progressive-disclosure";
import { EmptyState } from "@/components/shared/empty-state";
import { QualificationBadge } from "@/components/status/qualification-badge";
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
import { formatCountLabel, formatDate } from "@/lib/formatters";
import { can } from "@/server/permissions/access";
import { getCurrentUser } from "@/server/auth/current-user";
import {
  AwardQualificationForm,
  ArchiveQualificationForm,
  CompleteQualificationSignoffForm,
  CreateQualificationForm,
  EditQualificationForm,
  ManageRequirementsForm,
  QualificationFormShell,
  RevokeQualificationForm,
  UpdateQualificationRecordForm,
} from "@/features/qualifications/components/qualification-forms";
import { QueryInspectorDrawer } from "@/features/qualifications/components/query-inspector-drawer";
import {
  getQualificationDashboardSummary,
  getQualificationDetail,
  getQualificationMatrixData,
  getQualificationRecordDetail,
  getQualificationReferenceData,
  listPendingQualificationSignoffs,
  listQualificationCategories,
  listQualifications,
} from "@/server/qualifications";

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

function getQualificationTone(status: string): BadgeTone {
  switch (status) {
    case "pending_signoff":
      return "warning";
    case "qualified":
      return "success";
    case "expired":
      return "warning";
    case "revoked":
      return "danger";
    case "missing":
      return "warning";
    default:
      return "muted";
  }
}

function getRequirementScopeLabel(
  requirement: {
    position: {
      title: string;
      unitShortName: string;
    } | null;
    unit: {
      name: string;
    } | null;
  },
) {
  if (requirement.position) {
    return `${requirement.position.title} (${requirement.position.unitShortName})`;
  }

  if (requirement.unit) {
    return requirement.unit.name;
  }

  return "General requirement";
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

function CatalogFilters({
  categories,
  q,
  categoryId,
  state,
}: {
  categories: Awaited<ReturnType<typeof getQualificationReferenceData>>["categories"];
  q?: string;
  categoryId?: string;
  state?: string;
}) {
  const fieldClassName =
    "flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

  return (
    <Card className="border-border/80 bg-card/82">
      <CardHeader>
        <CardTitle>Catalog filters</CardTitle>
        <CardDescription>
          Search qualifications, filter by category, and flip between active and archived states.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action="/personnel/qualifications" className="grid gap-4 md:grid-cols-3" method="get">
          <input className={fieldClassName} defaultValue={q ?? ""} name="q" placeholder="Search label, key, or description" />
          <select className={fieldClassName} defaultValue={categoryId ?? ""} name="categoryId">
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
          <div className="flex gap-3">
            <select className={fieldClassName} defaultValue={state ?? "active"} name="state">
              <option value="active">Active only</option>
              <option value="archived">Archived only</option>
              <option value="all">All states</option>
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

function MatrixFilters({
  referenceData,
  q,
  unitId,
  positionId,
  categoryId,
  readiness,
}: {
  referenceData: Awaited<ReturnType<typeof getQualificationReferenceData>>;
  q?: string;
  unitId?: string;
  positionId?: string;
  categoryId?: string;
  readiness?: string;
}) {
  const fieldClassName =
    "flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

  return (
    <Card className="border-border/80 bg-card/82">
      <CardHeader>
        <CardTitle>Matrix filters</CardTitle>
        <CardDescription>
          Narrow the readiness grid by unit, position, category, or only show members with missing, expired, or expiring qualifications.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action="/training/qualification-matrix" className="grid gap-4 md:grid-cols-3 xl:grid-cols-6" method="get">
          <input className={fieldClassName} defaultValue={q ?? ""} name="q" placeholder="Search member or callsign" />
          <select className={fieldClassName} defaultValue={unitId ?? ""} name="unitId">
            <option value="">All units</option>
            {referenceData.units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.label}
              </option>
            ))}
          </select>
          <select className={fieldClassName} defaultValue={positionId ?? ""} name="positionId">
            <option value="">All positions</option>
            {referenceData.positions.map((position) => (
              <option key={position.id} value={position.id}>
                {position.label}
              </option>
            ))}
          </select>
          <select className={fieldClassName} defaultValue={categoryId ?? ""} name="categoryId">
            <option value="">All categories</option>
            {referenceData.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
          <select className={fieldClassName} defaultValue={readiness ?? ""} name="readiness">
            <option value="">All readiness states</option>
            <option value="missing">Missing required only</option>
            <option value="expired">Expired only</option>
            <option value="expiring">Expiring soon only</option>
          </select>
          <Button type="submit" variant="outline">
            Apply
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export async function QualificationsCatalogPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const q = getSearchParamValue(resolvedSearchParams, "q");
  const categoryId = getSearchParamValue(resolvedSearchParams, "categoryId");
  const state = getSearchParamValue(resolvedSearchParams, "state") ?? "active";
  const panel = getSearchParamValue(resolvedSearchParams, "panel");
  const inspectId = getSearchParamValue(resolvedSearchParams, "inspect");
  const message = getSearchParamValue(resolvedSearchParams, "message");
  const error = getSearchParamValue(resolvedSearchParams, "error");

  const [referenceData, categories, catalogData, selectedQualification, dashboardSummary, user] =
    await Promise.all([
    getQualificationReferenceData(),
    listQualificationCategories(),
    listQualifications({
      q,
      categoryId,
      state: state === "archived" || state === "all" ? state : "active",
    }),
    inspectId ? getQualificationDetail(inspectId) : Promise.resolve(null),
    getQualificationDashboardSummary(),
    getCurrentUser(),
    ]);

  const canCreate = user ? can(user, "qualifications.create") : false;
  const canEdit = user ? can(user, "qualifications.edit") : false;
  const canArchive = user ? can(user, "qualifications.archive") : false;
  const canManageRequirements = user ? can(user, "qualifications.requirements.manage") : false;
  const canManageSignoff = user ? can(user, "qualifications.signoff.manage") : false;
  const pendingSignoffs = canManageSignoff ? await listPendingQualificationSignoffs(6) : [];
  const cleanHref = buildHref("/personnel/qualifications", resolvedSearchParams, {
    inspect: undefined,
    panel: undefined,
    message: undefined,
    error: undefined,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={["Personnel", "Qualifications"]}
        description="Qualification catalog and requirement mapping built on the live database foundation."
        title="Qualifications Catalog"
      />
      <Card className="border-border/80 bg-card/72">
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Catalog controls</p>
            <p className="text-sm text-muted-foreground">
              Keep qualification definitions and requirement mapping close together so readiness stays understandable.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {canCreate ? (
              <Button asChild>
                <Link href={buildHref("/personnel/qualifications", resolvedSearchParams, { panel: "create" })}>
                  Create qualification
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href="/training/qualification-matrix">Open matrix</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
      {message ? <FlashNotice message={message} tone="success" /> : null}
      {error ? <FlashNotice message={error} tone="danger" /> : null}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          hint="Configured qualification categories"
          label="Categories"
          tone="info"
          trend="Seed-backed"
          value={String(categories.length)}
        />
        <KpiCard
          hint="Visible qualifications"
          label="Qualifications"
          tone="success"
          trend="Catalog live"
          value={String(dashboardSummary.catalogCount)}
        />
        <DashboardWidget
          description="Archived qualifications hidden from the active catalog"
          title="Archived"
          tone="warning"
          value={String(dashboardSummary.archivedCount)}
        />
        <ReadinessCard
          hint="Unit and position mappings"
          label="Requirements"
          statusLabel="Requirement mapping"
          value={String(dashboardSummary.requiredMappingsCount)}
        />
      </section>
      {panel === "create" && canCreate ? (
        <QualificationFormShell
          description="Create a new qualification definition before awarding it to members or mapping it as a requirement."
          title="Create qualification"
        >
          <CreateQualificationForm categories={referenceData.categories} returnTo={cleanHref} />
        </QualificationFormShell>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <CollapsibleSection
            defaultOpen={Boolean(q || categoryId || (state && state !== "active"))}
            description="Catalog search and archive/category filters stay available without taking over the qualification workspace."
            title="Search and advanced filters"
          >
            <CatalogFilters categories={referenceData.categories} categoryId={categoryId} q={q} state={state} />
          </CollapsibleSection>
          {catalogData.qualifications.length === 0 ? (
            <EmptyState
              actionLabel={canCreate ? "Create First Qualification" : undefined}
              description="No qualifications matched the current catalog filters."
              title="No qualifications found"
            />
          ) : (
            catalogData.groupedQualifications.map((group) => (
              <Card key={group.categoryLabel} className="border-border/80 bg-card/88">
                <CardHeader>
                  <CardTitle>{group.categoryLabel}</CardTitle>
                  <CardDescription>
                    {formatCountLabel(group.items.length, "qualification")} in this category.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {group.items.map((qualification) => (
                      <div
                        key={qualification.id}
                        className="flex flex-col gap-4 rounded-xl border border-border/70 bg-background/45 p-4 lg:flex-row lg:items-center lg:justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-foreground">{qualification.label}</p>
                            <StatusBadge label={qualification.key.toUpperCase()} tone="muted" />
                            <QualificationBadge label={qualification.category.label} />
                            <StatusBadge
                              label={qualification.isActive ? "Active" : "Archived"}
                              tone={qualification.isActive ? "success" : "muted"}
                            />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {qualification.description ?? "No qualification description yet."}
                          </p>
                          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                            {qualification.expiresAfterDays
                              ? `Expires after ${qualification.expiresAfterDays} days`
                              : "No expiration window"}{" "}
                            | {qualification.awardedCount} record(s) | {qualification.requirementCount} mapping(s)
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <Button asChild size="sm" variant="outline">
                            <Link href={buildHref("/personnel/qualifications", resolvedSearchParams, { inspect: qualification.id })}>
                              Inspect
                            </Link>
                          </Button>
                          <Button asChild size="sm" variant="ghost">
                            <Link href={`/training/qualification-matrix?qualificationId=${qualification.id}`}>
                              Matrix view
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
        <div className="space-y-4">
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Category readiness</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{category.label}</p>
                  <StatusBadge label={String(category.qualificationCount)} tone="info" />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Catalog signals</CardTitle>
              <CardDescription>
                Follow-up work that affects operational readiness.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Pending sign-off</p>
                <StatusBadge label={String(dashboardSummary.pendingSignoffCount)} tone="warning" />
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Expiring soon</p>
                <StatusBadge label={String(dashboardSummary.expiringSoonCount)} tone="warning" />
              </div>
            </CardContent>
          </Card>
          {canManageSignoff ? (
            <Card className="border-border/80 bg-card/82">
              <CardHeader>
                <CardTitle>Pending sign-off queue</CardTitle>
                <CardDescription>
                  Instructor review items kept attached to the catalog workspace.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingSignoffs.length > 0 ? (
                  pendingSignoffs.map((entry) => (
                    <Link
                      key={entry.recordId}
                      className="block rounded-xl border border-border/70 bg-background/45 p-3 transition-colors hover:bg-card/80"
                      href={`/training/qualification-matrix?memberProfileId=${entry.memberProfileId}&qualificationId=${entry.qualificationId}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-foreground">{entry.qualificationLabel}</p>
                        <StatusBadge label="Pending" tone="warning" />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {entry.memberDisplayName}
                        {entry.unitShortName ? ` / ${entry.unitShortName}` : ""}
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Awarded {formatDate(entry.awardedAt)}
                      </p>
                    </Link>
                  ))
                ) : (
                  <EmptyState
                    description="No qualification records are currently waiting on sign-off review."
                    title="Queue clear"
                  />
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
      {selectedQualification ? (
        <QueryInspectorDrawer
          closeHref={buildHref("/personnel/qualifications", resolvedSearchParams, { inspect: undefined, panel: undefined })}
          open
          sections={[]}
          statusBadge={{
            label: selectedQualification.isActive ? "Active" : "Archived",
            tone: selectedQualification.isActive ? "success" : "muted",
          }}
          subtitle={selectedQualification.description ?? "Qualification detail and requirement mapping."}
          tabPanels={[
            {
              label: "Overview",
              content: (
                <div className="space-y-4">
                  <Card className="border-border/70 bg-background/45">
                    <CardContent className="grid gap-4 p-4 md:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Qualification key
                        </p>
                        <p className="mt-1 text-sm text-foreground">{selectedQualification.key}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Expiration
                        </p>
                        <p className="mt-1 text-sm text-foreground">
                          {selectedQualification.expiresAfterDays
                            ? `${selectedQualification.expiresAfterDays} day lifecycle`
                            : "No automatic expiration"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Qualified members
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-foreground">
                          {selectedQualification.membersQualifiedCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Pending sign-off
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-foreground">
                          {selectedQualification.membersPendingSignoffCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Missing required
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-foreground">
                          {selectedQualification.membersMissingRequiredCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Expiring soon
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-foreground">
                          {selectedQualification.expiringSoonCount}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-border/70 bg-background/45">
                    <CardHeader>
                      <CardTitle>Coverage</CardTitle>
                      <CardDescription>
                        Units and positions currently touched by this qualification.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {selectedQualification.affectedUnits.length > 0 ? (
                          selectedQualification.affectedUnits.map((unit) => (
                            <UnitBadge key={unit.id} label={unit.shortName} />
                          ))
                        ) : (
                          <StatusBadge label="No unit mappings" tone="muted" />
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedQualification.affectedPositions.length > 0 ? (
                          selectedQualification.affectedPositions.map((position) => (
                            <StatusBadge
                              key={position.id}
                              label={`${position.title} (${position.unitShortName})`}
                              tone="info"
                            />
                          ))
                        ) : (
                          <StatusBadge label="No position mappings" tone="muted" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ),
            },
            {
              label: "Requirements",
              content: selectedQualification.requirements.length > 0 ? (
                <div className="space-y-3">
                  {selectedQualification.requirements.map((requirement) => (
                    <Card key={requirement.id} className="border-border/70 bg-background/45">
                      <CardContent className="space-y-3 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-foreground">
                            {getRequirementScopeLabel(requirement)}
                          </p>
                          <StatusBadge
                            label={requirement.isRequired ? "Required" : "Recommended"}
                            tone={requirement.isRequired ? "warning" : "info"}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {requirement.notes ??
                            (requirement.isRequired
                              ? "This qualification is required for the mapped scope."
                              : "This qualification is recommended for the mapped scope.")}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <EmptyState
                  description="No unit or position requirements are mapped to this qualification yet."
                  title="No requirement mappings"
                />
              ),
            },
            {
              label: "Members",
              content: selectedQualification.memberPreview.length > 0 ? (
                <div className="space-y-3">
                  {selectedQualification.memberPreview.map((entry) => (
                    <Card key={entry.memberProfileId} className="border-border/70 bg-background/45">
                      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold text-foreground">{entry.displayName}</p>
                          <p className="text-sm text-muted-foreground">
                            {[entry.unitShortName, entry.positionTitle].filter(Boolean).join(" / ") || "No current assignment"}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge
                            label={entry.statusLabel}
                            tone={getQualificationTone(entry.status)}
                          />
                          {entry.isExpiringSoon ? (
                            <StatusBadge label="Expiring Soon" tone="warning" />
                          ) : null}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <EmptyState
                  description="No member qualification records are attached yet."
                  title="No member records"
                />
              ),
            },
            {
              label: "Activity",
              content: selectedQualification.recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {selectedQualification.recentActivity.map((entry) => (
                    <Card key={entry.id} className="border-border/70 bg-background/45">
                      <CardContent className="space-y-2 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-foreground">{entry.title}</p>
                          {entry.badgeLabel ? (
                            <StatusBadge label={entry.badgeLabel} tone={entry.badgeTone} />
                          ) : null}
                        </div>
                        <p className="text-sm text-muted-foreground">{entry.description}</p>
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          {formatDate(entry.timestamp)}
                          {entry.actorDisplayName ? ` / ${entry.actorDisplayName}` : ""}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <EmptyState
                  description="Catalog and requirement activity will appear here as the qualification is used."
                  title="No recent activity"
                />
              ),
            },
            {
              label: "Settings",
              content: (
                <Card className="border-border/70 bg-background/45">
                  <CardContent className="space-y-3 p-4">
                    <p className="text-sm text-muted-foreground">
                      Award this qualification from member profile and matrix workflows. Requirement changes immediately affect readiness views.
                    </p>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Created {formatDate(selectedQualification.createdAt)} / Updated {formatDate(selectedQualification.updatedAt)}
                    </p>
                  </CardContent>
                </Card>
              ),
            },
          ]}
          title={selectedQualification.label}
        >
          <div className="space-y-4">
            {panel === "edit" && canEdit ? (
              <QualificationFormShell
                description="Update the qualification definition and expiration behavior."
                title="Edit qualification"
              >
                <EditQualificationForm
                  categories={referenceData.categories}
                  qualification={selectedQualification}
                  returnTo={cleanHref}
                />
                {selectedQualification.isActive && canArchive ? (
                  <div className="pt-2">
                    <ArchiveQualificationForm
                      qualificationId={selectedQualification.id}
                      returnTo={cleanHref}
                    />
                  </div>
                ) : null}
              </QualificationFormShell>
            ) : null}
            {panel === "requirements" && canManageRequirements ? (
              <QualificationFormShell
                description="Map this qualification to units or positions that require it."
                title="Manage requirements"
              >
                <ManageRequirementsForm
                  qualification={selectedQualification}
                  referenceData={referenceData}
                  returnTo={cleanHref}
                />
              </QualificationFormShell>
            ) : (
              <Card className="border-border/70 bg-background/55">
                <CardContent className="flex flex-wrap gap-3 p-4">
                  {canEdit ? (
                    <Button asChild>
                      <Link href={buildHref("/personnel/qualifications", resolvedSearchParams, { panel: "edit" })}>
                        Edit qualification
                      </Link>
                    </Button>
                  ) : null}
                  {canManageRequirements ? (
                    <Button asChild variant="outline">
                      <Link href={buildHref("/personnel/qualifications", resolvedSearchParams, { panel: "requirements" })}>
                        Manage requirements
                      </Link>
                    </Button>
                  ) : null}
                  <Button asChild variant="ghost">
                    <Link href="/training/qualification-matrix">Open qualification matrix</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </QueryInspectorDrawer>
      ) : null}
    </div>
  );
}

export async function QualificationMatrixFoundationPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const q = getSearchParamValue(resolvedSearchParams, "q");
  const unitId = getSearchParamValue(resolvedSearchParams, "unitId");
  const positionId = getSearchParamValue(resolvedSearchParams, "positionId");
  const categoryId = getSearchParamValue(resolvedSearchParams, "categoryId");
  const readiness = getSearchParamValue(resolvedSearchParams, "readiness") ?? "";
  const memberProfileId = getSearchParamValue(resolvedSearchParams, "memberProfileId");
  const qualificationId = getSearchParamValue(resolvedSearchParams, "qualificationId");
  const panel = getSearchParamValue(resolvedSearchParams, "panel");
  const message = getSearchParamValue(resolvedSearchParams, "message");
  const error = getSearchParamValue(resolvedSearchParams, "error");

  const [referenceData, matrixData, recordDetail, user] = await Promise.all([
    getQualificationReferenceData(),
    getQualificationMatrixData({
      q,
      unitId,
      positionId,
      categoryId,
      readiness: readiness === "missing" || readiness === "expired" || readiness === "expiring" ? readiness : "",
    }),
    memberProfileId && qualificationId
      ? getQualificationRecordDetail({ memberProfileId, qualificationId })
      : Promise.resolve(null),
    getCurrentUser(),
  ]);

  const canAward = user ? can(user, "qualifications.record.award") : false;
  const canEditRecord = user ? can(user, "qualifications.record.edit") : false;
  const canRevoke = user ? can(user, "qualifications.record.revoke") : false;
  const canManageRequirements = user ? can(user, "qualifications.requirements.manage") : false;
  const cleanHref = buildHref("/training/qualification-matrix", resolvedSearchParams, {
    memberProfileId: undefined,
    qualificationId: undefined,
    panel: undefined,
    message: undefined,
    error: undefined,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={["Training", "Qualification Matrix"]}
        description="Compact readiness grid for member qualifications, missing requirements, and expiring certifications."
        title="Qualification Matrix"
      />
      <Card className="border-border/80 bg-card/72">
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Matrix controls</p>
            <p className="text-sm text-muted-foreground">
              Use filters to narrow the grid, then open a cell drawer to award, edit, or revoke the selected record.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {canAward ? (
              <Button asChild>
                <Link href={buildHref("/training/qualification-matrix", resolvedSearchParams, { panel: "award" })}>
                  Award qualification
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href="/personnel/qualifications">Open catalog</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
      {message ? <FlashNotice message={message} tone="success" /> : null}
      {error ? <FlashNotice message={error} tone="danger" /> : null}
      {panel === "award" && canAward ? (
        <QualificationFormShell
          description="Award a qualification directly from the matrix workspace."
          title="Award qualification"
        >
          <AwardQualificationForm referenceData={referenceData} returnTo={cleanHref} />
        </QualificationFormShell>
      ) : null}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          hint="Members visible after filters"
          label="Tracked Members"
          tone="info"
          trend="Matrix scoped"
          value={String(matrixData.summary.trackedMembers)}
        />
        <DashboardWidget
          description="Displayed qualification columns"
          title="Displayed Qualifications"
          tone="success"
          value={String(matrixData.summary.displayedQualifications)}
        />
        <KpiCard
          hint="Qualifications nearing expiration"
          label="Expiring Soon"
          tone="warning"
          trend="Time-based"
          value={String(matrixData.summary.expiringSoonCount)}
        />
        <ReadinessCard
          hint="Required qualifications currently missing"
          label="Missing Required"
          statusLabel="Needs training"
          value={String(matrixData.summary.missingRequiredCount)}
        />
      </section>
      <CollapsibleSection
        defaultOpen={Boolean(q || unitId || positionId || categoryId || readiness)}
        description="The matrix should default to a scoped readiness answer; expand filters when you need a narrower unit, position, category, or exception view."
        title="Matrix filters"
      >
        <MatrixFilters
          categoryId={categoryId}
          positionId={positionId}
          q={q}
          readiness={readiness}
          referenceData={referenceData}
          unitId={unitId}
        />
      </CollapsibleSection>
      <Card className="border-border/80 bg-card/88">
        <CardHeader>
          <CardTitle>Matrix</CardTitle>
          <CardDescription>
            {formatCountLabel(matrixData.rows.length, "member")} and {formatCountLabel(matrixData.columns.length, "qualification")} in the current view.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {matrixData.rows.length === 0 || matrixData.columns.length === 0 ? (
            <EmptyState
              description="No qualification rows or columns matched the current filters."
              title="Nothing to display"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                  <TableHead className="sticky left-0 z-20 min-w-56 bg-card/95 backdrop-blur">Member</TableHead>
                  {matrixData.columns.map((column) => (
                    <TableHead key={column.qualificationId}>
                      <div className="space-y-1">
                        <p>{column.shortLabel}</p>
                        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                          {column.categoryLabel}
                        </p>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {matrixData.rows.map((row) => (
                  <TableRow key={row.memberProfileId}>
                    <TableCell className="sticky left-0 z-10 min-w-56 bg-card/95 backdrop-blur">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{row.memberDisplayName}</p>
                        <p className="text-xs text-muted-foreground">
                          {[row.unitShortName, row.positionTitle]
                            .filter(Boolean)
                            .join(" / ")}
                        </p>
                      </div>
                    </TableCell>
                    {row.cells.map((cell) => (
                      <TableCell key={`${row.memberProfileId}-${cell.qualificationId}`}>
                        <Link
                          className={`inline-flex min-w-16 items-center justify-center rounded-lg border px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] transition-colors ${
                            cell.status === "qualified"
                              ? cell.isExpiringSoon
                                ? "border-warning/35 bg-warning/10 text-warning"
                                : "border-success/35 bg-success/10 text-success"
                              : cell.status === "pending_signoff"
                                ? "border-warning/35 bg-warning/10 text-warning"
                                : cell.status === "expired"
                                  ? "border-warning/35 bg-warning/10 text-warning"
                                  : cell.status === "revoked"
                                    ? "border-danger/35 bg-danger/10 text-danger"
                                    : cell.status === "missing"
                                      ? "border-warning/35 bg-warning/10 text-warning"
                                      : cell.isRecommended
                                        ? "border-primary/30 bg-primary/10 text-primary"
                                        : "border-border/70 bg-background/45 text-muted-foreground"
                          }`}
                          href={buildHref("/training/qualification-matrix", resolvedSearchParams, {
                            memberProfileId: row.memberProfileId,
                            qualificationId: cell.qualificationId,
                          })}
                          title={cell.summary}
                        >
                          {cell.status === "qualified"
                            ? cell.isExpiringSoon
                              ? "Soon"
                              : "Yes"
                            : cell.status === "pending_signoff"
                              ? "Pend"
                            : cell.status === "expired"
                              ? "Exp"
                              : cell.status === "revoked"
                                ? "Rev"
                                : cell.status === "missing"
                                  ? "Need"
                                  : cell.isRecommended
                                    ? "Rec"
                                  : "N/A"}
                        </Link>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      {recordDetail ? (
        <QueryInspectorDrawer
          closeHref={buildHref("/training/qualification-matrix", resolvedSearchParams, {
            memberProfileId: undefined,
            qualificationId: undefined,
            panel: undefined,
          })}
          open
          sections={[]}
          statusBadge={{
            label:
              recordDetail.record?.statusLabel ??
              (recordDetail.isRequired
                ? "Missing Required"
                : recordDetail.isRecommended
                  ? "Recommended"
                  : "Not Required"),
            tone: recordDetail.record
              ? getQualificationTone(recordDetail.record.status)
              : recordDetail.isRequired
                ? "warning"
                : recordDetail.isRecommended
                  ? "info"
                  : "muted",
          }}
          subtitle={`${recordDetail.memberDisplayName} / ${recordDetail.categoryLabel}`}
          tabPanels={[
            {
              label: "Overview",
              content: (
                <div className="space-y-4">
                  <Card className="border-border/70 bg-background/45">
                    <CardContent className="grid gap-4 p-4 md:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Member</p>
                        <p className="mt-1 text-sm text-foreground">{recordDetail.memberDisplayName}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Assignment</p>
                        <p className="mt-1 text-sm text-foreground">
                          {[recordDetail.memberUnitShortName, recordDetail.memberPositionTitle].filter(Boolean).join(" / ") || "No current assignment"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Qualification</p>
                        <p className="mt-1 text-sm text-foreground">
                          {recordDetail.qualificationLabel} ({recordDetail.qualificationAbbreviation})
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Requirement state</p>
                        <p className="mt-1 text-sm text-foreground">
                          {recordDetail.isRequired
                            ? "Required"
                            : recordDetail.isRecommended
                              ? "Recommended"
                              : "Not mapped"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-border/70 bg-background/45">
                    <CardContent className="space-y-3 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <QualificationBadge label={recordDetail.categoryLabel} />
                        {recordDetail.requiredBy.length > 0 ? (
                          recordDetail.requiredBy.map((entry) => (
                            <UnitBadge key={entry} label={entry} />
                          ))
                        ) : (
                          <StatusBadge label="No mapped scope" tone="muted" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {recordDetail.record
                          ? `${recordDetail.record.statusLabel} record awarded ${formatDate(recordDetail.record.awardedAt)}.`
                          : "This member does not currently have a qualification record for this cell."}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ),
            },
            {
              label: "Requirements",
              content: (
                <Card className="border-border/70 bg-background/45">
                  <CardContent className="space-y-3 p-4">
                    <p className="text-sm text-muted-foreground">
                      {recordDetail.requiredBy.length > 0
                        ? recordDetail.requiredBy.join(", ")
                        : "This qualification is not currently mapped to the member's unit or position."}
                    </p>
                    <StatusBadge
                      label={
                        recordDetail.isRequired
                          ? "Required"
                          : recordDetail.isRecommended
                            ? "Recommended"
                            : "Not required"
                      }
                      tone={
                        recordDetail.isRequired
                          ? "warning"
                          : recordDetail.isRecommended
                            ? "info"
                            : "muted"
                      }
                    />
                  </CardContent>
                </Card>
              ),
            },
            {
              label: "Activity",
              content: recordDetail.activity.length > 0 ? (
                <div className="space-y-3">
                  {recordDetail.activity.map((entry) => (
                    <Card key={entry.id} className="border-border/70 bg-background/45">
                      <CardContent className="space-y-2 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-foreground">{entry.title}</p>
                          {entry.badgeLabel ? <StatusBadge label={entry.badgeLabel} tone={entry.badgeTone} /> : null}
                        </div>
                        <p className="text-sm text-muted-foreground">{entry.description}</p>
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          {formatDate(entry.timestamp)}
                          {entry.actorDisplayName ? ` / ${entry.actorDisplayName}` : ""}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <EmptyState
                  description="Award, revoke, and requirement activity will appear here once changes are made."
                  title="No record activity"
                />
              ),
            },
            {
              label: "Workflow",
              content: (
                <Card className="border-border/70 bg-background/45">
                  <CardContent className="space-y-3 p-4">
                    <p className="text-sm text-muted-foreground">
                      Keep qualification actions close to the matrix so staff can inspect, update, and sign off records without losing roster context.
                    </p>
                    {recordDetail.record?.expiresAt ? (
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Expires {formatDate(recordDetail.record.expiresAt)}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              ),
            },
          ]}
          title={recordDetail.qualificationLabel}
        >
          <div className="space-y-4">
            {panel === "award" && canAward ? (
              <QualificationFormShell
                description="Award or renew the selected qualification for this member."
                title="Award qualification"
              >
                <AwardQualificationForm
                  memberProfileId={recordDetail.memberProfileId}
                  qualificationId={recordDetail.qualificationId}
                  referenceData={referenceData}
                  returnTo={cleanHref}
                />
              </QualificationFormShell>
            ) : null}
            {panel === "edit" && recordDetail.record && canEditRecord ? (
              <QualificationFormShell
                description="Update dates or notes on the selected qualification record."
                title="Edit qualification record"
              >
                <UpdateQualificationRecordForm detail={recordDetail} returnTo={cleanHref} />
              </QualificationFormShell>
            ) : null}
            {panel === "signoff" && recordDetail.record && recordDetail.canSignOff ? (
              <QualificationFormShell
                description="Complete instructor sign-off while preserving the audit trail."
                title="Complete sign-off"
              >
                <CompleteQualificationSignoffForm detail={recordDetail} returnTo={cleanHref} />
              </QualificationFormShell>
            ) : null}
            {panel === "revoke" && recordDetail.record && canRevoke ? (
              <QualificationFormShell
                description="Revoke the selected qualification while preserving the audit trail."
                title="Revoke qualification"
              >
                <RevokeQualificationForm detail={recordDetail} returnTo={cleanHref} />
              </QualificationFormShell>
            ) : null}
            {panel === "requirements" && canManageRequirements ? (
              <Card className="border-border/80 bg-card/92">
                <CardHeader>
                  <CardTitle>Requirement management</CardTitle>
                  <CardDescription>
                    Requirements are edited from the qualification catalog so definitions stay centralized.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild>
                    <Link href={`/personnel/qualifications?inspect=${recordDetail.qualificationId}&panel=requirements`}>
                      Open requirement mapping
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/70 bg-background/55">
                <CardContent className="flex flex-wrap gap-3 p-4">
                  {canAward ? (
                    <Button asChild>
                      <Link href={buildHref("/training/qualification-matrix", resolvedSearchParams, { panel: "award" })}>
                        {recordDetail.record ? "Renew or re-award" : "Award qualification"}
                      </Link>
                    </Button>
                  ) : null}
                  {recordDetail.record && canEditRecord ? (
                    <Button asChild variant="outline">
                      <Link href={buildHref("/training/qualification-matrix", resolvedSearchParams, { panel: "edit" })}>
                        Edit record
                      </Link>
                    </Button>
                  ) : null}
                  {recordDetail.record && recordDetail.canSignOff ? (
                    <Button asChild variant="outline">
                      <Link href={buildHref("/training/qualification-matrix", resolvedSearchParams, { panel: "signoff" })}>
                        Complete sign-off
                      </Link>
                    </Button>
                  ) : null}
                  {recordDetail.record && canRevoke ? (
                    <Button asChild variant="outline">
                      <Link href={buildHref("/training/qualification-matrix", resolvedSearchParams, { panel: "revoke" })}>
                        Revoke
                      </Link>
                    </Button>
                  ) : null}
                  {canManageRequirements ? (
                    <Button asChild variant="ghost">
                      <Link href={buildHref("/training/qualification-matrix", resolvedSearchParams, { panel: "requirements" })}>
                        Manage requirements
                      </Link>
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            )}
          </div>
        </QueryInspectorDrawer>
      ) : null}
    </div>
  );
}
