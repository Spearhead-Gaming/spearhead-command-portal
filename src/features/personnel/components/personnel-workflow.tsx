import Link from "next/link";

import { StatusBadge, type BadgeTone } from "@/components/status/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type PersonnelNextAction = {
  href: string;
  label: string;
  reason: string;
  responsible: string;
  tone?: BadgeTone;
};

export function PersonnelNextActionCard({
  action,
  title = "Personnel next action",
}: {
  action: PersonnelNextAction | null;
  title?: string;
}) {
  if (!action) {
    return (
      <Card className="border-success/25 bg-success/8">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>No visible personnel action is blocking the current context.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-primary/25 bg-primary/8">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{action.reason}</CardDescription>
          </div>
          <StatusBadge label={action.responsible} tone={action.tone ?? "info"} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Owner: <span className="font-medium text-foreground">{action.responsible}</span>
        </p>
        <Button asChild>
          <Link href={action.href}>{action.label}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function PersonnelHandoffRail({
  currentStep,
  handoffs,
  title = "Personnel handoff path",
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
              Personnel workflows should show who owns the next review without exposing restricted notes.
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
                <span aria-hidden="true" className="text-muted-foreground">-&gt;</span>
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
