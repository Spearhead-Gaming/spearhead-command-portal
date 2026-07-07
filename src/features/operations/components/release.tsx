import Link from "next/link";

import { StatusBadge } from "@/components/status/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/formatters";
import { publishOperationsPackageAction } from "@/server/operations-package/actions";
import type { OperationsPackageData, OperationsReleaseHistoryItem } from "@/server/operations-package/types";

const fieldClassName =
  "flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const textareaClassName =
  "min-h-24 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const labelClassName = "text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground";

function getReleaseTone(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("published")) {
    return "success" as const;
  }

  if (normalized.includes("scheduled") || normalized.includes("approved")) {
    return "info" as const;
  }

  if (normalized.includes("superseded") || normalized.includes("archived")) {
    return "muted" as const;
  }

  return "warning" as const;
}

export function OperationsReleasePreviewCard({ data }: { data: OperationsPackageData }) {
  const preview = data.release?.preview;

  if (!preview) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-linear-to-br from-primary/10 via-card/90 to-background">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Publish Preview</CardTitle>
            <CardDescription>Discord-style preview of what members will receive.</CardDescription>
          </div>
          <StatusBadge label={preview.releaseVersion} tone="info" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-border/70 bg-background/55 p-4">
          <p className="text-lg font-semibold text-foreground">{preview.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{preview.summary}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {preview.discordFields.map((field) => (
              <div key={field.label} className="rounded-xl border border-border/60 bg-card/60 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{field.label}</p>
                <p className="mt-2 whitespace-pre-line text-sm text-foreground">{field.value}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs uppercase tracking-[0.16em] text-muted-foreground">{preview.footer}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function OperationsReleasePublishCard({
  data,
  returnTo,
}: {
  data: OperationsPackageData;
  returnTo: string;
}) {
  const readinessBlocked = Boolean(data.readiness?.blockingIssues.length);
  const canPublish = data.permissions.canPublishPackage && !readinessBlocked;
  const hasCurrentRelease = Boolean(data.release?.current);

  return (
    <Card className="border-border/80 bg-card/88">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{hasCurrentRelease ? "Publish Amendment" : "Publish Release"}</CardTitle>
            <CardDescription>
              Publishing creates a permanent Operations Release snapshot and posts to the mapped Discord event channel.
            </CardDescription>
          </div>
          <StatusBadge
            label={canPublish ? "Ready to publish" : "Publication blocked"}
            tone={canPublish ? "success" : "danger"}
          />
        </div>
      </CardHeader>
      <CardContent>
        <form action={publishOperationsPackageAction} className="space-y-4">
          <input name="campaignId" type="hidden" value={data.campaign.id} />
          <input name="weekNumber" type="hidden" value={data.week.weekNumber} />
          <input name="returnTo" type="hidden" value={returnTo} />
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className={labelClassName}>Version Bump</span>
              <select className={fieldClassName} defaultValue={hasCurrentRelease ? "minor" : "minor"} name="versionBump">
                <option value="minor">Minor / Amendment</option>
                <option value="major">Major / New tasking baseline</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className={labelClassName}>Schedule Publish</span>
              <input className={fieldClassName} name="scheduledFor" type="datetime-local" />
            </label>
          </div>
          <label className="block space-y-2">
            <span className={labelClassName}>Release Notes</span>
            <textarea
              className={textareaClassName}
              name="releaseNotes"
              placeholder={hasCurrentRelease ? "Updated Mod Preset, corrected timeline..." : "Initial Publication"}
            />
          </label>
          <label className="block space-y-2">
            <span className={labelClassName}>Amendment Summary</span>
            <textarea
              className={textareaClassName}
              name="amendmentSummary"
              placeholder="What changed compared with the previous release?"
            />
          </label>
          {readinessBlocked ? (
            <p className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-muted-foreground">
              Resolve blocking publication readiness issues before publishing.
            </p>
          ) : null}
          <Button disabled={!canPublish} type="submit">
            {hasCurrentRelease ? "Publish Amendment" : "Publish Release"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function OperationsReleaseHistoryList({
  history,
}: {
  history: OperationsReleaseHistoryItem[];
}) {
  if (history.length === 0) {
    return (
      <Card className="border-border/80 bg-card/82">
        <CardHeader>
          <CardTitle>Release History</CardTitle>
          <CardDescription>No releases have been published or scheduled for this package yet.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-border/80 bg-card/82">
      <CardHeader>
        <CardTitle>Release History</CardTitle>
        <CardDescription>Permanent release and amendment records for this operational week.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {history.map((release) => (
          <div key={release.id} className="rounded-xl border border-border/70 bg-background/45 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-semibold text-foreground">{release.releaseVersion}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {release.publishedAt
                    ? `Published ${formatDateTime(release.publishedAt)}`
                    : release.scheduledFor
                      ? `Scheduled ${formatDateTime(release.scheduledFor)}`
                      : "Not published yet"}
                  {release.publishedByName ? ` by ${release.publishedByName}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge label={release.status} tone={getReleaseTone(release.status)} />
                <StatusBadge label={`Discord ${release.discordStatus}`} tone={release.discordStatus === "sent" ? "success" : release.discordStatus === "failed" ? "danger" : "muted"} />
              </div>
            </div>
            {release.releaseNotes ? (
              <p className="mt-3 text-sm text-muted-foreground">{release.releaseNotes}</p>
            ) : null}
            {release.amendmentSummary ? (
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Amendment:</span> {release.amendmentSummary}
              </p>
            ) : null}
            {release.discordErrorMessage ? (
              <p className="mt-2 text-sm text-danger">{release.discordErrorMessage}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href={`#release-${release.id}`}>Open Release</Link>
              </Button>
              <Button disabled size="sm" variant="outline">
                Compare Releases
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
