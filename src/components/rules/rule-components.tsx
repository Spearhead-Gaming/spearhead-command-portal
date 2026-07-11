import { StatusBadge, type BadgeTone } from "@/components/status/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  RuleCategorySummary,
  RuleEvaluationResult,
  RuleRecommendation,
  RuleStatus,
  RuleSummary,
} from "@/server/rules/types";

function getRuleTone(status: RuleStatus): BadgeTone {
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

export function RuleStatusBadge({ status }: { status: RuleStatus }) {
  return <StatusBadge label={status.replace("_", " ")} tone={getRuleTone(status)} />;
}

export function RuleList({
  description = "Provider rule results.",
  rules,
  title = "Rules",
}: {
  description?: string;
  rules: RuleEvaluationResult[];
  title?: string;
}) {
  return (
    <Card className="border-border/80 bg-card/82">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
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
                <RuleStatusBadge status={rule.status} />
              </div>
              {rule.status !== "PASS" ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">Action:</span> {rule.recommendedAction}
                </p>
              ) : null}
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No rules returned.</p>
        )}
      </CardContent>
    </Card>
  );
}

export function RuleSummaryCard({
  summary,
  title = "Rule Summary",
}: {
  summary: RuleSummary;
  title?: string;
}) {
  return (
    <Card className="border-border/80 bg-card/88">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Engine-level counts from applicable rule results.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-4">
        <span>{summary.completedRules}/{summary.applicableRules} complete</span>
        <span>{summary.failures} failures</span>
        <span>{summary.criticalFailures} critical</span>
        <span>{summary.warnings} warnings</span>
      </CardContent>
    </Card>
  );
}

export function RecommendationPanel({
  recommendations,
  title = "Recommendations",
}: {
  recommendations: RuleRecommendation[];
  title?: string;
}) {
  return (
    <Card className="border-border/80 bg-card/88">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Actions derived from failed or warning rules.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.length > 0 ? (
          recommendations.map((recommendation) => (
            <div key={recommendation.ruleId} className="rounded-xl border border-border/70 bg-background/45 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{recommendation.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{recommendation.recommendedAction}</p>
                </div>
                <RuleStatusBadge status={recommendation.status} />
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No recommendations right now.</p>
        )}
      </CardContent>
    </Card>
  );
}

export function RuleCategoryCard({ category }: { category: RuleCategorySummary }) {
  return (
    <Card className="border-border/80 bg-card/88">
      <CardHeader>
        <CardTitle className="capitalize">{category.category}</CardTitle>
        <CardDescription>Category-level rule result summary.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
          <span>{category.completedRules}/{category.applicableRules} complete</span>
          <span>{category.failures} failures</span>
          <span>{category.warnings} warnings</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function RuleInspectorDrawer({
  categories,
  results,
}: {
  categories: RuleCategorySummary[];
  results: RuleEvaluationResult[];
}) {
  return (
    <Card className="border-border/80 bg-card/82">
      <CardHeader>
        <CardTitle>Rule Inspector</CardTitle>
        <CardDescription>Expandable category drill-down for rule engine output.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {categories.map((category) => (
          <details key={category.category} className="rounded-xl border border-border/70 bg-background/35 p-4">
            <summary className="cursor-pointer list-none font-semibold capitalize text-foreground">
              {category.category}
            </summary>
            <div className="mt-4">
              <RuleList
                rules={results.filter((result) => result.category === category.category)}
                title={`${category.category} rules`}
              />
            </div>
          </details>
        ))}
      </CardContent>
    </Card>
  );
}
