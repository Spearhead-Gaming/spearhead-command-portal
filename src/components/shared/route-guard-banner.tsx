import { ShieldCheck, Sparkles } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { AuthenticatedPortalSession } from "@/features/auth/types";

type RouteGuardBannerProps = {
  session: AuthenticatedPortalSession;
};

export function RouteGuardBanner({ session }: RouteGuardBannerProps) {
  const hasPermissions = session.user.permissions.length > 0;
  const identityStatus = session.user.discordLinked
    ? "Discord identity is linked to this portal account."
    : "This session does not have a linked Discord identity yet.";

  return (
    <Card
      className={
        session.user.memberProfileLinked
          ? "border-info/30 bg-info/10"
          : "border-warning/30 bg-warning/10"
      }
    >
      <CardContent
        className={
          session.user.memberProfileLinked
            ? "flex flex-col gap-3 p-4 text-sm text-info sm:flex-row sm:items-center sm:justify-between"
            : "flex flex-col gap-3 p-4 text-sm text-warning sm:flex-row sm:items-center sm:justify-between"
        }
      >
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-1">
            <p className="font-semibold uppercase tracking-[0.16em]">
              {session.user.memberProfileLinked
                ? "Authenticated access active"
                : "Authenticated with follow-up required"}
            </p>
            <p className={session.user.memberProfileLinked ? "text-info/90" : "text-warning/90"}>
              {session.user.memberProfileLinked
                ? "Portal access is now backed by authenticated sessions and permission keys. Business workflows remain intentionally milestone-scoped."
                : "This authenticated account is not linked to a member profile yet. Personnel-aware workflows should stay limited until profile linking is completed."}
            </p>
            <p className={session.user.memberProfileLinked ? "text-info/80" : "text-warning/80"}>
              {identityStatus}
            </p>
            <p className={session.user.memberProfileLinked ? "text-info/80" : "text-warning/80"}>
              {hasPermissions
                ? `${session.user.permissions.length} permission key${session.user.permissions.length === 1 ? "" : "s"} loaded from role assignments.`
                : "No permission keys are currently assigned, so navigation and future feature access will stay limited."}
            </p>
          </div>
        </div>
        <div
          className={
            session.user.memberProfileLinked
              ? "flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-info/85"
              : "flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-warning/85"
          }
        >
          <Sparkles className="h-4 w-4" />
          {session.mode}
        </div>
      </CardContent>
    </Card>
  );
}
