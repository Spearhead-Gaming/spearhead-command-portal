"use client";

import { ErrorRecoveryActions, RouteStateCard } from "@/components/layout/route-state";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteStateCard
      actions={<ErrorRecoveryActions onReset={reset} />}
      description={`The portal hit an unexpected error before it could finish rendering this route. ${error.digest ? `Reference: ${error.digest}.` : "Try again, or return to the dashboard."}`}
      eyebrow="Route Error"
      title="This command view could not load"
    />
  );
}
