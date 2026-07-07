import { Download, ExternalLink, FileText, Gamepad2, History, Upload } from "lucide-react";

import {
  archiveDeploymentResourceAction,
  upsertDeploymentResourceAction,
} from "@/server/deployment-resources/actions";
import type { DeploymentResourceView } from "@/server/deployment-resources/types";
import {
  deploymentResourceTypeCatalog,
  deploymentResourceVisibilityCatalog,
} from "@/server/database/catalogs";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/status/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/formatters";

const fieldClassName =
  "flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const textareaClassName =
  "flex min-h-20 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const labelClassName = "text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground";

function getResourceActionLabel(resource: DeploymentResourceView) {
  switch (resource.resourceType) {
    case "CONOP":
      return "Open CONOP";
    case "OPORD":
      return "Open OPORD";
    case "PLAYER_PRIMER":
      return "Open Player Primer";
    case "ARMA3_PRESET":
      return "Download Mod Preset";
    case "MAP":
      return "Open AO Map";
    case "RADIO_PLAN":
      return "View Radio Plan";
    default:
      return resource.currentVersion?.sourceType === "file" ? "Download Resource" : "Open Resource";
  }
}

function ResourceIcon({ resourceType }: { resourceType: string }) {
  if (resourceType === "ARMA3_PRESET") {
    return <Gamepad2 className="h-4 w-4" />;
  }

  if (resourceType === "CONOP" || resourceType === "OPORD" || resourceType === "PLAYER_PRIMER") {
    return <FileText className="h-4 w-4" />;
  }

  return <Download className="h-4 w-4" />;
}

function ResourceActionButton({ resource }: { resource: DeploymentResourceView }) {
  const version = resource.currentVersion;

  if (!version?.downloadUrl) {
    return null;
  }

  return (
    <Button asChild size="sm" variant={resource.resourceType === "ARMA3_PRESET" ? "default" : "outline"}>
      <a href={version.downloadUrl} rel="noreferrer" target={version.sourceType === "url" ? "_blank" : undefined}>
        <ResourceIcon resourceType={resource.resourceType} />
        {getResourceActionLabel(resource)}
        {version.sourceType === "url" ? <ExternalLink className="h-3.5 w-3.5" /> : null}
      </a>
    </Button>
  );
}

function ResourceVersionHistory({
  resource,
}: {
  resource: DeploymentResourceView;
}) {
  if (resource.versions.length <= 1) {
    return null;
  }

  return (
    <details className="rounded-xl border border-border/70 bg-background/35 p-3">
      <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-foreground">
        <History className="h-4 w-4" />
        Version history
      </summary>
      <div className="mt-3 space-y-2">
        {resource.versions.map((version) => (
          <div key={version.id} className="rounded-lg border border-border/70 bg-card/65 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">Version {version.versionNumber}</p>
              <div className="flex flex-wrap gap-2">
                {version.isCurrent ? <StatusBadge label="Current" tone="success" /> : null}
                {version.archivedAt ? <StatusBadge label="Archived" tone="muted" /> : null}
              </div>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Uploaded {formatDateTime(version.uploadedAt)}
              {version.uploadedByName ? ` by ${version.uploadedByName}` : ""}
            </p>
            {version.downloadUrl ? (
              <Button asChild className="mt-2" size="sm" variant="outline">
                <a href={version.downloadUrl}>Download version</a>
              </Button>
            ) : null}
          </div>
        ))}
      </div>
    </details>
  );
}

function DeploymentResourceForm({
  campaignId,
  eventId,
  resource,
  returnTo,
}: {
  campaignId: string;
  eventId?: string | null;
  resource?: DeploymentResourceView | null;
  returnTo: string;
}) {
  return (
    <details className="rounded-xl border border-border/70 bg-background/35 p-4">
      <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-foreground">
        <Upload className="h-4 w-4" />
        {resource ? `Upload replacement for ${resource.displayName}` : "Add resource"}
      </summary>
      <form action={upsertDeploymentResourceAction} className="mt-4 space-y-4">
        <input name="campaignId" type="hidden" value={campaignId} />
        <input name="returnTo" type="hidden" value={returnTo} />
        {eventId ? <input name="eventId" type="hidden" value={eventId} /> : null}
        {resource ? <input name="resourceId" type="hidden" value={resource.id} /> : null}
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClassName}>Resource Type</span>
            <select className={fieldClassName} defaultValue={resource?.resourceType ?? (eventId ? "CONOP" : "OPORD")} name="resourceType" required>
              {deploymentResourceTypeCatalog.map((type) => (
                <option key={type.key} value={type.key}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Display Name</span>
            <input
              className={fieldClassName}
              defaultValue={resource?.displayName ?? ""}
              name="displayName"
              placeholder={eventId ? "Weekly Operation CONOP" : "Current Mod Preset"}
              required
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2 md:col-span-2">
            <span className={labelClassName}>External URL</span>
            <input className={fieldClassName} name="url" placeholder="https://..." />
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Visibility</span>
            <select className={fieldClassName} defaultValue={resource?.visibility ?? "members"} name="visibility">
              {deploymentResourceVisibilityCatalog.map((visibility) => (
                <option key={visibility.key} value={visibility.key}>
                  {visibility.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="space-y-2">
          <span className={labelClassName}>Uploaded File</span>
          <input
            accept=".pdf,.docx,.xlsx,.pptx,.zip,.png,.jpg,.jpeg,.webp,.txt,.html,.htm,.csv,.json"
            className={fieldClassName}
            name="file"
            type="file"
          />
        </label>
        <label className="space-y-2">
          <span className={labelClassName}>Description</span>
          <textarea className={textareaClassName} defaultValue={resource?.description ?? ""} name="description" placeholder="Optional member-facing context" />
        </label>
        <label className="space-y-2">
          <span className={labelClassName}>Change Note</span>
          <textarea className={textareaClassName} name="changeNote" placeholder="What changed in this version?" />
        </label>
        <Button type="submit">{resource ? "Create new version" : "Save resource version"}</Button>
      </form>
    </details>
  );
}

export function DeploymentResourcesCard({
  campaignId,
  canManage,
  eventId,
  resources,
  returnTo,
  showHistory,
  title = "Deployment Resources",
}: {
  campaignId: string;
  canManage: boolean;
  eventId?: string | null;
  resources: DeploymentResourceView[];
  returnTo: string;
  showHistory: boolean;
  title?: string;
}) {
  const currentPreset = resources.find((resource) => resource.resourceType === "ARMA3_PRESET");
  const conop = resources.find((resource) => resource.resourceType === "CONOP");

  return (
    <Card className="border-border/80 bg-card/88">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {eventId
            ? "Weekly operation package resources, including CONOP file/link, mod preset overrides, and inherited deployment links."
            : "Current deployment links and downloads. Staff can inspect historical versions without changing what members see."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {conop?.currentVersion ? (
          <div className="rounded-xl border border-info/25 bg-info/10 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  Current CONOP
                </p>
                <p className="mt-1 font-semibold text-foreground">{conop.displayName}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {conop.description ?? "Weekly operation CONOP file or external link."}
                </p>
              </div>
              <ResourceActionButton resource={conop} />
            </div>
          </div>
        ) : null}
        {currentPreset?.currentVersion ? (
          <div className="rounded-xl border border-primary/25 bg-primary/10 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  Current Mod Preset
                </p>
                <p className="mt-1 font-semibold text-foreground">
                  {currentPreset.currentVersion.parsedName ?? currentPreset.displayName}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {currentPreset.currentVersion.parsedModCount !== null
                    ? `${currentPreset.currentVersion.parsedModCount} mods`
                    : "Mod count unavailable"}{" "}
                  / Uploaded {formatDateTime(currentPreset.currentVersion.uploadedAt)}
                </p>
              </div>
              <ResourceActionButton resource={currentPreset} />
            </div>
          </div>
        ) : null}
        {resources.length > 0 ? (
          <div className="grid gap-3">
            {resources.map((resource) => (
              <div key={resource.id} className="rounded-xl border border-border/70 bg-background/45 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge label={resource.resourceTypeLabel} tone="info" />
                      {resource.currentVersion ? <StatusBadge label={`v${resource.currentVersion.versionNumber}`} tone="muted" /> : null}
                    </div>
                    <p className="mt-2 font-semibold text-foreground">{resource.displayName}</p>
                    {resource.description ? (
                      <p className="mt-1 text-sm text-muted-foreground">{resource.description}</p>
                    ) : null}
                    {resource.currentVersion ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Uploaded {formatDateTime(resource.currentVersion.uploadedAt)}
                        {resource.currentVersion.uploadedByName ? ` by ${resource.currentVersion.uploadedByName}` : ""}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ResourceActionButton resource={resource} />
                    {canManage ? (
                      <form action={archiveDeploymentResourceAction}>
                        <input name="resourceId" type="hidden" value={resource.id} />
                        <input name="returnTo" type="hidden" value={returnTo} />
                        <Button size="sm" type="submit" variant="outline">
                          Archive
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </div>
                {canManage ? (
                  <div className="mt-3">
                    <DeploymentResourceForm campaignId={campaignId} eventId={resource.eventId} resource={resource} returnTo={returnTo} />
                  </div>
                ) : null}
                {showHistory ? <div className="mt-3"><ResourceVersionHistory resource={resource} /></div> : null}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            description="No deployment resources have been added yet."
            title="No resources attached"
          />
        )}
        {canManage ? (
          <DeploymentResourceForm campaignId={campaignId} eventId={eventId} returnTo={returnTo} />
        ) : null}
      </CardContent>
    </Card>
  );
}
