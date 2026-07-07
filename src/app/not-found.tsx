import Link from "next/link";

import { RouteStateCard } from "@/components/layout/route-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <RouteStateCard
      actions={
        <>
          <Button asChild>
            <Link href="/dashboard">Return to Dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/login">Go to Login</Link>
          </Button>
        </>
      }
      description="The requested route does not exist in the current command portal build. Use the dashboard or primary navigation to get back into a supported workspace."
      eyebrow="404"
      title="Route not found"
    />
  );
}
