import Link from "next/link";
import type React from "react";

import { LoadingSkeleton } from "@/components/data/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type RouteStateProps = {
  actions?: React.ReactNode;
  description: string;
  eyebrow: string;
  title: string;
};

export function RouteStateCard({
  actions,
  description,
  eyebrow,
  title,
}: RouteStateProps) {
  return (
    <section className="flex min-h-[60vh] items-center justify-center p-4 sm:p-6 lg:p-8">
      <Card className="w-full max-w-2xl border-border/90 bg-card/88">
        <CardHeader className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
            {eyebrow}
          </p>
          <div className="space-y-2">
            <CardTitle className="text-3xl sm:text-4xl">{title}</CardTitle>
            <CardDescription className="text-base leading-7">{description}</CardDescription>
          </div>
        </CardHeader>
        {actions ? <CardContent className="flex flex-col gap-3 sm:flex-row">{actions}</CardContent> : null}
      </Card>
    </section>
  );
}

export function RouteLoadingState({
  className,
  label = "Preparing command workspace",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <section
      aria-label={label}
      className={cn("grid gap-4 p-4 sm:p-6 lg:p-8", className)}
    >
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
          Loading
        </p>
        <h1 className="text-2xl font-semibold text-foreground">{label}</h1>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <LoadingSkeleton rows={4} />
        <LoadingSkeleton rows={4} />
        <LoadingSkeleton rows={4} />
      </div>
      <LoadingSkeleton rows={6} />
    </section>
  );
}

export function ErrorRecoveryActions({
  onReset,
}: {
  onReset?: () => void;
}) {
  return (
    <>
      {onReset ? (
        <Button onClick={onReset} type="button">
          Try Again
        </Button>
      ) : null}
      <Button asChild variant="outline">
        <Link href="/dashboard">Return to Dashboard</Link>
      </Button>
    </>
  );
}
