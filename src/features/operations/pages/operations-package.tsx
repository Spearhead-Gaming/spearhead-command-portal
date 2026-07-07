import Link from "next/link";
import { notFound } from "next/navigation";

import { DashboardWidget } from "@/components/dashboard/dashboard-widget";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge, type BadgeTone } from "@/components/status/status-badge";
import { UnitBadge } from "@/components/status/unit-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  OperationsReleaseHistoryList,
  OperationsReleasePreviewCard,
  OperationsReleasePublishCard,
} from "@/features/operations/components/release";
import { GoNoGoBoard } from "@/features/operations/components/readiness";
import { formatDateTime } from "@/lib/formatters";
import {
  ensureOperationsPackageAction,
  updateOperationsPackagePlanningAction,
  updateUnitTaskingAction,
  updateWeeklyTaskingAction,
} from "@/server/operations-package/actions";
import { operationsPackageService } from "@/server/operations-package/service";
import type { OperationsPackageData } from "@/server/operations-package/types";

type SearchParamsValue = string | string[] | undefined;
type SearchParamsRecord = Record<string, SearchParamsValue>;

const fieldClassName =
  "flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const textareaClassName =
  "min-h-24 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const labelClassName = "text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground";

function getSearchParamValue(searchParams: SearchParamsRecord, key: string) {
  const value = searchParams[key];

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function getPlanningTone(status: string): BadgeTone {
  switch (status) {
    case "review":
      return "info";
    case "resources":
      return "warning";
    case "tasking":
      return "warning";
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

function HiddenPackageFields({
  campaignId,
  returnTo,
  weekNumber,
}: {
  campaignId: string;
  returnTo: string;
  weekNumber: number;
}) {
  return (
    <>
      <input name="campaignId" type="hidden" value={campaignId} />
      <input name="weekNumber" type="hidden" value={weekNumber} />
      <input name="returnTo" type="hidden" value={returnTo} />
    </>
  );
}

function PlanningForm({
  data,
  returnTo,
}: {
  data: OperationsPackageData;
  returnTo: string;
}) {
  return (
    <details className="group rounded-xl border border-border/70 bg-background/35 p-4">
      <summary className="cursor-pointer list-none text-sm font-semibold text-foreground">
        Edit planning information
      </summary>
      <form action={updateOperationsPackagePlanningAction} className="mt-4 space-y-4">
        <HiddenPackageFields campaignId={data.campaign.id} returnTo={returnTo} weekNumber={data.week.weekNumber} />
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClassName}>Planning Status</span>
            <select className={fieldClassName} defaultValue={data.week.planningStatus} name="planningStatus">
              <option value="planning">Planning</option>
              <option value="tasking">Tasking</option>
              <option value="resources">Resources</option>
              <option value="review">Review</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Weather</span>
            <input className={fieldClassName} defaultValue={data.week.weather ?? ""} name="weather" />
          </label>
        </div>
        <label className="block space-y-2">
          <span className={labelClassName}>Planning Notes</span>
          <textarea className={textareaClassName} defaultValue={data.week.planningNotes ?? ""} name="planningNotes" />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClassName}>Operational Objectives</span>
            <textarea className={textareaClassName} defaultValue={data.week.operationalObjectives ?? ""} name="operationalObjectives" />
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Planning Assumptions</span>
            <textarea className={textareaClassName} defaultValue={data.week.planningAssumptions ?? ""} name="planningAssumptions" />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClassName}>Friendly Situation</span>
            <textarea className={textareaClassName} defaultValue={data.week.friendlySituation ?? ""} name="friendlySituation" />
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Enemy Situation</span>
            <textarea className={textareaClassName} defaultValue={data.week.enemySituation ?? ""} name="enemySituation" />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClassName}>Intelligence Summary</span>
            <textarea className={textareaClassName} defaultValue={data.week.intelligenceSummary ?? ""} name="intelligenceSummary" />
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Logistics</span>
            <textarea className={textareaClassName} defaultValue={data.week.logistics ?? ""} name="logistics" />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClassName}>Special Instructions</span>
            <textarea className={textareaClassName} defaultValue={data.week.specialInstructions ?? ""} name="specialInstructions" />
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Operational Notes</span>
            <textarea className={textareaClassName} defaultValue={data.week.operationalNotes ?? ""} name="operationalNotes" />
          </label>
        </div>
        <label className="block space-y-2">
          <span className={labelClassName}>Reason</span>
          <textarea className={textareaClassName} name="reason" placeholder="Optional audit note" />
        </label>
        <Button type="submit">Save planning</Button>
      </form>
    </details>
  );
}

function WeeklyTaskingForm({
  data,
  returnTo,
}: {
  data: OperationsPackageData;
  returnTo: string;
}) {
  const tasking = data.weeklyTasking;

  return (
    <details className="group rounded-xl border border-border/70 bg-background/35 p-4">
      <summary className="cursor-pointer list-none text-sm font-semibold text-foreground">
        Edit weekly tasking
      </summary>
      <form action={updateWeeklyTaskingAction} className="mt-4 space-y-4">
        <HiddenPackageFields campaignId={data.campaign.id} returnTo={returnTo} weekNumber={data.week.weekNumber} />
        <label className="block space-y-2">
          <span className={labelClassName}>Operational Summary</span>
          <textarea className={textareaClassName} defaultValue={tasking?.operationalSummary ?? ""} name="operationalSummary" />
        </label>
        <label className="block space-y-2">
          <span className={labelClassName}>Commander&apos;s Intent</span>
          <textarea className={textareaClassName} defaultValue={tasking?.commandersIntent ?? ""} name="commandersIntent" />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClassName}>Friendly Situation</span>
            <textarea className={textareaClassName} defaultValue={tasking?.friendlySituation ?? ""} name="friendlySituation" />
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Enemy Situation</span>
            <textarea className={textareaClassName} defaultValue={tasking?.enemySituation ?? ""} name="enemySituation" />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClassName}>Intelligence Summary</span>
            <textarea className={textareaClassName} defaultValue={tasking?.intelligenceSummary ?? ""} name="intelligenceSummary" />
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Logistics</span>
            <textarea className={textareaClassName} defaultValue={tasking?.logisticsNotes ?? ""} name="logisticsNotes" />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClassName}>Weather</span>
            <input className={fieldClassName} defaultValue={tasking?.weather ?? ""} name="weather" />
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Timeline</span>
            <textarea className={textareaClassName} defaultValue={tasking?.timeline ?? ""} name="timeline" />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClassName}>Special Instructions</span>
            <textarea className={textareaClassName} defaultValue={tasking?.specialInstructions ?? ""} name="specialInstructions" />
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Operational Notes</span>
            <textarea className={textareaClassName} defaultValue={tasking?.operationalNotes ?? ""} name="operationalNotes" />
          </label>
        </div>
        <label className="block space-y-2">
          <span className={labelClassName}>Reason</span>
          <textarea className={textareaClassName} name="reason" placeholder="Optional audit note" />
        </label>
        <Button type="submit">Save weekly tasking</Button>
      </form>
    </details>
  );
}

function UnitTaskingEditor({
  returnTo,
  tasking,
}: {
  returnTo: string;
  tasking: OperationsPackageData["weeklyTasking"] extends infer T
    ? T extends { unitTaskings: Array<infer U> }
      ? U
      : never
    : never;
}) {
  return (
    <details className="rounded-xl border border-border/70 bg-background/45 p-4">
      <summary className="cursor-pointer list-none">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UnitBadge label={tasking.unitShortName} />
            <p className="text-sm font-semibold text-foreground">{tasking.unitName}</p>
          </div>
          <StatusBadge
            label={tasking.primaryObjective ? "Tasked" : "Pending"}
            tone={tasking.primaryObjective ? "success" : "warning"}
          />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {tasking.primaryObjective ?? "Primary objective pending"}
        </p>
      </summary>
      <form action={updateUnitTaskingAction} className="mt-4 space-y-4">
        <input name="unitTaskingId" type="hidden" value={tasking.id} />
        <input name="returnTo" type="hidden" value={returnTo} />
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClassName}>Primary Objective</span>
            <textarea className={textareaClassName} defaultValue={tasking.primaryObjective ?? ""} name="primaryObjective" />
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Secondary Objective</span>
            <textarea className={textareaClassName} defaultValue={tasking.secondaryObjective ?? ""} name="secondaryObjective" />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClassName}>Supporting Assets</span>
            <textarea className={textareaClassName} defaultValue={tasking.supportingAssets ?? ""} name="supportingAssets" />
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Special Equipment</span>
            <textarea className={textareaClassName} defaultValue={tasking.specialEquipment ?? ""} name="specialEquipment" />
          </label>
        </div>
        <label className="block space-y-2">
          <span className={labelClassName}>Special Instructions</span>
          <textarea className={textareaClassName} defaultValue={tasking.specialInstructions ?? ""} name="specialInstructions" />
        </label>
        <label className="block space-y-2">
          <span className={labelClassName}>Unit Notes</span>
          <textarea className={textareaClassName} defaultValue={tasking.unitNotes ?? ""} name="unitNotes" />
        </label>
        <label className="block space-y-2">
          <span className={labelClassName}>Reason</span>
          <textarea className={textareaClassName} name="reason" placeholder="Optional audit note" />
        </label>
        <Button type="submit" variant="outline">Save {tasking.unitShortName}</Button>
      </form>
    </details>
  );
}

function ResourceList({ data }: { data: OperationsPackageData }) {
  const conop = data.resources.find((resource) => resource.resourceType === "CONOP");
  const modPreset = data.resources.find((resource) => resource.resourceType === "ARMA3_PRESET");

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-border/70 bg-background/45 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-foreground">CONOP</p>
            <StatusBadge label={conop ? "Attached" : "Pending"} tone={conop ? "success" : "warning"} />
          </div>
          {conop?.currentVersion ? (
            <Button asChild className="mt-3" size="sm" variant="outline">
              <Link href={conop.currentVersion.downloadUrl ?? "#"}>Open CONOP</Link>
            </Button>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Attach a week-specific CONOP resource when available.</p>
          )}
        </div>
        <div className="rounded-xl border border-border/70 bg-background/45 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-foreground">Current Mod Preset</p>
            <StatusBadge label={modPreset ? "Available" : "Pending"} tone={modPreset ? "success" : "warning"} />
          </div>
          {modPreset?.currentVersion ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {modPreset.currentVersion.parsedName ?? modPreset.displayName} /{" "}
              {modPreset.currentVersion.parsedModCount !== null
                ? `${modPreset.currentVersion.parsedModCount} mods`
                : "Mod count pending"}{" "}
              / Uploaded {formatDateTime(modPreset.currentVersion.uploadedAt)}
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">The active Deployment preset will inherit into this package.</p>
          )}
        </div>
      </div>
      {data.resources.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {data.resources.map((resource) => (
            <div key={resource.id} className="rounded-xl border border-border/70 bg-background/45 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{resource.displayName}</p>
                  <p className="text-sm text-muted-foreground">{resource.resourceTypeLabel}</p>
                </div>
                <StatusBadge label={resource.eventId ? "Week override" : "Inherited"} tone={resource.eventId ? "info" : "muted"} />
              </div>
              {resource.currentVersion?.downloadUrl ? (
                <Button asChild className="mt-3" size="sm" variant="outline">
                  <Link href={resource.currentVersion.downloadUrl}>Open resource</Link>
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState description="Deployment resources will inherit here once added to the deployment or this week." title="No resources yet" />
      )}
    </div>
  );
}

export async function OperationsPackagePage({
  params,
  searchParams,
}: {
  params: Promise<{ campaignId: string; weekNumber: string }>;
  searchParams?: Promise<SearchParamsRecord>;
}) {
  const [{ campaignId, weekNumber }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({}),
  ]);
  const parsedWeekNumber = Number(weekNumber);
  const message = getSearchParamValue(resolvedSearchParams, "message");
  const error = getSearchParamValue(resolvedSearchParams, "error");
  const data = await operationsPackageService.getPackage({
    campaignId,
    weekNumber: parsedWeekNumber,
  });

  if (!data) {
    notFound();
  }

  const returnTo = `/operations/packages/${data.campaign.id}/week/${data.week.weekNumber}`;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={["Operations", "Planning", `Week ${data.week.weekNumber}`]}
        contextLabel={data.campaign.key}
        description="Planning-only Operations Package workspace for S3 and Deployment creators. Publishing and Discord delivery come later."
        title={`${data.campaign.title} / Week ${data.week.weekNumber}`}
      />
      {message ? <FlashNotice message={message} tone="success" /> : null}
      {error ? <FlashNotice message={error} tone="danger" /> : null}
      <Card className="overflow-hidden border-primary/20 bg-linear-to-br from-primary/12 via-card/88 to-background">
        <CardContent className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label="Operations Package" tone="info" />
              <StatusBadge label={data.week.planningStatus} tone={getPlanningTone(data.week.planningStatus)} />
              <StatusBadge label={`${data.completion.percent}% planned`} tone={data.completion.percent >= 75 ? "success" : "warning"} />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                {data.weekendOperation?.title ?? "Weekend Operation not linked"}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                {data.week.planningNotes ?? data.week.operationalObjectives ?? "Use this workspace to shape the weekly operation package before review or publication."}
              </p>
            </div>
          </div>
          <form action={ensureOperationsPackageAction} className="rounded-2xl border border-border/70 bg-background/50 p-4">
            <HiddenPackageFields campaignId={data.campaign.id} returnTo={returnTo} weekNumber={data.week.weekNumber} />
            <p className="text-sm font-semibold text-foreground">Package controls</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Ensure weekly tasking exists and all active units have a tasking row.
            </p>
            <Button className="mt-4 w-full" type="submit" variant="outline">
              Sync package structure
            </Button>
          </form>
        </CardContent>
      </Card>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard hint="Planning field completion" label="Planning" tone="info" value={`${data.completion.planningFieldsComplete}/${data.completion.planningFieldsTotal}`} />
        <DashboardWidget description="Active units with primary objectives" title="Unit Taskings" tone="warning" value={`${data.completion.unitTaskingsComplete}/${data.completion.unitTaskingsTotal}`} />
        <KpiCard hint="Weekend operation linked to this week" label="Operation" tone={data.completion.hasWeekendOperation ? "success" : "warning"} value={data.completion.hasWeekendOperation ? "Linked" : "Missing"} />
        <DashboardWidget description="CONOP and deployment resources are planning inputs only in 5A" title="Resources" tone={data.completion.hasResources ? "success" : "warning"} value={data.completion.hasConop ? "CONOP Ready" : "Pending"} />
      </section>
      {data.readiness ? <GoNoGoBoard packageHref={returnTo} readiness={data.readiness} /> : null}
      <section id="release" className="scroll-mt-6 space-y-4">
        <OperationsReleasePreviewCard data={data} />
        <OperationsReleasePublishCard data={data} returnTo={returnTo} />
        {data.release ? <OperationsReleaseHistoryList history={data.release.history.slice(0, 3)} /> : null}
        <Button asChild variant="outline">
          <Link href={`${returnTo}/releases`}>Open full release history</Link>
        </Button>
      </section>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Card id="overview" className="scroll-mt-6 border-border/80 bg-card/88">
            <CardHeader>
              <CardTitle>Overview</CardTitle>
              <CardDescription>Deployment, week, assigned Zeus, and Weekend Operation context.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-border/70 bg-background/45 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Deployment</p>
                <p className="mt-1 font-semibold text-foreground">{data.campaign.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{data.campaign.phase ?? "Phase not set"}</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/45 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Assigned Zeus</p>
                <p className="mt-1 font-semibold text-foreground">{data.campaign.zeusName ?? "Unassigned"}</p>
                <p className="mt-1 text-sm text-muted-foreground">{data.campaign.zeusAssignmentType}</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/45 p-4 md:col-span-2">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Weekend Operation</p>
                {data.weekendOperation ? (
                  <>
                    <p className="mt-1 font-semibold text-foreground">{data.weekendOperation.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatDateTime(data.weekendOperation.startsAt)}
                      {data.weekendOperation.endsAt ? ` to ${formatDateTime(data.weekendOperation.endsAt)}` : ""}
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">Create or link a Weekend Operation for this week.</p>
                )}
              </div>
            </CardContent>
          </Card>
          <Card id="planning" className="scroll-mt-6 border-border/80 bg-card/88">
            <CardHeader>
              <CardTitle>Planning</CardTitle>
              <CardDescription>Operational planning notes and situation context for this week.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-border/70 bg-background/45 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Objectives</p>
                  <p className="mt-2 text-sm leading-6 text-foreground">{data.week.operationalObjectives ?? "Objectives pending."}</p>
                </div>
                <div className="rounded-xl border border-border/70 bg-background/45 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Assumptions</p>
                  <p className="mt-2 text-sm leading-6 text-foreground">{data.week.planningAssumptions ?? "Assumptions pending."}</p>
                </div>
              </div>
              {data.permissions.canEditPlanning ? <PlanningForm data={data} returnTo={returnTo} /> : null}
            </CardContent>
          </Card>
          <Card id="tasking" className="scroll-mt-6 border-border/80 bg-card/88">
            <CardHeader>
              <CardTitle>Tasking</CardTitle>
              <CardDescription>Weekly Tasking and Unit Taskings for every active Spearhead unit.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.weeklyTasking ? (
                <div className="rounded-xl border border-border/70 bg-background/45 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Commander&apos;s Intent</p>
                  <p className="mt-2 text-sm leading-6 text-foreground">{data.weeklyTasking.commandersIntent ?? "Intent pending."}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">Timeline</p>
                  <p className="mt-2 text-sm leading-6 text-foreground">{data.weeklyTasking.timeline ?? "Timeline pending."}</p>
                </div>
              ) : (
                <EmptyState description="Link a Weekend Operation, then sync package structure to create weekly tasking." title="Weekly tasking pending" />
              )}
              {data.permissions.canManageTasking ? <WeeklyTaskingForm data={data} returnTo={returnTo} /> : null}
              {data.weeklyTasking?.unitTaskings.length ? (
                <div className="grid gap-3">
                  {data.weeklyTasking.unitTaskings.map((tasking) => (
                    <UnitTaskingEditor key={tasking.id} returnTo={returnTo} tasking={tasking} />
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
          <Card id="resources" className="scroll-mt-6 border-border/80 bg-card/88">
            <CardHeader>
              <CardTitle>Resources</CardTitle>
              <CardDescription>Inherited deployment resources and week-specific CONOP/resource overrides.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResourceList data={data} />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Attendance / RSVP</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.weekendOperation ? (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">RSVP Yes</p>
                    <StatusBadge label={String(data.weekendOperation.rsvpCounts.yes)} tone="success" />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Missing RSVP</p>
                    <StatusBadge label={String(data.weekendOperation.rsvpCounts.missing)} tone="warning" />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Present</p>
                    <StatusBadge label={String(data.weekendOperation.attendanceSummary.present)} tone="info" />
                  </div>
                </>
              ) : (
                <EmptyState description="Attendance appears after a Weekend Operation is linked." title="No operation linked" />
              )}
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Activity</CardTitle>
              <CardDescription>Planning history from audit-backed activity.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.activity.length > 0 ? (
                data.activity.map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-border/70 bg-background/45 p-3">
                    <p className="text-sm font-semibold text-foreground">{entry.summary}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {entry.action} / {entry.actorName ?? "System"} / {formatDateTime(entry.createdAt)}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState description="Planning activity will appear after package edits." title="No package activity" />
              )}
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Phase 5A Boundary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Publishing, Discord announcements, readiness scoring, and decision support are intentionally deferred.</p>
              <p>This workspace prepares the package so later Epic 5 phases can validate, preview, approve, and publish it.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
