import Link from "next/link";

import { StatusBadge, type BadgeTone } from "@/components/status/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/formatters";
import type {
  GoNoGoStatus,
  ReadinessEvaluation,
  ReadinessRuleResult,
  ReadinessRuleStatus,
  ReadinessScore,
} from "@/server/operations-package/types";

function getStatusTone(status: ReadinessRuleStatus): BadgeTone {
  switch (status) {
    case "PASS":
      return "success";
    case "WARNING":
      return "warning";
    case "FAIL":
      return "danger";
    default:
      return "muted";
  }
}

function getScoreTone(score: ReadinessScore): BadgeTone {
  if (score.blockingIssues > 0) {
    return "danger";
  }

  if (score.warnings > 0) {
    return "warning";
  }

  return score.percentage >= 100 ? "success" : "info";
}

export function ValidationStatusBadge({ status }: { status: ReadinessRuleStatus }) {
  return <StatusBadge label={status.replace("_", " ")} tone={getStatusTone(status)} />;
}

export function ReadinessScoreCard({
  description,
  evaluation,
  title,
}: {
  description: string;
  evaluation: ReadinessEvaluation;
  title: string;
}) {
  return (
    <Card className="border-border/80 bg-card/88">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <StatusBadge label={evaluation.score.statusLabel} tone={getScoreTone(evaluation.score)} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="font-mono text-4xl font-semibold text-foreground">
          {evaluation.score.percentage}%
        </div>
        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
          <span>{evaluation.score.completedChecks}/{evaluation.score.totalChecks} complete</span>
          <span>{evaluation.score.blockingIssues} blocking</span>
          <span>{evaluation.score.warnings} warnings</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function ReadinessChecklist({
  evaluation,
  title = "Checklist",
}: {
  evaluation: ReadinessEvaluation;
  title?: string;
}) {
  return (
    <Card className="border-border/80 bg-card/88">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Rule-by-rule validation for this Operations Package.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {evaluation.rules.map((rule) => (
          <div key={rule.id} className="rounded-xl border border-border/70 bg-background/45 p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-semibold text-foreground">{rule.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{rule.message}</p>
              </div>
              <ValidationStatusBadge status={rule.status} />
            </div>
            {rule.status !== "PASS" ? (
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Action:</span> {rule.recommendedAction}
              </p>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function ReadinessIssueList({
  emptyMessage,
  issues,
  title,
}: {
  emptyMessage: string;
  issues: ReadinessRuleResult[];
  title: string;
}) {
  return (
    <Card className="border-border/80 bg-card/82">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {issues.length > 0 ? (
          issues.map((issue) => (
            <div key={issue.id} className="rounded-xl border border-border/70 bg-background/45 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{issue.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{issue.message}</p>
                </div>
                <ValidationStatusBadge status={issue.status} />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{issue.recommendedAction}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function BlockingIssueBanner({ issues }: { issues: ReadinessRuleResult[] }) {
  if (issues.length === 0) {
    return (
      <Card className="border-success/30 bg-success/10">
        <CardContent className="flex items-center justify-between gap-3 p-4">
          <div>
            <p className="font-semibold text-foreground">No blocking readiness issues</p>
            <p className="text-sm text-muted-foreground">This package can continue toward preview when Epic 5C is available.</p>
          </div>
          <StatusBadge label="Go" tone="success" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-danger/35 bg-danger/10">
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div>
          <p className="font-semibold text-foreground">No-Go: blocking issues found</p>
          <p className="text-sm text-muted-foreground">
            Resolve {issues.length} blocking readiness {issues.length === 1 ? "issue" : "issues"} before preview.
          </p>
        </div>
        <StatusBadge label="No-Go" tone="danger" />
      </CardContent>
    </Card>
  );
}

export function RecommendedActionList({ recommendations }: { recommendations: ReadinessRuleResult[] }) {
  return (
    <Card className="border-border/80 bg-card/82">
      <CardHeader>
        <CardTitle>Recommended actions</CardTitle>
        <CardDescription>Next best fixes based on blocking issues and warnings.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.length > 0 ? (
          recommendations.map((recommendation) => (
            <div key={recommendation.id} className="rounded-xl border border-border/70 bg-background/45 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-foreground">{recommendation.label}</p>
                <ValidationStatusBadge status={recommendation.status} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{recommendation.recommendedAction}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No recommended fixes right now.</p>
        )}
      </CardContent>
    </Card>
  );
}

export function GoNoGoBoard({
  packageHref,
  readiness,
  showChecklist = true,
}: {
  packageHref: string;
  readiness: GoNoGoStatus;
  showChecklist?: boolean;
}) {
  return (
    <section className="space-y-4">
      <BlockingIssueBanner issues={readiness.blockingIssues} />
      <div className="grid gap-4 lg:grid-cols-2">
        <ReadinessScoreCard
          description="Planning completeness and package skeleton validation."
          evaluation={readiness.operational}
          title="Operational Readiness"
        />
        <ReadinessScoreCard
          description="Safety checks for later preview and publication workflows."
          evaluation={readiness.publication}
          title="Publication Readiness"
        />
      </div>
      <Card className="border-border/80 bg-card/88">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Go / No-Go Board</CardTitle>
              <CardDescription>
                Last evaluated {formatDateTime(readiness.lastEvaluatedAt)}. Publish remains disabled until Epic 5C.
              </CardDescription>
            </div>
            <StatusBadge label={readiness.canContinueToPreview ? "Go for preview" : "No-Go"} tone={readiness.canContinueToPreview ? "success" : "danger"} />
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={packageHref}>Review Package</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`${packageHref}#planning`}>Edit Planning</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`${packageHref}#tasking`}>Edit Tasking</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`${packageHref}#resources`}>Manage Resources</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`${packageHref}#resources`}>Manage CONOP</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`${packageHref}#overview`}>Assign Zeus</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={packageHref}>Re-run Checks</Link>
          </Button>
          <Button asChild disabled={!readiness.canContinueToPreview} size="sm" variant="outline">
            <Link href={`${packageHref}#release`}>Continue to Preview</Link>
          </Button>
          <Button asChild disabled={!readiness.canContinueToPreview} size="sm">
            <Link href={`${packageHref}#release`}>Publish</Link>
          </Button>
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <ReadinessIssueList
          emptyMessage="No blocking issues detected."
          issues={readiness.blockingIssues}
          title="Blocking Issues"
        />
        <ReadinessIssueList
          emptyMessage="No warnings detected."
          issues={readiness.warnings}
          title="Warnings"
        />
      </div>
      <RecommendedActionList recommendations={readiness.recommendations} />
      {showChecklist ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <ReadinessChecklist evaluation={readiness.operational} title="Operational Checks" />
          <ReadinessChecklist evaluation={readiness.publication} title="Publication Checks" />
        </div>
      ) : null}
    </section>
  );
}
