import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge, type BadgeTone } from "@/components/status/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/formatters";
import {
  dismissRecommendationAction,
  resolveRecommendationAction,
  updateIntentAssessmentAction,
} from "@/server/operations-package/actions";
import type { OperationsPackageData } from "@/server/operations-package/types";
import type { CommandIntentAssessmentView, CommandRecommendationView } from "@/server/recommendations/types";

const textareaClassName =
  "min-h-24 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const fieldClassName =
  "flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const labelClassName = "text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground";

function getPriorityTone(priority: string): BadgeTone {
  switch (priority) {
    case "critical":
      return "danger";
    case "high":
    case "medium":
      return "warning";
    case "low":
      return "info";
    default:
      return "muted";
  }
}

function getAssessmentTone(status: string): BadgeTone {
  switch (status) {
    case "achieved":
      return "success";
    case "partially_achieved":
    case "deferred":
      return "warning";
    case "not_achieved":
    case "cancelled":
      return "danger";
    default:
      return "muted";
  }
}

function recommendationHref(recommendation: CommandRecommendationView, fallbackHref: string) {
  const primaryAffectedHref = recommendation.affectedEntities.find((entity) => entity.href)?.href;

  if (primaryAffectedHref) {
    return primaryAffectedHref;
  }

  if (recommendation.relatedEntityType === "Event" && recommendation.relatedEntityId) {
    return `/operations/events/${recommendation.relatedEntityId}`;
  }

  if (recommendation.relatedEntityType === "Campaign" && recommendation.relatedEntityId) {
    return `/operations/deployments/${recommendation.relatedEntityId}`;
  }

  return fallbackHref;
}

function getOperationalImpact(recommendation: CommandRecommendationView) {
  if (recommendation.priority === "critical") {
    return "Potential blocker for command review, publication, or execution. Review before proceeding.";
  }

  if (recommendation.priority === "high") {
    return "High-priority issue that may degrade readiness if it remains unresolved.";
  }

  if (recommendation.priority === "medium") {
    return "Operational friction or incomplete planning signal worth addressing during the current cycle.";
  }

  return "Informational signal for situational awareness and trend monitoring.";
}

function AffectedEntitiesList({ recommendation }: { recommendation: CommandRecommendationView }) {
  return (
    <div className="flex flex-wrap gap-2">
      {recommendation.affectedEntities.length > 0 ? (
        recommendation.affectedEntities.map((entity) =>
          entity.href ? (
            <Link
              className="rounded-full border border-border/70 bg-background/45 px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
              href={entity.href}
              key={`${entity.type}:${entity.id}`}
            >
              {entity.type}: {entity.label}
            </Link>
          ) : (
            <span
              className="rounded-full border border-border/70 bg-background/45 px-2.5 py-1 text-xs font-medium text-muted-foreground"
              key={`${entity.type}:${entity.id}`}
            >
              {entity.type}: {entity.label}
            </span>
          ),
        )
      ) : (
        <span className="rounded-full border border-border/70 bg-background/45 px-2.5 py-1 text-xs font-medium text-muted-foreground">
          Package-level
        </span>
      )}
    </div>
  );
}

function RecommendationLifecycleButtons({
  recommendation,
  returnTo,
}: {
  recommendation: CommandRecommendationView;
  returnTo: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <form action={dismissRecommendationAction}>
        <input name="recommendationId" type="hidden" value={recommendation.id} />
        <input name="returnTo" type="hidden" value={returnTo} />
        <Button size="sm" type="submit" variant="outline">
          Dismiss
        </Button>
      </form>
      <form action={resolveRecommendationAction}>
        <input name="recommendationId" type="hidden" value={recommendation.id} />
        <input name="returnTo" type="hidden" value={returnTo} />
        <Button size="sm" type="submit" variant="outline">
          Mark Resolved
        </Button>
      </form>
    </div>
  );
}

export function RecommendationCard({
  fallbackHref,
  recommendation,
  returnTo,
}: {
  fallbackHref: string;
  recommendation: CommandRecommendationView;
  returnTo: string;
}) {
  return (
    <Card className="border-border/80 bg-card/88">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{recommendation.title}</CardTitle>
            <CardDescription>{recommendation.summary}</CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge label={recommendation.priority} tone={getPriorityTone(recommendation.priority)} />
            <StatusBadge label={recommendation.category} tone="muted" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-border/70 bg-background/45 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Why this exists</p>
          <p className="mt-2 text-sm text-foreground">{recommendation.reason}</p>
        </div>
        <div className="rounded-xl border border-border/70 bg-background/45 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Affected</p>
          <div className="mt-2">
            <AffectedEntitiesList recommendation={recommendation} />
          </div>
        </div>
        <div className="rounded-xl border border-border/70 bg-background/45 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Recommended action</p>
          <p className="mt-2 text-sm text-foreground">{recommendation.recommendedAction}</p>
        </div>
        <details className="rounded-xl border border-border/70 bg-background/35 p-3">
          <summary className="cursor-pointer list-none text-sm font-semibold text-foreground">
            View supporting rules
          </summary>
          <div className="mt-3 space-y-2">
            {recommendation.supportingRules.map((rule) => (
              <div key={rule.id} className="rounded-lg border border-border/60 bg-background/45 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{rule.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{rule.message}</p>
                  </div>
                  <StatusBadge label={rule.status.replace("_", " ")} tone={rule.status === "FAIL" ? "danger" : "warning"} />
                </div>
              </div>
            ))}
          </div>
        </details>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href={recommendationHref(recommendation, fallbackHref)}>Go To</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`${fallbackHref}#recommendation-inspector`}>View Details</Link>
          </Button>
          <RecommendationLifecycleButtons recommendation={recommendation} returnTo={returnTo} />
        </div>
      </CardContent>
    </Card>
  );
}

export function RecommendationQueue({
  fallbackHref,
  recommendations,
  returnTo,
  title = "Top Recommended Actions",
}: {
  fallbackHref: string;
  recommendations: CommandRecommendationView[];
  returnTo: string;
  title?: string;
}) {
  return (
    <Card id="recommendations" className="scroll-mt-6 border-border/80 bg-card/88">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Informational recommendations generated from rule evidence. Command staff always make the decision.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendations.length > 0 ? (
          recommendations.slice(0, 5).map((recommendation) => (
            <RecommendationCard
              fallbackHref={fallbackHref}
              key={recommendation.id}
              recommendation={recommendation}
              returnTo={returnTo}
            />
          ))
        ) : (
          <EmptyState description="No active CDSS recommendations for this package." title="No recommendations" />
        )}
      </CardContent>
    </Card>
  );
}

export function RecommendationInspector({
  recommendations,
  history,
}: {
  recommendations?: CommandRecommendationView[];
  history: CommandRecommendationView[];
}) {
  const selectedRecommendation = recommendations?.[0] ?? history[0] ?? null;
  const relatedRecommendations = selectedRecommendation
    ? history.filter(
        (recommendation) =>
          recommendation.id !== selectedRecommendation.id &&
          recommendation.category === selectedRecommendation.category,
      )
    : [];

  return (
    <Card id="recommendation-inspector" className="scroll-mt-6 border-border/80 bg-card/82">
      <CardHeader>
        <CardTitle>Recommendation Inspector</CardTitle>
        <CardDescription>
          Detail, evidence, impact, lifecycle, and audit trail for the highest-priority current recommendation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedRecommendation ? (
          <>
            <div className="rounded-xl border border-border/70 bg-background/45 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{selectedRecommendation.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedRecommendation.summary}</p>
                </div>
                <StatusBadge label={selectedRecommendation.priority} tone={getPriorityTone(selectedRecommendation.priority)} />
              </div>
              <div className="mt-3">
                <AffectedEntitiesList recommendation={selectedRecommendation} />
              </div>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/45 p-4">
              <p className={labelClassName}>Reason</p>
              <p className="mt-2 text-sm text-foreground">{selectedRecommendation.reason}</p>
              <p className={`mt-4 ${labelClassName}`}>Operational Impact</p>
              <p className="mt-2 text-sm text-foreground">{getOperationalImpact(selectedRecommendation)}</p>
              <p className={`mt-4 ${labelClassName}`}>Recommended Action</p>
              <p className="mt-2 text-sm text-foreground">{selectedRecommendation.recommendedAction}</p>
              {selectedRecommendation.details ? (
                <>
                  <p className={`mt-4 ${labelClassName}`}>Details</p>
                  <p className="mt-2 text-sm text-foreground">{selectedRecommendation.details}</p>
                </>
              ) : null}
            </div>
            <details className="rounded-xl border border-border/70 bg-background/35 p-4" open>
              <summary className="cursor-pointer list-none text-sm font-semibold text-foreground">
                Supporting Rules
              </summary>
              <div className="mt-3 space-y-2">
                {selectedRecommendation.supportingRules.map((rule) => (
                  <div key={rule.id} className="rounded-lg border border-border/60 bg-background/45 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{rule.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{rule.message}</p>
                        <p className="mt-2 text-xs text-muted-foreground">Action: {rule.recommendedAction}</p>
                      </div>
                      <StatusBadge label={rule.status.replace("_", " ")} tone={rule.status === "FAIL" ? "danger" : "warning"} />
                    </div>
                  </div>
                ))}
              </div>
            </details>
            <div className="rounded-xl border border-border/70 bg-background/45 p-4">
              <p className={labelClassName}>Audit History</p>
              <div className="mt-3 space-y-2">
                {selectedRecommendation.auditHistory.length > 0 ? (
                  selectedRecommendation.auditHistory.map((entry) => (
                    <div key={entry.id} className="rounded-lg border border-border/60 bg-background/45 p-3">
                      <p className="text-sm font-semibold text-foreground">{entry.summary}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {entry.action} / {entry.actorName ?? "System"} / {formatDateTime(entry.createdAt)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No lifecycle audit entries yet.</p>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/45 p-4">
              <p className={labelClassName}>Related Recommendations</p>
              <div className="mt-3 space-y-2">
                {relatedRecommendations.length > 0 ? (
                  relatedRecommendations.slice(0, 3).map((recommendation) => (
                    <div key={recommendation.id} className="rounded-lg border border-border/60 bg-background/45 p-3">
                      <p className="text-sm font-semibold text-foreground">{recommendation.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {recommendation.status} / {formatDateTime(recommendation.updatedAt)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No related recommendation history yet.</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <EmptyState description="Recommendation details appear after CDSS generates package recommendations." title="No recommendation selected" />
        )}
        <div className="rounded-xl border border-border/70 bg-background/35 p-4">
          <p className="text-sm font-semibold text-foreground">Recent Recommendation History</p>
          <p className="mt-1 text-xs text-muted-foreground">Resolved, dismissed, expired, and active recommendations remain available.</p>
        </div>
        {history.length > 0 ? (
          history.map((recommendation) => (
            <div key={recommendation.id} className="rounded-xl border border-border/70 bg-background/45 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{recommendation.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{recommendation.reason}</p>
                </div>
                <StatusBadge label={recommendation.status} tone={recommendation.status === "active" ? getPriorityTone(recommendation.priority) : "muted"} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Updated {formatDateTime(recommendation.updatedAt)}
              </p>
            </div>
          ))
        ) : (
          <EmptyState description="Recommendation history starts after CDSS generates package recommendations." title="No history yet" />
        )}
      </CardContent>
    </Card>
  );
}

export function IntentAssessmentPanel({
  assessment,
  data,
  returnTo,
}: {
  assessment: CommandIntentAssessmentView;
  data: OperationsPackageData;
  returnTo: string;
}) {
  const status = assessment?.status ?? "deferred";

  return (
    <Card id="intent-assessment" className="scroll-mt-6 border-border/80 bg-card/88">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Commander&apos;s Intent Assessment</CardTitle>
            <CardDescription>
              Human-authored assessment of planned intent against execution results. CDSS does not decide this automatically.
            </CardDescription>
          </div>
          <StatusBadge label={status.replace("_", " ")} tone={getAssessmentTone(status)} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-border/70 bg-background/45 p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Planned Intent</p>
            <p className="mt-2 text-sm text-foreground">
              {data.week.commandersIntent ?? data.weeklyTasking?.commandersIntent ?? "Commander's Intent not documented."}
            </p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/45 p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">End State</p>
            <p className="mt-2 text-sm text-foreground">{data.week.commanderEndState ?? "End state not documented."}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/45 p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Success Criteria</p>
            <p className="mt-2 text-sm text-foreground">{data.week.successCriteria ?? "Success criteria not documented."}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/45 p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Failure Conditions</p>
            <p className="mt-2 text-sm text-foreground">{data.week.failureConditions ?? "Failure conditions not documented."}</p>
          </div>
        </div>
        {assessment ? (
          <div className="rounded-xl border border-border/70 bg-background/45 p-4 text-sm text-muted-foreground">
            <p><span className="font-semibold text-foreground">Summary:</span> {assessment.assessmentSummary ?? "No summary recorded."}</p>
            <p className="mt-2"><span className="font-semibold text-foreground">Evidence:</span> {assessment.supportingEvidence ?? "No evidence recorded."}</p>
            <p className="mt-2"><span className="font-semibold text-foreground">Lessons:</span> {assessment.lessonsLearned ?? "No lessons recorded."}</p>
            <p className="mt-2"><span className="font-semibold text-foreground">Next week:</span> {assessment.nextWeekRecommendations ?? "No next-week recommendations recorded."}</p>
          </div>
        ) : null}
        <details className="rounded-xl border border-border/70 bg-background/35 p-4">
          <summary className="cursor-pointer list-none text-sm font-semibold text-foreground">
            Update assessment
          </summary>
          <form action={updateIntentAssessmentAction} className="mt-4 space-y-4">
            <input name="campaignId" type="hidden" value={data.campaign.id} />
            <input name="weekNumber" type="hidden" value={data.week.weekNumber} />
            <input name="returnTo" type="hidden" value={returnTo} />
            <label className="block space-y-2">
              <span className={labelClassName}>Assessment Status</span>
              <select className={fieldClassName} defaultValue={status} name="status">
                <option value="achieved">Achieved</option>
                <option value="partially_achieved">Partially Achieved</option>
                <option value="not_achieved">Not Achieved</option>
                <option value="deferred">Deferred</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
            <label className="block space-y-2">
              <span className={labelClassName}>Assessment Summary</span>
              <textarea className={textareaClassName} defaultValue={assessment?.assessmentSummary ?? ""} name="assessmentSummary" />
            </label>
            <label className="block space-y-2">
              <span className={labelClassName}>Supporting Evidence</span>
              <textarea className={textareaClassName} defaultValue={assessment?.supportingEvidence ?? ""} name="supportingEvidence" />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className={labelClassName}>Lessons Learned</span>
                <textarea className={textareaClassName} defaultValue={assessment?.lessonsLearned ?? ""} name="lessonsLearned" />
              </label>
              <label className="block space-y-2">
                <span className={labelClassName}>Next Week Recommendations</span>
                <textarea className={textareaClassName} defaultValue={assessment?.nextWeekRecommendations ?? ""} name="nextWeekRecommendations" />
              </label>
            </div>
            <Button type="submit">Save assessment</Button>
          </form>
        </details>
      </CardContent>
    </Card>
  );
}
