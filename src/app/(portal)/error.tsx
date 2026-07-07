"use client";

import { ErrorRecoveryActions, RouteStateCard } from "@/components/layout/route-state";

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteStateCard
      actions={<ErrorRecoveryActions onReset={reset} />}
      description={`The protected workspace failed to render. Permissions, database connectivity, and service-layer exceptions should surface here instead of a blank page. ${error.digest ? `Reference: ${error.digest}.` : ""}`}
      eyebrow="Workspace Error"
      title="This portal workspace could not load"
    />
  );
}
