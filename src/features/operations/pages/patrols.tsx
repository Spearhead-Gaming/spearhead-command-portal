import Link from "next/link";
import { Clock, Crosshair, FileText, RadioTower } from "lucide-react";

import { DashboardWidget } from "@/components/dashboard/dashboard-widget";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge, type BadgeTone } from "@/components/status/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/formatters";
import {
  AddPatrolParticipantForm,
  CompletePatrolForm,
  RecordPatrolInterestForm,
  RemovePatrolParticipantForm,
  StartPatrolForm,
} from "@/features/operations/components/patrol-forms";
import { PatrolInspectorShell } from "@/features/operations/components/patrol-inspector-shell";
import { getCurrentUser } from "@/server/auth/current-user";
import { can } from "@/server/permissions/access";
import { getPatrolReferenceData, listPatrolDashboard } from "@/server/patrols/queries";
import type { PatrolListItem, PatrolReferenceData } from "@/server/patrols/types";

type SearchParamsValue = string | string[] | undefined;
type SearchParamsRecord = Record<string, SearchParamsValue>;

function getSearchParamValue(searchParams: SearchParamsRecord, key: string) {
  const value = searchParams[key];

  return Array.isArray(value) ? value[0] : value;
}

function buildHref(
  pathname: string,
  searchParams: SearchParamsRecord,
  updates: Record<string, string | null | undefined>,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    const normalized = Array.isArray(value) ? value[0] : value;

    if (normalized) {
      params.set(key, normalized);
    }
  }

  for (const [key, value] of Object.entries(updates)) {
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
  }

  const query = params.toString();

  return query ? `${pathname}?${query}` : pathname;
}

function getPatrolTone(status: string): BadgeTone {
  switch (status) {
    case "running":
      return "success";
    case "awaiting-aar":
      return "warning";
    case "aar-submitted":
      return "info";
    case "reviewed":
      return "success";
    case "archived":
      return "muted";
    default:
      return "info";
  }
}

function formatDuration(minutes: number | null) {
  if (!minutes) {
    return "Duration TBD";
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
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

function PatrolCard({
  canComplete,
  canReviewAar,
  canRsvp,
  canSubmitAar,
  patrol,
  returnTo,
  searchParams,
}: {
  canComplete: boolean;
  canReviewAar: boolean;
  canRsvp: boolean;
  canSubmitAar: boolean;
  patrol: PatrolListItem;
  returnTo: string;
  searchParams: SearchParamsRecord;
}) {
  return (
    <Card className="border-border/80 bg-card/86">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-lg">{patrol.title}</CardTitle>
              <StatusBadge label={patrol.patrolStatusLabel} tone={getPatrolTone(patrol.patrolStatus)} />
            </div>
            <CardDescription>
              {patrol.patrolTypeLabel} led by {patrol.leaderName ?? "Unassigned leader"}
            </CardDescription>
          </div>
          <span className="rounded-full border border-border/70 bg-background/45 px-3 py-1 font-mono text-xs text-muted-foreground">
            {patrol.patrolCallsign ?? "No callsign"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
          <p>
            Deployment:{" "}
            <span className="text-foreground">{patrol.campaign?.title ?? "Unassigned"}</span>
          </p>
          <p>
            Week:{" "}
            <span className="text-foreground">
              {patrol.deploymentWeek ? `Week ${patrol.deploymentWeek}` : "Current"}
            </span>
          </p>
          <p>
            Started: <span className="text-foreground">{formatDateTime(patrol.startsAt)}</span>
          </p>
          <p>
            Estimated: <span className="text-foreground">{formatDuration(patrol.estimatedDurationMinutes)}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge label={`${patrol.interestedCount} interested`} tone="info" />
          <StatusBadge label={`${patrol.participantCount} participants`} tone="muted" />
          <StatusBadge
            label={patrol.aarStatusLabel}
            tone={patrol.hasMapScreenshot ? "success" : patrol.endsAt ? "warning" : "muted"}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={buildHref("/operations/patrols", searchParams, { inspect: patrol.id })}>
              View Patrol
            </Link>
          </Button>
          {canRsvp ? <RecordPatrolInterestForm patrolId={patrol.id} returnTo={returnTo} /> : null}
          {canComplete && patrol.patrolStatus === "running" ? (
            <CompletePatrolForm patrolId={patrol.id} returnTo={returnTo} />
          ) : null}
          {canSubmitAar && patrol.patrolStatus === "awaiting-aar" ? (
            <Button asChild size="sm" variant="outline">
              <Link href={`/operations/aar-queue?panel=create&eventId=${patrol.id}`}>Submit AAR</Link>
            </Button>
          ) : null}
          {canReviewAar && patrol.latestAar ? (
            <Button asChild size="sm" variant="ghost">
              <Link href={`/operations/aar-queue?panel=review&aarId=${patrol.latestAar.id}`}>Review AAR</Link>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function PatrolSection({
  canComplete,
  canReviewAar,
  canRsvp,
  canSubmitAar,
  description,
  emptyLabel,
  patrols,
  returnTo,
  searchParams,
  title,
}: {
  canComplete: boolean;
  canReviewAar: boolean;
  canRsvp: boolean;
  canSubmitAar: boolean;
  description: string;
  emptyLabel: string;
  patrols: PatrolListItem[];
  returnTo: string;
  searchParams: SearchParamsRecord;
  title: string;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {patrols.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {patrols.map((patrol) => (
            <PatrolCard
              canComplete={canComplete}
              canReviewAar={canReviewAar}
              canRsvp={canRsvp}
              canSubmitAar={canSubmitAar}
              key={patrol.id}
              patrol={patrol}
              returnTo={returnTo}
              searchParams={searchParams}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          description="Nothing needs action in this lane right now."
          title={emptyLabel}
        />
      )}
    </section>
  );
}

function StartPatrolPanel({
  referenceData,
  returnTo,
}: {
  referenceData: PatrolReferenceData;
  returnTo: string;
}) {
  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center bg-black/60 p-3 sm:items-center">
      <Card className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto border-border/80 bg-background/96 shadow-[0_24px_80px_rgba(2,6,14,0.55)]">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Start Patrol</CardTitle>
              <CardDescription>
                Launch a lightweight patrol now. Leader, start time, Running status, and AAR requirement are automatic.
              </CardDescription>
            </div>
            <Button asChild size="sm" variant="ghost">
              <Link href="/operations/patrols">Close</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <StartPatrolForm referenceData={referenceData} returnTo={returnTo} />
        </CardContent>
      </Card>
    </div>
  );
}

function PatrolInspectorContent({
  canManageParticipants,
  canReviewAar,
  canSubmitAar,
  patrol,
  referenceData,
  returnTo,
}: {
  canManageParticipants: boolean;
  canReviewAar: boolean;
  canSubmitAar: boolean;
  patrol: PatrolListItem;
  referenceData: PatrolReferenceData;
  returnTo: string;
}) {
  const overview = (
    <div className="grid gap-4 sm:grid-cols-2">
      {[
        ["Leader", patrol.leaderName ?? "Unassigned"],
        ["Type", patrol.patrolTypeLabel],
        ["Deployment", patrol.campaign?.title ?? "Unassigned"],
        ["Operational Week", patrol.deploymentWeek ? `Week ${patrol.deploymentWeek}` : "Current"],
        ["Started", formatDateTime(patrol.startsAt)],
        ["Ended", formatDateTime(patrol.endsAt)],
        ["Estimated Duration", formatDuration(patrol.estimatedDurationMinutes)],
        ["Discord", "Announcement tracked through notification delivery records"],
      ].map(([label, value]) => (
        <div key={label} className="rounded-xl border border-border/70 bg-background/45 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
          <p className="mt-2 text-sm font-medium text-foreground">{value}</p>
        </div>
      ))}
      <div className="sm:col-span-2 rounded-xl border border-border/70 bg-background/45 p-4">
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Description</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {patrol.description ?? "No patrol description was provided."}
        </p>
      </div>
    </div>
  );
  const participants = (
    <div className="space-y-5">
      <section className="space-y-3">
        <h3 className="text-base font-semibold text-foreground">Interested / RSVP</h3>
        {patrol.rsvps.length ? (
          <div className="space-y-2">
            {patrol.rsvps.map((rsvp) => (
              <div
                className="flex items-center justify-between rounded-xl border border-border/70 bg-background/45 p-3"
                key={rsvp.id}
              >
                <span className="text-sm text-foreground">{rsvp.name}</span>
                <StatusBadge label={rsvp.status} tone="info" />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            description="Discord interest buttons and portal RSVP interest will appear here."
            title="No interested members yet"
          />
        )}
      </section>
      <section className="space-y-3">
        <h3 className="text-base font-semibold text-foreground">Confirmed Participants</h3>
        {patrol.participants.length ? (
          <div className="space-y-2">
            {patrol.participants.map((participant) => (
              <div
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/45 p-3"
                key={participant.id}
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{participant.name}</p>
                  <p className="text-xs text-muted-foreground">{participant.unitLabel ?? "No unit"}</p>
                </div>
                {canManageParticipants ? (
                  <RemovePatrolParticipantForm
                    participantId={participant.id}
                    returnTo={returnTo}
                  />
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            description="RSVP interest is intentionally separate from confirmed patrol participation."
            title="No confirmed participants"
          />
        )}
        {canManageParticipants ? (
          <Card className="border-border/70 bg-card/70">
            <CardHeader>
              <CardTitle className="text-base">Add participant</CardTitle>
              <CardDescription>Manual participant edits remain separate from Weekend Operation attendance.</CardDescription>
            </CardHeader>
            <CardContent>
              <AddPatrolParticipantForm
                patrolId={patrol.id}
                referenceData={referenceData}
                returnTo={returnTo}
              />
            </CardContent>
          </Card>
        ) : null}
      </section>
    </div>
  );
  const aar = (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/70 bg-background/45 p-4">
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">AAR State</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusBadge label={patrol.aarStatusLabel} tone={patrol.hasMapScreenshot ? "success" : "warning"} />
          <StatusBadge
            label={patrol.hasMapScreenshot ? "Map screenshot uploaded" : "Map screenshot required"}
            tone={patrol.hasMapScreenshot ? "success" : "danger"}
          />
        </div>
      </div>
      {patrol.latestAar?.nextVersionRecommendation || patrol.latestAar?.progressionNotes ? (
        <div className="rounded-xl border border-border/70 bg-background/45 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Progression Context</p>
          <p className="mt-3 text-sm text-foreground">
            {patrol.latestAar.nextVersionRecommendation ?? "No next version recommendation."}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {patrol.latestAar.progressionNotes ?? "No progression notes recorded."}
          </p>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-3">
        {canSubmitAar ? (
          <Button asChild variant="outline">
            <Link href={`/operations/aar-queue?panel=create&eventId=${patrol.id}`}>Submit Patrol AAR</Link>
          </Button>
        ) : null}
        {canReviewAar && patrol.latestAar ? (
          <Button asChild variant="ghost">
            <Link href={`/operations/aar-queue?panel=review&aarId=${patrol.latestAar.id}`}>Open AAR Review</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );

  return (
    <PatrolInspectorShell
      closeHref="/operations/patrols"
      status={{
        label: patrol.patrolStatusLabel,
        tone: getPatrolTone(patrol.patrolStatus),
      }}
      subtitle={`${patrol.patrolTypeLabel} - ${patrol.campaign?.title ?? "Unassigned deployment"} - ${
        patrol.deploymentWeek ? `Week ${patrol.deploymentWeek}` : "Current week"
      }`}
      tabPanels={[
        { content: overview, label: "Overview" },
        { content: participants, label: "Participants" },
        { content: aar, label: "AAR" },
        {
          content: (
            <EmptyState
              description="Patrol activity entries will surface starts, completions, RSVP interest, AAR submissions, and review decisions."
              title="Activity timeline placeholder"
            />
          ),
          label: "Activity",
        },
        {
          content: (
            <EmptyState
              description="Audit-backed patrol history will appear here for authorized staff."
              title="History placeholder"
            />
          ),
          label: "History",
        },
      ]}
      title={patrol.title}
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <StatusBadge label={`${patrol.interestedCount} interested`} tone="info" />
        <StatusBadge label={`${patrol.participantCount} participants`} tone="muted" />
        <StatusBadge label={patrol.patrolCallsign ?? "No callsign"} tone="muted" />
      </div>
    </PatrolInspectorShell>
  );
}

export async function PatrolsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const [dashboard, referenceData, user] = await Promise.all([
    listPatrolDashboard(),
    getPatrolReferenceData(),
    getCurrentUser(),
  ]);
  const panel = getSearchParamValue(resolvedSearchParams, "panel");
  const selectedPatrolId = getSearchParamValue(resolvedSearchParams, "inspect");
  const message = getSearchParamValue(resolvedSearchParams, "message");
  const error = getSearchParamValue(resolvedSearchParams, "error");
  const currentHref = buildHref("/operations/patrols", resolvedSearchParams, {});
  const selectedPatrol = dashboard.patrols.find((patrol) => patrol.id === selectedPatrolId) ?? null;
  const canStart = user ? can(user, "patrols.create") || can(user, "patrols.lead") : false;
  const canComplete = user ? can(user, "patrols.complete") || can(user, "patrols.lead") : false;
  const canRsvp = user ? can(user, "patrols.rsvp") : false;
  const canManageParticipants = user ? can(user, "patrols.participants.manage") || can(user, "patrols.lead") : false;
  const canSubmitAar = user
    ? can(user, "aars.submit") || can(user, "patrols.aar.submit") || can(user, "s3.aars.submit")
    : false;
  const canReviewAar = user
    ? can(user, "aars.review") || can(user, "patrols.aar.review") || can(user, "s3.aars.review")
    : false;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={["Operations", "Patrols"]}
        contextLabel="Portal workflow"
        description="Start lightweight patrols, track interested members separately from confirmed participants, and route completed patrols into required AAR follow-up."
        title="Patrol Command"
      />
      <div className="flex flex-wrap gap-3">
        {canStart ? (
          <Button asChild>
            <Link href={buildHref("/operations/patrols", resolvedSearchParams, { panel: "start" })}>
              Start Patrol
            </Link>
          </Button>
        ) : null}
        <Button asChild variant="outline">
          <Link href="/operations/aar-queue">Review Patrol AARs</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/operations">Operations Center</Link>
        </Button>
      </div>
      {message ? <FlashNotice message={message} tone="success" /> : null}
      {error ? <FlashNotice message={error} tone="danger" /> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          hint="Multiple patrols may run concurrently."
          label="Active Patrols"
          tone="success"
          trend="Running now"
          value={String(dashboard.summary.active)}
        />
        <DashboardWidget
          description="Completed patrols that still need leader follow-up."
          icon={FileText}
          title="Awaiting AAR"
          tone={dashboard.summary.awaitingAar > 0 ? "warning" : "success"}
          value={String(dashboard.summary.awaitingAar)}
        />
        <DashboardWidget
          description="Submitted reports that need S3 review."
          icon={Crosshair}
          title="Awaiting Review"
          tone={dashboard.summary.awaitingReview > 0 ? "warning" : "success"}
          value={String(dashboard.summary.awaitingReview)}
        />
        <DashboardWidget
          description="Recently completed, reviewed, or archived patrols."
          icon={Clock}
          title="Completed"
          tone="muted"
          value={String(dashboard.summary.completed)}
        />
      </div>
      <Card className="border-primary/25 bg-primary/8">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-xl border border-primary/25 bg-primary/10 p-2 text-primary">
              <RadioTower className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Portal patrol flow</p>
              <p className="text-sm text-muted-foreground">
                Portal Patrols are authoritative. Interested/RSVP records are not final attendance, and confirmed participants are managed separately.
              </p>
            </div>
          </div>
          <StatusBadge label="Portal is source of truth" tone="info" />
        </CardContent>
      </Card>
      <PatrolSection
        canComplete={canComplete}
        canReviewAar={canReviewAar}
        canRsvp={canRsvp}
        canSubmitAar={canSubmitAar}
        description="Running patrols that may collect Discord interest or manual confirmed participants."
        emptyLabel="No active patrols"
        patrols={dashboard.activePatrols}
        returnTo={currentHref}
        searchParams={resolvedSearchParams}
        title="Active Patrols"
      />
      <PatrolSection
        canComplete={canComplete}
        canReviewAar={canReviewAar}
        canRsvp={canRsvp}
        canSubmitAar={canSubmitAar}
        description="Completed patrols that must submit the Spearhead Patrol AAR and map screenshot."
        emptyLabel="No patrols awaiting AAR"
        patrols={dashboard.awaitingAar}
        returnTo={currentHref}
        searchParams={resolvedSearchParams}
        title="Awaiting AAR"
      />
      <PatrolSection
        canComplete={canComplete}
        canReviewAar={canReviewAar}
        canRsvp={canRsvp}
        canSubmitAar={canSubmitAar}
        description="AARs received by the portal and waiting for S3 review or missing-map resolution."
        emptyLabel="No patrol AARs awaiting review"
        patrols={dashboard.awaitingReview}
        returnTo={currentHref}
        searchParams={resolvedSearchParams}
        title="Awaiting Review"
      />
      <PatrolSection
        canComplete={canComplete}
        canReviewAar={canReviewAar}
        canRsvp={canRsvp}
        canSubmitAar={canSubmitAar}
        description="Reviewed, archived, or completed patrols retained for deployment progression context."
        emptyLabel="No completed patrols"
        patrols={dashboard.completedPatrols}
        returnTo={currentHref}
        searchParams={resolvedSearchParams}
        title="Completed Patrols"
      />
      {panel === "start" && canStart ? (
        <StartPatrolPanel referenceData={referenceData} returnTo={currentHref} />
      ) : null}
      {selectedPatrol ? (
        <PatrolInspectorContent
          canManageParticipants={canManageParticipants}
          canReviewAar={canReviewAar}
          canSubmitAar={canSubmitAar}
          patrol={selectedPatrol}
          referenceData={referenceData}
          returnTo={currentHref}
        />
      ) : null}
    </div>
  );
}
