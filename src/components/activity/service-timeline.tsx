import {
  Award,
  BriefcaseBusiness,
  CalendarCheck2,
  ClipboardList,
  Milestone,
  Shield,
  UserRoundPlus,
  Users,
} from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/status/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/formatters";
import type { MemberServiceTimelineEntry } from "@/server/personnel/types";

type ServiceTimelineProps = {
  title?: string;
  description?: string;
  entries: MemberServiceTimelineEntry[];
  emptyTitle?: string;
  emptyDescription?: string;
  order?: "asc" | "desc";
};

function getEntryIcon(type: MemberServiceTimelineEntry["type"]) {
  switch (type) {
    case "profile-created":
    case "joined-community":
      return UserRoundPlus;
    case "rank-changed":
    case "unit-changed":
    case "position-changed":
    case "status-changed":
      return Milestone;
    case "qualification-awarded":
    case "qualification-revoked":
      return Award;
    case "event-attended":
    case "event-missed":
      return CalendarCheck2;
    case "campaign-participation":
      return Users;
    case "note-added":
      return ClipboardList;
    case "audit":
      return Shield;
    default:
      return BriefcaseBusiness;
  }
}

export function ServiceTimeline({
  title = "Service timeline",
  description = "Human-readable personnel history built from roster, qualification, attendance, deployment, and audit records.",
  entries,
  emptyTitle = "No service history yet",
  emptyDescription = "Timeline entries will appear here as the member record accrues real roster and operational history.",
  order = "asc",
}: ServiceTimelineProps) {
  const orderedEntries = entries
    .slice()
    .sort((left, right) =>
      order === "asc"
        ? left.timestamp.getTime() - right.timestamp.getTime()
        : right.timestamp.getTime() - left.timestamp.getTime(),
    );

  return (
    <Card className="border-border/80 bg-card/88">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {orderedEntries.length === 0 ? (
          <EmptyState description={emptyDescription} title={emptyTitle} />
        ) : (
          <ol className="space-y-4">
            {orderedEntries.map((entry, index) => {
              const Icon = getEntryIcon(entry.type);

              return (
                <li key={entry.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border/80 bg-background/55 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    {index < orderedEntries.length - 1 ? (
                      <div className="mt-2 h-full w-px bg-border/80" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2 pb-6">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">{entry.title}</p>
                        <p className="text-sm leading-6 text-muted-foreground">{entry.description}</p>
                      </div>
                      {entry.badgeLabel ? (
                        <StatusBadge label={entry.badgeLabel} tone={entry.badgeTone} />
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      <span>{formatDateTime(entry.timestamp)}</span>
                      {entry.actorDisplayName ? <span>Actor: {entry.actorDisplayName}</span> : null}
                      {entry.relatedLabel ? <span>Related: {entry.relatedLabel}</span> : null}
                    </div>
                    {entry.details.length > 0 ? (
                      <ul className="space-y-1">
                        {entry.details.map((detail) => (
                          <li key={detail} className="text-sm text-muted-foreground">
                            {detail}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
