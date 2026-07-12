import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function WeeklyTaskingRoute() {
  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={["Operations", "Weekly Tasking"]}
        description="Weekly tasking is managed inside each Operations Package so planning, resources, CONOP, Zeus assignment, readiness, and publication stay together."
        primaryAction={{
          href: "/operations/deployments",
          label: "Open Deployments",
        }}
        title="Weekly Tasking"
      />
      <Card className="border-border/80 bg-card/82">
        <CardHeader>
          <CardTitle>Tasking lives with the Operations Package</CardTitle>
          <CardDescription>
            Use this route as a stable waypoint while Phase 3 consolidates tasking around the current operational week.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <EmptyState
            description="Open a deployment and choose an operational week to update weekly tasking and unit tasking in context."
            title="No standalone tasking board"
          />
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/operations">Operations Center</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/operations/deployments">Deployments</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
