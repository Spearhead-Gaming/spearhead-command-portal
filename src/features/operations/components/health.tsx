import Link from "next/link";

import { StatusBadge, type BadgeTone } from "@/components/status/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/formatters";
import type {
  HealthRuleResult,
  OperationalHealthCategory,
  OperationalHealthCategoryScore,
  OperationalHealthRuleStatus,
  OperationalHealthStatusLabel,
  OperationalHealthSummary,
  OperationalHealthTrend,
} from "@/server/operations-package/types";

function getRuleTone(status: OperationalHealthRuleStatus): BadgeTone {
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

function getHealthTone(status: OperationalHealthStatusLabel): BadgeTone {
  switch (status) {
    case "Excellent":
    case "Good":
      return "success";
    case "Fair":
      return "warning";
    case "Poor":
    case "Critical":
      return "danger";
    default:
      return "muted";
  }
}

function getCategoryLabel(category: OperationalHealthCategory) {
  switch (category) {
    case "planning":
      return "Planning Health";
    case "execution":
      return "Execution Health";
    case "community":
      return "Community Health";
  }
}

function getCategoryDescription(category: OperationalHealthCategory) {
  switch (category) {
    case "planning":
      return "Package structure, tasking, resources, Zeus ownership, and planning timeline.";
    case "execution":
      return "Weekend Operation state, patrol completion, AAR submission, and review follow-up.";
    case "community":
      return "Attendance signals, staffing shape, roster coverage, and community participation inputs.";
  }
}

export function HealthStatusBadge({ status }: { status: OperationalHealthStatusLabel }) {
  return <StatusBadge label={status} tone={getHealthTone(status)} />;
}

export function TrendIndicator({ trend }: { trend: OperationalHealthTrend }) {
  const label = trend.charAt(0).toUpperCase() + trend.slice(1);
  const tone: BadgeTone = trend === "improving" ? "success" : trend === "declining" ? "danger" : "muted";

  return <StatusBadge label={label} tone={tone} />;
}

export function HealthRuleList({
  rules,
  title = "Health Rules",
}: {
  rules: HealthRuleResult[];
  title?: string;
}) {
  return (
    <Card className="border-border/80 bg-card/82">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Rule results returned by registered health providers.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rules.length > 0 ? (
          rules.map((rule) => (
            <div key={rule.id} className="rounded-xl border border-border/70 bg-background/45 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold text-foreground">{rule.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{rule.message}</p>
                </div>
                <StatusBadge label={rule.status.replace("_", " ")} tone={getRuleTone(rule.status)} />
              </div>
              {rule.status !== "PASS" ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">Action:</span> {rule.recommendedAction}
                </p>
              ) : null}
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No rules returned for this category.</p>
        )}
      </CardContent>
    </Card>
  );
}

export function HealthScoreCard({ category }: { category: OperationalHealthCategoryScore }) {
  return (
    <Card className="border-border/80 bg-card/88">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{getCategoryLabel(category.category)}</CardTitle>
            <CardDescription>{getCategoryDescription(category.category)}</CardDescription>
          </div>
          <HealthStatusBadge status={category.statusLabel} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <p className="font-mono text-4xl font-semibold text-foreground">{category.score}%</p>
          <TrendIndicator trend={category.trend} />
        </div>
        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
          <span>{category.totalChecks} checks</span>
          <span>{category.criticalIssues} critical</span>
          <span>{category.warnings} warnings</span>
        </div>
        <details className="rounded-xl border border-border/70 bg-background/35 p-3">
          <summary className="cursor-pointer list-none text-sm font-semibold text-foreground">
            Inspect {getCategoryLabel(category.category)}
          </summary>
          <div className="mt-3 space-y-2">
            {category.rules.map((rule) => (
              <div key={rule.id} className="rounded-lg border border-border/60 bg-background/45 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{rule.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{rule.message}</p>
                  </div>
                  <StatusBadge label={rule.status.replace("_", " ")} tone={getRuleTone(rule.status)} />
                </div>
                {rule.status !== "PASS" ? (
                  <p className="mt-2 text-xs text-muted-foreground">{rule.recommendedAction}</p>
                ) : null}
              </div>
            ))}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

export function HealthRecommendationCard({
  packageHref,
  recommendations,
}: {
  packageHref: string;
  recommendations: HealthRuleResult[];
}) {
  return (
    <Card className="border-border/80 bg-card/88">
      <CardHeader>
        <CardTitle>Recommended Actions</CardTitle>
        <CardDescription>Health-derived fixes only. Commander decision support remains a later Epic.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.length > 0 ? (
          recommendations.map((recommendation) => (
            <div key={recommendation.id} className="rounded-xl border border-border/70 bg-background/45 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{recommendation.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{recommendation.recommendedAction}</p>
                </div>
                <StatusBadge label={recommendation.category} tone={getRuleTone(recommendation.status)} />
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No health recommendations right now.</p>
        )}
        <Button asChild size="sm" variant="outline">
          <Link href={packageHref}>Open Operations Package</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function HealthInspectorDrawer({ health }: { health: OperationalHealthSummary }) {
  return (
    <Card className="border-border/80 bg-card/82">
      <CardHeader>
        <CardTitle>Health Inspector</CardTitle>
        <CardDescription>
          Drill-down view for provider rule results. Last evaluated {formatDateTime(health.lastEvaluatedAt)}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.values(health.categories).map((category) => (
          <details key={category.category} className="rounded-xl border border-border/70 bg-background/35 p-4">
            <summary className="cursor-pointer list-none">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-foreground">{getCategoryLabel(category.category)}</p>
                <HealthStatusBadge status={category.statusLabel} />
              </div>
            </summary>
            <div className="mt-4">
              <HealthRuleList rules={category.rules} title={`${getCategoryLabel(category.category)} Rules`} />
            </div>
          </details>
        ))}
      </CardContent>
    </Card>
  );
}

export function HealthSummaryPanel({
  health,
  packageHref,
  showInspector = true,
}: {
  health: OperationalHealthSummary;
  packageHref: string;
  showInspector?: boolean;
}) {
  return (
    <section className="space-y-4">
      <Card className="overflow-hidden border-primary/20 bg-linear-to-br from-primary/10 via-card/88 to-background">
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label="Operational Health" tone="info" />
              <HealthStatusBadge status={health.overallStatus} />
              <TrendIndicator trend={health.trend} />
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-foreground">{health.overallScore}% Health</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {health.blockingIssues.length} critical issues and {health.warnings.length} warnings across planning, execution, and community health.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href={packageHref}>Open Package</Link>
          </Button>
        </CardContent>
      </Card>
      <div className="grid gap-4 xl:grid-cols-3">
        {Object.values(health.categories).map((category) => (
          <HealthScoreCard key={category.category} category={category} />
        ))}
      </div>
      <HealthRecommendationCard packageHref={packageHref} recommendations={health.recommendations} />
      {showInspector ? <HealthInspectorDrawer health={health} /> : null}
    </section>
  );
}
