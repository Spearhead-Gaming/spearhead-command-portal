import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleDashed, CircleDot, OctagonAlert, TriangleAlert } from "lucide-react";

import { StatusBadge, type BadgeTone } from "@/components/status/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  OperationsJourney,
  OperationsJourneyStep,
  OperationsJourneyStepStatus,
  OperationsNextAction,
} from "@/server/operations-package/journey";

function toneForStatus(status: OperationsJourneyStepStatus): BadgeTone {
  switch (status) {
    case "complete":
      return "success";
    case "blocked":
      return "danger";
    case "current":
      return "info";
    case "warning":
      return "warning";
    default:
      return "muted";
  }
}

function labelForStatus(status: OperationsJourneyStepStatus) {
  switch (status) {
    case "complete":
      return "Complete";
    case "blocked":
      return "Blocked";
    case "current":
      return "Current";
    case "warning":
      return "Attention";
    default:
      return "Pending";
  }
}

function StepIcon({ status }: { status: OperationsJourneyStepStatus }) {
  const className = "h-4 w-4";

  switch (status) {
    case "complete":
      return <CheckCircle2 aria-hidden="true" className={className} />;
    case "blocked":
      return <OctagonAlert aria-hidden="true" className={className} />;
    case "warning":
      return <TriangleAlert aria-hidden="true" className={className} />;
    case "current":
      return <CircleDot aria-hidden="true" className={className} />;
    default:
      return <CircleDashed aria-hidden="true" className={className} />;
  }
}

export function WorkflowProgress({
  journey,
  title = "Operations journey",
}: {
  journey: OperationsJourney;
  title?: string;
}) {
  return (
    <Card className="border-border/80 bg-card/88">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              Guided order without locking staff out of valid out-of-order work.
            </CardDescription>
          </div>
          <StatusBadge label={`${journey.completionPercent}% complete`} tone={journey.completionPercent >= 80 ? "success" : "warning"} />
        </div>
      </CardHeader>
      <CardContent>
        <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {journey.steps.map((step) => (
            <WorkflowStep key={step.id} step={step} />
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

export function WorkflowStep({ step }: { step: OperationsJourneyStep }) {
  const tone = toneForStatus(step.status);

  return (
    <li
      className={cn(
        "rounded-xl border border-border/70 bg-background/40 p-3",
        step.status === "current" ? "border-primary/45 bg-primary/8" : null,
        step.status === "blocked" ? "border-danger/35 bg-danger/8" : null,
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn("mt-0.5 text-muted-foreground", step.status === "current" ? "text-primary" : null)}>
          <StepIcon status={step.status} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground">{step.label}</p>
            <StatusBadge label={labelForStatus(step.status)} tone={tone} />
          </div>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">{step.description}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            {step.responsible}
          </p>
          {step.actionHref ? (
            <Button asChild className="mt-3" size="sm" variant="outline">
              <Link href={step.actionHref}>{step.actionLabel ?? "Open"}</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export function NextActionCard({
  action,
  title = "Next recommended action",
}: {
  action: OperationsNextAction | null;
  title?: string;
}) {
  if (!action) {
    return (
      <Card className="border-success/25 bg-success/8">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>All guided steps are complete for the current context.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={cn("border-primary/25 bg-primary/8", action.status === "blocked" ? "border-danger/35 bg-danger/8" : null)}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{action.reason}</CardDescription>
          </div>
          <StatusBadge label={labelForStatus(action.status)} tone={toneForStatus(action.status)} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Responsible: <span className="font-medium text-foreground">{action.responsible}</span>
        </p>
        <Button asChild>
          <Link href={action.href}>
            {action.label}
            <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function BlockingIssueSummary({
  steps,
}: {
  steps: OperationsJourneyStep[];
}) {
  const issues = steps.flatMap((step) =>
    step.blockingIssues.map((issue) => ({
      actionHref: step.actionHref,
      actionLabel: step.actionLabel,
      id: `${step.id}-${issue}`,
      issue,
      stepLabel: step.label,
    })),
  );

  if (issues.length === 0) {
    return null;
  }

  return (
    <Card className="border-danger/30 bg-danger/8">
      <CardHeader>
        <CardTitle>Blocking issues</CardTitle>
        <CardDescription>Resolve these before publication should proceed.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {issues.map((issue) => (
          <div
            className="flex flex-col gap-3 rounded-xl border border-border/70 bg-background/45 p-3 sm:flex-row sm:items-center sm:justify-between"
            key={issue.id}
          >
            <div>
              <p className="font-semibold text-foreground">{issue.stepLabel}</p>
              <p className="mt-1 text-sm text-muted-foreground">{issue.issue}</p>
            </div>
            {issue.actionHref ? (
              <Button asChild size="sm" variant="outline">
                <Link href={issue.actionHref}>{issue.actionLabel ?? "Fix issue"}</Link>
              </Button>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function CompletionChecklist({
  collapsedSummary,
  steps,
  title = "Completion checklist",
}: {
  collapsedSummary?: string;
  steps: OperationsJourneyStep[];
  title?: string;
}) {
  return (
    <Card className="border-border/80 bg-card/82">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              {collapsedSummary ?? "Calculated from current package state; no duplicate checklist state is stored."}
            </CardDescription>
          </div>
          <StatusBadge
            label={`${steps.filter((step) => step.status === "complete").length}/${steps.length}`}
            tone={steps.every((step) => step.status === "complete") ? "success" : "warning"}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {steps.map((step) => (
          <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-background/40 p-3" key={step.id}>
            <span className={cn("mt-0.5 text-muted-foreground", step.status === "complete" ? "text-success" : null)}>
              <StepIcon status={step.status} />
            </span>
            <div>
              <p className="font-medium text-foreground">{step.label}</p>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function ContextHeader({
  deployment,
  packageStatus,
  publishStatus,
  weekendOperation,
  week,
}: {
  deployment: string;
  packageStatus: string;
  publishStatus: string;
  weekendOperation: string;
  week: string;
}) {
  return (
    <Card className="border-border/80 bg-card/82">
      <CardContent className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          ["Deployment", deployment],
          ["Operational Week", week],
          ["Weekend Operation", weekendOperation],
          ["Package", packageStatus],
          ["Publish", publishStatus],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
            <p className="mt-1 truncate text-sm font-semibold text-foreground">{value}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function SaveStateIndicator({
  state,
}: {
  state: "saved" | "unsaved" | "saving" | "error";
}) {
  const tone: BadgeTone = state === "saved" ? "success" : state === "error" ? "danger" : "warning";

  return <StatusBadge label={state === "saved" ? "Saved" : state === "saving" ? "Saving" : state === "error" ? "Save failed" : "Unsaved changes"} tone={tone} />;
}

export function TransitionActions({
  actions,
}: {
  actions: Array<{
    href: string;
    isPrimary?: boolean;
    label: string;
  }>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Button asChild key={action.href} variant={action.isPrimary ? "default" : "outline"}>
          <Link href={action.href}>{action.label}</Link>
        </Button>
      ))}
    </div>
  );
}

export function HandoffSummary({
  items,
  title = "Next week handoff",
}: {
  items: Array<{
    label: string;
    value: string;
  }>;
  title?: string;
}) {
  return (
    <Card className="border-border/80 bg-card/82">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Carry-forward context for progression and future planning.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div className="rounded-xl border border-border/70 bg-background/40 p-3" key={item.label}>
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
            <p className="mt-1 text-sm leading-6 text-foreground">{item.value}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function OperationsHandoffRail({
  currentStep,
  handoffs,
  title = "Operations handoff path",
}: {
  currentStep?: string;
  handoffs: Array<{
    description: string;
    from: string;
    status?: BadgeTone;
    to: string;
  }>;
  title?: string;
}) {
  return (
    <Card className="border-border/80 bg-card/82">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              The current operational thread should always show who owns the next handoff and what context moves forward.
            </CardDescription>
          </div>
          {currentStep ? <StatusBadge label={currentStep} tone="info" /> : null}
        </div>
      </CardHeader>
      <CardContent>
        <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {handoffs.map((handoff) => (
            <li className="rounded-xl border border-border/70 bg-background/40 p-3" key={`${handoff.from}-${handoff.to}`}>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-foreground">{handoff.from}</p>
                <ArrowRight aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-semibold text-foreground">{handoff.to}</p>
                <StatusBadge label="Handoff" tone={handoff.status ?? "muted"} />
              </div>
              <p className="mt-2 text-sm leading-5 text-muted-foreground">{handoff.description}</p>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
