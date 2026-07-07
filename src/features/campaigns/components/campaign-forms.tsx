import type { ReactNode } from "react";

import {
  archiveCampaignAction,
  createCampaignAction,
  editCampaignAction,
  linkEventToCampaignAction,
  publishCampaignAction,
  unlinkEventFromCampaignAction,
  updateCampaignPhaseAction,
  updateCampaignStatusAction,
} from "@/server/campaigns/actions";
import type {
  CampaignDetail,
  CampaignReferenceData,
} from "@/server/campaigns/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const fieldClassName =
  "flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const textareaClassName =
  "flex min-h-24 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const labelClassName =
  "text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground";

type FormShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

function FormShell({ title, description, children }: FormShellProps) {
  return (
    <Card className="border-border/80 bg-card/88">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function getDateInputValue(value: Date | null) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 10);
}

function SelectField({
  name,
  label,
  options,
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  options: Array<{ id?: string; key?: string; label: string; hint?: string | null }>;
  defaultValue?: string | null;
  placeholder: string;
}) {
  return (
    <label className="space-y-2">
      <span className={labelClassName}>{label}</span>
      <select className={fieldClassName} defaultValue={defaultValue ?? ""} name={name}>
        <option value="">{placeholder}</option>
        {options.map((option) => {
          const value = option.id ?? option.key ?? option.label;

          return (
            <option key={value} value={value}>
              {option.label}
              {option.hint ? ` - ${option.hint}` : ""}
            </option>
          );
        })}
      </select>
    </label>
  );
}

export function CreateCampaignForm({
  returnTo,
}: {
  returnTo: string;
}) {
  return (
    <FormShell
      description="Create the deployment shell first, then build weekly operation events and tasking against it. Every active community unit participates automatically."
      title="Create deployment"
    >
      <form action={createCampaignAction} className="space-y-4">
        <input name="returnTo" type="hidden" value={returnTo} />
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClassName}>Key</span>
            <input className={fieldClassName} name="key" placeholder="cold-harbor" required />
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Deployment Name</span>
            <input className={fieldClassName} name="title" placeholder="Operation Cold Harbor" required />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2">
            <span className={labelClassName}>Operation Type</span>
            <input className={fieldClassName} name="phase" placeholder="Act I - Staging" />
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Duration weeks</span>
            <input className={fieldClassName} defaultValue={5} min={1} max={52} name="deploymentDurationWeeks" type="number" />
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Zeus assignment</span>
            <select className={fieldClassName} defaultValue="unassigned" name="zeusAssignmentType">
              <option value="unassigned">No Zeus assigned yet</option>
              <option value="creator">Creator is Zeus</option>
              <option value="assigned">Assigned S3 Zeus</option>
            </select>
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2">
            <span className={labelClassName}>Starts at</span>
            <input className={fieldClassName} name="startsAt" type="date" />
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Ends at</span>
            <input className={fieldClassName} name="endsAt" type="date" />
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Assigned Zeus user ID</span>
            <input className={fieldClassName} name="zeusUserId" placeholder="Only for assigned S3 Zeus" />
          </label>
        </div>
        <label className="space-y-2">
          <span className={labelClassName}>Deployment overview</span>
          <textarea className={textareaClassName} name="summary" placeholder="Deployment description, goals, or background story" />
        </label>
        <label className="space-y-2">
          <span className={labelClassName}>Reason</span>
          <textarea className={textareaClassName} name="reason" placeholder="Optional audit note" />
        </label>
        <Button type="submit">Create deployment</Button>
      </form>
    </FormShell>
  );
}

export function EditCampaignForm({
  campaign,
  returnTo,
}: {
  campaign: CampaignDetail;
  returnTo: string;
}) {
  return (
    <FormShell
      description="Update the deployment briefing, dates, duration, phase, and Zeus assignment without disturbing linked event history."
      title="Edit deployment"
    >
      <form action={editCampaignAction} className="space-y-4">
        <input name="campaignId" type="hidden" value={campaign.id} />
        <input name="returnTo" type="hidden" value={returnTo} />
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClassName}>Key</span>
            <input className={fieldClassName} defaultValue={campaign.key} name="key" required />
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Deployment Name</span>
            <input className={fieldClassName} defaultValue={campaign.title} name="title" required />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2">
            <span className={labelClassName}>Operation Type</span>
            <input className={fieldClassName} defaultValue={campaign.phase ?? ""} name="phase" />
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Duration weeks</span>
            <input className={fieldClassName} defaultValue={campaign.deploymentDurationWeeks ?? 5} min={1} max={52} name="deploymentDurationWeeks" type="number" />
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Zeus assignment</span>
            <select className={fieldClassName} defaultValue={campaign.zeusAssignmentType} name="zeusAssignmentType">
              <option value="unassigned">No Zeus assigned yet</option>
              <option value="creator">Creator is Zeus</option>
              <option value="assigned">Assigned S3 Zeus</option>
            </select>
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2">
            <span className={labelClassName}>Starts at</span>
            <input
              className={fieldClassName}
              defaultValue={getDateInputValue(campaign.startsAt)}
              name="startsAt"
              type="date"
            />
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Ends at</span>
            <input
              className={fieldClassName}
              defaultValue={getDateInputValue(campaign.endsAt)}
              name="endsAt"
              type="date"
            />
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Assigned Zeus user ID</span>
            <input
              className={fieldClassName}
              defaultValue={campaign.zeusUserId ?? ""}
              name="zeusUserId"
              placeholder="Only for assigned S3 Zeus"
            />
          </label>
        </div>
        <label className="space-y-2">
          <span className={labelClassName}>Deployment overview</span>
          <textarea className={textareaClassName} defaultValue={campaign.summary ?? ""} name="summary" />
        </label>
        <label className="space-y-2">
          <span className={labelClassName}>Reason</span>
          <textarea className={textareaClassName} name="reason" placeholder="Optional audit note" />
        </label>
        <Button type="submit">Save deployment</Button>
      </form>
    </FormShell>
  );
}

export function CampaignStatusForm({
  campaign,
  referenceData,
  returnTo,
}: {
  campaign: CampaignDetail;
  referenceData: CampaignReferenceData;
  returnTo: string;
}) {
  return (
    <FormShell
      description="Status changes drive deployment grouping, progress visibility, and operational reporting."
      title="Update status"
    >
      <form action={updateCampaignStatusAction} className="space-y-4">
        <input name="campaignId" type="hidden" value={campaign.id} />
        <input name="returnTo" type="hidden" value={returnTo} />
        <SelectField
          defaultValue={campaign.status}
          label="Status"
          name="status"
          options={referenceData.statuses}
          placeholder="Select status"
        />
        <label className="space-y-2">
          <span className={labelClassName}>Reason</span>
          <textarea className={textareaClassName} name="reason" placeholder="Optional status-change note" />
        </label>
        <Button type="submit" variant="outline">Update status</Button>
      </form>
    </FormShell>
  );
}

export function CampaignPhaseForm({
  campaign,
  returnTo,
}: {
  campaign: CampaignDetail;
  returnTo: string;
}) {
  return (
    <FormShell
      description="Keep the visible phase current so members and staff can read the operational story at a glance."
      title="Update operation type / phase"
    >
      <form action={updateCampaignPhaseAction} className="space-y-4">
        <input name="campaignId" type="hidden" value={campaign.id} />
        <input name="returnTo" type="hidden" value={returnTo} />
        <label className="space-y-2">
          <span className={labelClassName}>Phase</span>
          <input className={fieldClassName} defaultValue={campaign.phase ?? ""} name="phase" placeholder="Act II - Escalation" />
        </label>
        <label className="space-y-2">
          <span className={labelClassName}>Reason</span>
          <textarea className={textareaClassName} name="reason" placeholder="Optional phase-update note" />
        </label>
        <Button type="submit" variant="outline">Update phase</Button>
      </form>
    </FormShell>
  );
}

export function CampaignPublishForm({
  campaignId,
  returnTo,
}: {
  campaignId: string;
  returnTo: string;
}) {
  return (
    <FormShell
      description="Publishing marks the deployment ready for member-facing visibility without forcing a status change."
      title="Publish deployment"
    >
      <form action={publishCampaignAction} className="space-y-4">
        <input name="campaignId" type="hidden" value={campaignId} />
        <input name="returnTo" type="hidden" value={returnTo} />
        <label className="space-y-2">
          <span className={labelClassName}>Reason</span>
          <textarea className={textareaClassName} name="reason" placeholder="Optional publish note" />
        </label>
        <Button type="submit">Publish deployment</Button>
      </form>
    </FormShell>
  );
}

export function CampaignArchiveForm({
  campaignId,
  returnTo,
}: {
  campaignId: string;
  returnTo: string;
}) {
  return (
    <FormShell
      description="Archive deployments only when the operational record should move into historical reporting."
      title="Archive deployment"
    >
      <form action={archiveCampaignAction} className="space-y-4">
        <input name="campaignId" type="hidden" value={campaignId} />
        <input name="returnTo" type="hidden" value={returnTo} />
        <label className="space-y-2">
          <span className={labelClassName}>Reason</span>
          <textarea className={textareaClassName} name="reason" placeholder="Optional archive note" />
        </label>
        <Button type="submit" variant="outline">Archive deployment</Button>
      </form>
    </FormShell>
  );
}

export function LinkEventForm({
  campaign,
  referenceData,
  returnTo,
}: {
  campaign: CampaignDetail;
  referenceData: CampaignReferenceData;
  returnTo: string;
}) {
  return (
    <FormShell
      description="Link real events into the campaign timeline so progress and statistics stay grounded in operational records."
      title="Link event"
    >
      <form action={linkEventToCampaignAction} className="space-y-4">
        <input name="campaignId" type="hidden" value={campaign.id} />
        <input name="returnTo" type="hidden" value={returnTo} />
        <SelectField
          label="Event"
          name="eventId"
          options={referenceData.events}
          placeholder="Select event"
        />
        <label className="space-y-2">
          <span className={labelClassName}>Reason</span>
          <textarea className={textareaClassName} name="reason" placeholder="Optional timeline-management note" />
        </label>
        <Button type="submit">Link event</Button>
      </form>
      {campaign.timeline.length > 0 ? (
        <div className="space-y-3">
          {campaign.timeline.map((event) => (
            <Card key={event.id} className="border-border/70 bg-background/45">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-foreground">{event.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {event.hostUnit?.shortName ?? "Unscoped"} / {event.statusLabel}
                  </p>
                </div>
                <form action={unlinkEventFromCampaignAction}>
                  <input name="eventId" type="hidden" value={event.id} />
                  <input name="returnTo" type="hidden" value={returnTo} />
                  <Button type="submit" variant="outline">
                    Unlink
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </FormShell>
  );
}
