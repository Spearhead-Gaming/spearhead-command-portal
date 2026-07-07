import type { ReactNode } from "react";

import {
  approveMissionAction,
  archiveMissionAction,
  createConopAction,
  createMissionAction,
  editAarAction,
  editConopAction,
  editMissionAction,
  publishConopAction,
  publishMissionAction,
  rejectMissionAction,
  reviewAarAction,
  submitAarAction,
  submitMissionForReviewAction,
  updateMissionStatusAction,
} from "@/server/s3/actions";
import type {
  AarDetail,
  ConopDetail,
  MissionDetail,
  S3ReferenceData,
} from "@/server/s3/types";
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

function getDateTimeInputValue(value: Date | null) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 16);
}

export function MissionForm({
  defaultEventType,
  mission,
  referenceData,
  returnTo,
}: {
  defaultEventType?: string | null;
  mission?: MissionDetail | null;
  referenceData: S3ReferenceData;
  returnTo: string;
}) {
  const action = mission ? editMissionAction : createMissionAction;

  return (
    <FormShell
      description="Operation records stay tied to the event system so scheduling, publication, attendance, and S3 review remain one workflow."
      title={mission ? "Edit operation" : "Create operation"}
    >
      <form action={action} className="space-y-4">
        {mission ? <input name="missionId" type="hidden" value={mission.id} /> : null}
        <input name="returnTo" type="hidden" value={returnTo} />
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClassName}>Operation title</span>
            <input
              className={fieldClassName}
              defaultValue={mission?.title ?? ""}
              name="title"
              placeholder="Operation Long Reach"
              required
            />
          </label>
          <SelectField
            defaultValue={mission?.eventType ?? defaultEventType ?? null}
            label="Operation type"
            name="eventType"
            options={referenceData.eventTypes}
            placeholder="Select operation type"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            defaultValue={mission?.hostUnit?.id ?? null}
            label="Host unit"
            name="hostUnitId"
            options={referenceData.units}
            placeholder="Select host unit"
          />
          <SelectField
            defaultValue={mission?.campaign?.id ?? null}
            label="Deployment"
            name="campaignId"
            options={referenceData.campaigns}
            placeholder="Optional deployment"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClassName}>Starts at</span>
            <input
              className={fieldClassName}
              defaultValue={getDateTimeInputValue(mission?.startsAt ?? null)}
              name="startsAt"
              required
              type="datetime-local"
            />
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Ends at</span>
            <input
              className={fieldClassName}
              defaultValue={getDateTimeInputValue(mission?.endsAt ?? null)}
              name="endsAt"
              type="datetime-local"
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2">
            <span className={labelClassName}>Planner</span>
            <input
              className={fieldClassName}
              defaultValue={mission?.missionMakerName ?? ""}
              name="missionMakerName"
              placeholder="Planner name"
            />
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Zeus</span>
            <input
              className={fieldClassName}
              defaultValue={mission?.zeusName ?? ""}
              name="zeusName"
              placeholder="Zeus name"
            />
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Operation lead</span>
            <input
              className={fieldClassName}
              defaultValue={mission?.missionCommanderName ?? ""}
              name="missionCommanderName"
              placeholder="Operation lead"
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClassName}>Operation version label</span>
            <input
              className={fieldClassName}
              defaultValue={mission?.operationVersionLabel ?? ""}
              name="operationVersionLabel"
              placeholder="Week 3A, Route Hammer, v2"
            />
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Selected operation version</span>
            <input
              className={fieldClassName}
              defaultValue={mission?.selectedOperationVersion ?? ""}
              name="selectedOperationVersion"
              placeholder="Primary path, fallback route, version B"
            />
          </label>
        </div>
        <label className="space-y-2">
          <span className={labelClassName}>Description</span>
          <textarea
            className={textareaClassName}
            defaultValue={mission?.description ?? ""}
            name="description"
            placeholder="Operation brief, intent, or planning notes"
          />
        </label>
        <label className="space-y-2">
          <span className={labelClassName}>Reason</span>
          <textarea className={textareaClassName} name="reason" placeholder="Optional audit note" />
        </label>
        <Button type="submit">{mission ? "Save operation" : "Create operation"}</Button>
      </form>
    </FormShell>
  );
}

const missionLifecycleActions = {
  review: {
    title: "Submit for review",
    description: "Move the operation into the S3 review queue.",
    action: submitMissionForReviewAction,
    submitLabel: "Submit for review",
  },
  approve: {
    title: "Approve operation",
    description: "Mark the operation ready for publication.",
    action: approveMissionAction,
    submitLabel: "Approve operation",
  },
  reject: {
    title: "Reject operation",
    description: "Return the operation to draft so the planner can revise it.",
    action: rejectMissionAction,
    submitLabel: "Reject to draft",
  },
  publish: {
    title: "Publish operation",
    description: "Publish the operation to the operational calendar and member-facing workspace.",
    action: publishMissionAction,
    submitLabel: "Publish operation",
  },
  archive: {
    title: "Archive operation",
    description: "Close out the operation lifecycle and move it into the archive.",
    action: archiveMissionAction,
    submitLabel: "Archive operation",
  },
} as const;

export function MissionLifecycleForm({
  actionKey,
  missionId,
  returnTo,
}: {
  actionKey: keyof typeof missionLifecycleActions;
  missionId: string;
  returnTo: string;
}) {
  const config = missionLifecycleActions[actionKey];

  return (
    <FormShell description={config.description} title={config.title}>
      <form action={config.action} className="space-y-4">
        <input name="missionId" type="hidden" value={missionId} />
        <input name="returnTo" type="hidden" value={returnTo} />
        <label className="space-y-2">
          <span className={labelClassName}>Reason</span>
          <textarea className={textareaClassName} name="reason" placeholder="Optional audit note" />
        </label>
        <Button type="submit">{config.submitLabel}</Button>
      </form>
    </FormShell>
  );
}

export function MissionStatusForm({
  mission,
  referenceData,
  returnTo,
}: {
  mission: MissionDetail;
  referenceData: S3ReferenceData;
  returnTo: string;
}) {
  return (
    <FormShell
      description="Use the explicit lifecycle state when the operation needs manual correction or closeout."
      title="Update operation status"
    >
      <form action={updateMissionStatusAction} className="space-y-4">
        <input name="missionId" type="hidden" value={mission.id} />
        <input name="returnTo" type="hidden" value={returnTo} />
        <SelectField
          defaultValue={mission.missionStatus}
          label="Operation status"
          name="missionStatus"
          options={referenceData.missionStatuses}
          placeholder="Select operation status"
        />
        <label className="space-y-2">
          <span className={labelClassName}>Reason</span>
          <textarea className={textareaClassName} name="reason" placeholder="Optional audit note" />
        </label>
        <Button type="submit" variant="outline">
          Update status
        </Button>
      </form>
    </FormShell>
  );
}

export function ConopForm({
  conop,
  referenceData,
  returnTo,
}: {
  conop?: ConopDetail | null;
  referenceData: S3ReferenceData;
  returnTo: string;
}) {
  const action = conop ? editConopAction : createConopAction;

  return (
    <FormShell
      description="Capture CONOP structure directly in the portal so operation and deployment context stay one click away."
      title={conop ? "Edit CONOP" : "Create CONOP"}
    >
      <form action={action} className="space-y-4">
        {conop ? <input name="conopId" type="hidden" value={conop.id} /> : null}
        <input name="returnTo" type="hidden" value={returnTo} />
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClassName}>Title</span>
            <input
              className={fieldClassName}
              defaultValue={conop?.title ?? ""}
              name="title"
              placeholder="CONOP title"
              required
            />
          </label>
          <SelectField
            defaultValue={conop?.event?.id ?? null}
            label="Related event"
            name="eventId"
            options={referenceData.events}
            placeholder="Optional event"
          />
        </div>
        <SelectField
          defaultValue={conop?.campaign?.id ?? null}
            label="Related deployment"
          name="campaignId"
          options={referenceData.campaigns}
          placeholder="Optional deployment"
        />
        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2">
            <span className={labelClassName}>Planner</span>
            <input className={fieldClassName} defaultValue={conop?.missionMakerName ?? ""} name="missionMakerName" />
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Zeus</span>
            <input className={fieldClassName} defaultValue={conop?.zeusName ?? ""} name="zeusName" />
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Operation lead</span>
            <input className={fieldClassName} defaultValue={conop?.missionCommanderName ?? ""} name="missionCommanderName" />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClassName}>Map</span>
            <input className={fieldClassName} defaultValue={conop?.mapName ?? ""} name="mapName" />
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Mod preset</span>
            <input className={fieldClassName} defaultValue={conop?.modPreset ?? ""} name="modPreset" />
          </label>
        </div>
        <label className="space-y-2">
          <span className={labelClassName}>Unit Tasking summary</span>
          <input
            className={fieldClassName}
            defaultValue={conop?.participatingUnitsSummary ?? ""}
            name="participatingUnitsSummary"
            placeholder="Unit tasking summary or all active units"
          />
        </label>
        <label className="space-y-2">
          <span className={labelClassName}>Situation</span>
          <textarea className={textareaClassName} defaultValue={conop?.situation ?? ""} name="situation" />
        </label>
        <label className="space-y-2">
          <span className={labelClassName}>Operation brief</span>
          <textarea className={textareaClassName} defaultValue={conop?.mission ?? ""} name="mission" />
        </label>
        <label className="space-y-2">
          <span className={labelClassName}>Execution</span>
          <textarea className={textareaClassName} defaultValue={conop?.execution ?? ""} name="execution" />
        </label>
        <label className="space-y-2">
          <span className={labelClassName}>Sustainment</span>
          <textarea className={textareaClassName} defaultValue={conop?.sustainment ?? ""} name="sustainment" />
        </label>
        <label className="space-y-2">
          <span className={labelClassName}>Command and signal</span>
          <textarea className={textareaClassName} defaultValue={conop?.commandSignal ?? ""} name="commandSignal" />
        </label>
        <label className="space-y-2">
          <span className={labelClassName}>Special instructions</span>
          <textarea className={textareaClassName} defaultValue={conop?.specialInstructions ?? ""} name="specialInstructions" />
        </label>
        <label className="space-y-2">
          <span className={labelClassName}>Reason</span>
          <textarea className={textareaClassName} name="reason" placeholder="Optional audit note" />
        </label>
        <Button type="submit">{conop ? "Save CONOP" : "Create CONOP"}</Button>
      </form>
    </FormShell>
  );
}

export function ConopPublishForm({
  conopId,
  returnTo,
}: {
  conopId: string;
  returnTo: string;
}) {
  return (
    <FormShell
      description="Publish the CONOP when the document is ready for operational consumption."
      title="Publish CONOP"
    >
      <form action={publishConopAction} className="space-y-4">
        <input name="conopId" type="hidden" value={conopId} />
        <input name="returnTo" type="hidden" value={returnTo} />
        <label className="space-y-2">
          <span className={labelClassName}>Reason</span>
          <textarea className={textareaClassName} name="reason" placeholder="Optional audit note" />
        </label>
        <Button type="submit">Publish CONOP</Button>
      </form>
    </FormShell>
  );
}

export function AarForm({
  aar,
  defaultEventId,
  referenceData,
  returnTo,
}: {
  aar?: AarDetail | null;
  defaultEventId?: string | null;
  referenceData: S3ReferenceData;
  returnTo: string;
}) {
  const action = aar ? editAarAction : submitAarAction;

  return (
    <FormShell
      description="Submit a Patrol AAR using the Spearhead operational report template. Weekend Operations do not use AARs."
      title={aar ? "Edit Patrol AAR" : "Submit Patrol AAR"}
    >
      <form action={action} className="space-y-4">
        {aar ? <input name="aarId" type="hidden" value={aar.id} /> : null}
        <input name="returnTo" type="hidden" value={returnTo} />
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClassName}>Title</span>
            <input className={fieldClassName} defaultValue={aar?.title ?? ""} name="title" required />
          </label>
          <SelectField
            defaultValue={aar?.event?.id ?? defaultEventId ?? null}
            label="Related patrol"
            name="eventId"
            options={referenceData.events}
            placeholder="Select patrol event"
          />
        </div>
        <SelectField
          defaultValue={aar?.campaign?.id ?? null}
          label="Related deployment"
          name="campaignId"
          options={referenceData.campaigns}
          placeholder="Optional deployment"
        />
        <label className="space-y-2">
          <span className={labelClassName}>Patrol leader</span>
          <input className={fieldClassName} defaultValue={aar?.patrolLeaderName ?? ""} name="patrolLeaderName" placeholder="Leader display name" />
        </label>
        <div className="rounded-xl border border-border/70 bg-background/35 p-4">
          <p className="text-sm font-semibold text-foreground">Official patrol report</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Use grid coordinates for locations. Be descriptive but concise; this is an operational report, not a story.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className={labelClassName}>DTG</span>
              <input
                className={fieldClassName}
                defaultValue={aar?.dtg ?? ""}
                name="dtg"
                placeholder="Auto-generated from patrol end time if blank"
              />
            </label>
          <label className="space-y-2">
            <span className={labelClassName}>Callsigns</span>
            <input className={fieldClassName} defaultValue={aar?.callsigns ?? ""} name="callsigns" required />
          </label>
          </div>
          <label className="mt-4 block space-y-2">
            <span className={labelClassName}>Tasking</span>
            <textarea className={textareaClassName} defaultValue={aar?.tasking ?? ""} name="tasking" required />
          </label>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <label className="space-y-2">
              <span className={labelClassName}>FKIA</span>
              <input className={fieldClassName} defaultValue={aar?.fkia ?? ""} name="fkia" required />
            </label>
            <label className="space-y-2">
              <span className={labelClassName}>FWIA</span>
              <input className={fieldClassName} defaultValue={aar?.fwia ?? ""} name="fwia" required />
            </label>
            <label className="space-y-2">
              <span className={labelClassName}>FMIA</span>
              <input className={fieldClassName} defaultValue={aar?.fmia ?? ""} name="fmia" required />
            </label>
            <label className="space-y-2">
              <span className={labelClassName}>EKIA</span>
              <input className={fieldClassName} defaultValue={aar?.ekia ?? ""} name="ekia" required />
            </label>
          </div>
          <label className="mt-4 block space-y-2">
            <span className={labelClassName}>Report</span>
            <textarea
              className={textareaClassName}
              defaultValue={aar?.report ?? aar?.summary ?? ""}
              name="report"
              placeholder="Operational report with grid references, contact, movement, and outcome."
              required
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2">
            <span className={labelClassName}>Friendly casualties</span>
            <textarea className={textareaClassName} defaultValue={aar?.friendlyCasualties ?? ""} name="friendlyCasualties" />
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Enemy casualties</span>
            <textarea className={textareaClassName} defaultValue={aar?.enemyCasualties ?? ""} name="enemyCasualties" />
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Equipment losses</span>
            <textarea className={textareaClassName} defaultValue={aar?.equipmentLosses ?? ""} name="equipmentLosses" />
          </label>
        </div>
        <label className="space-y-2">
          <span className={labelClassName}>Action items</span>
          <textarea className={textareaClassName} defaultValue={aar?.actionItems ?? ""} name="actionItems" />
        </label>
        <label className="space-y-2">
          <span className={labelClassName}>Required map screenshot</span>
          <input
            accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
            className={fieldClassName}
            name="mapScreenshot"
            required={!aar?.hasMapScreenshot}
            type="file"
          />
          <span className="block text-xs text-muted-foreground">
            {aar?.hasMapScreenshot
              ? "Map screenshot already uploaded. Upload a replacement only if needed."
              : "Required before S3 can mark the Patrol AAR reviewed."}
          </span>
        </label>
        <label className="space-y-2">
          <span className={labelClassName}>Optional supporting media</span>
          <input
            accept=".png,.jpg,.jpeg,.webp,.pdf,.txt,.md,.mp4,.mov,.webm,image/png,image/jpeg,image/webp,application/pdf,text/plain,text/markdown,video/mp4,video/quicktime,video/webm"
            className={fieldClassName}
            name="supportingMedia"
            type="file"
          />
          <span className="block text-xs text-muted-foreground">
            Add a supporting screenshot, short video, report file, or note if it helps S3 understand the patrol. The map screenshot above remains required.
          </span>
        </label>
        <div className="rounded-xl border border-border/70 bg-background/35 p-4">
          <p className="text-sm font-semibold text-foreground">Deployment progression</p>
          <p className="mt-1 text-sm text-muted-foreground">
            These fields help operation creators decide which version or path should be used next.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className={labelClassName}>Progression decision</span>
              <input
                className={fieldClassName}
                defaultValue={aar?.aarProgressionDecision ?? ""}
                name="aarProgressionDecision"
                placeholder="Continue, branch, replay, delay, escalate"
              />
            </label>
            <label className="space-y-2">
              <span className={labelClassName}>Recommended next version</span>
              <input
                className={fieldClassName}
                defaultValue={aar?.aarNextVersionRecommendation ?? ""}
                name="aarNextVersionRecommendation"
                placeholder="Version B, alternate route, next phase"
              />
            </label>
            <label className="space-y-2">
              <span className={labelClassName}>Progression recommendation</span>
              <textarea
                className={textareaClassName}
                defaultValue={aar?.aarProgressionRecommendation ?? ""}
                name="aarProgressionRecommendation"
                placeholder="Continue, branch, replay, delay, or adjust next operation."
              />
            </label>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className={labelClassName}>Enemy activity notes</span>
              <textarea
                className={textareaClassName}
                defaultValue={aar?.aarEnemyActivityNotes ?? ""}
                name="aarEnemyActivityNotes"
              />
            </label>
            <label className="space-y-2">
              <span className={labelClassName}>Friendly activity notes</span>
              <textarea
                className={textareaClassName}
                defaultValue={aar?.aarFriendlyActivityNotes ?? ""}
                name="aarFriendlyActivityNotes"
              />
            </label>
          </div>
          <label className="mt-4 block space-y-2">
            <span className={labelClassName}>Progression notes</span>
            <textarea
              className={textareaClassName}
              defaultValue={aar?.aarProgressionNotes ?? ""}
              name="aarProgressionNotes"
              placeholder="Context that should shape the next weekly operation."
            />
          </label>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className={labelClassName}>Unit performance notes</span>
              <textarea
                className={textareaClassName}
                defaultValue={aar?.aarUnitPerformanceNotes ?? ""}
                name="aarUnitPerformanceNotes"
              />
            </label>
            <label className="space-y-2">
              <span className={labelClassName}>Tasking adjustments</span>
              <textarea
                className={textareaClassName}
                defaultValue={aar?.aarTaskingAdjustments ?? ""}
                name="aarTaskingAdjustments"
                placeholder="Adjustments for unit taskings next week."
              />
            </label>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className={labelClassName}>Planning notes for next week</span>
              <textarea
                className={textareaClassName}
                defaultValue={aar?.aarPlanningNotesNextWeek ?? ""}
                name="aarPlanningNotesNextWeek"
              />
            </label>
            <label className="space-y-2">
              <span className={labelClassName}>Lessons learned</span>
              <textarea
                className={textareaClassName}
                defaultValue={aar?.aarLessonsLearned ?? ""}
                name="aarLessonsLearned"
              />
            </label>
          </div>
        </div>
        <label className="space-y-2">
          <span className={labelClassName}>Additional notes</span>
          <textarea className={textareaClassName} defaultValue={aar?.additionalNotes ?? ""} name="additionalNotes" />
        </label>
        <label className="space-y-2">
          <span className={labelClassName}>Reason</span>
          <textarea className={textareaClassName} name="reason" placeholder="Optional audit note" />
        </label>
        <Button type="submit">{aar ? "Save AAR" : "Submit AAR"}</Button>
      </form>
    </FormShell>
  );
}

export function AarReviewForm({
  aar,
  referenceData,
  returnTo,
}: {
  aar: AarDetail;
  referenceData: S3ReferenceData;
  returnTo: string;
}) {
  return (
    <FormShell
      description="Review the submitted AAR and mark it as finalized when the debrief is complete."
      title="Review AAR"
    >
      <form action={reviewAarAction} className="space-y-4">
        <input name="aarId" type="hidden" value={aar.id} />
        <input name="returnTo" type="hidden" value={returnTo} />
        <SelectField
          defaultValue={aar.status}
          label="Review status"
          name="status"
          options={referenceData.aarStatuses.filter((status) => status.key !== "draft")}
          placeholder="Select review status"
        />
        <label className="space-y-2">
          <span className={labelClassName}>Reason</span>
          <textarea className={textareaClassName} name="reason" placeholder="Optional review note" />
        </label>
        <div className="rounded-xl border border-border/70 bg-background/35 p-4">
          <p className="text-sm font-semibold text-foreground">Progression decision</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Capture how this AAR should influence the next deployment week or operation branch.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className={labelClassName}>Progression decision</span>
              <input
                className={fieldClassName}
                defaultValue={aar.aarProgressionDecision ?? ""}
                name="aarProgressionDecision"
                placeholder="Continue, branch, replay, delay, escalate"
              />
            </label>
            <label className="space-y-2">
              <span className={labelClassName}>Recommended next version</span>
              <input
                className={fieldClassName}
                defaultValue={aar.aarNextVersionRecommendation ?? ""}
                name="aarNextVersionRecommendation"
                placeholder="Version B, alternate route, next phase"
              />
            </label>
            <label className="space-y-2">
              <span className={labelClassName}>Progression recommendation</span>
              <textarea
                className={textareaClassName}
                defaultValue={aar.aarProgressionRecommendation ?? ""}
                name="aarProgressionRecommendation"
              />
            </label>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className={labelClassName}>Enemy activity notes</span>
              <textarea
                className={textareaClassName}
                defaultValue={aar.aarEnemyActivityNotes ?? ""}
                name="aarEnemyActivityNotes"
              />
            </label>
            <label className="space-y-2">
              <span className={labelClassName}>Friendly activity notes</span>
              <textarea
                className={textareaClassName}
                defaultValue={aar.aarFriendlyActivityNotes ?? ""}
                name="aarFriendlyActivityNotes"
              />
            </label>
          </div>
          <label className="mt-4 block space-y-2">
            <span className={labelClassName}>Progression notes</span>
            <textarea
              className={textareaClassName}
              defaultValue={aar.aarProgressionNotes ?? ""}
              name="aarProgressionNotes"
            />
          </label>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className={labelClassName}>Unit performance notes</span>
              <textarea
                className={textareaClassName}
                defaultValue={aar.aarUnitPerformanceNotes ?? ""}
                name="aarUnitPerformanceNotes"
              />
            </label>
            <label className="space-y-2">
              <span className={labelClassName}>Tasking adjustments</span>
              <textarea
                className={textareaClassName}
                defaultValue={aar.aarTaskingAdjustments ?? ""}
                name="aarTaskingAdjustments"
              />
            </label>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className={labelClassName}>Planning notes for next week</span>
              <textarea
                className={textareaClassName}
                defaultValue={aar.aarPlanningNotesNextWeek ?? ""}
                name="aarPlanningNotesNextWeek"
              />
            </label>
            <label className="space-y-2">
              <span className={labelClassName}>Lessons learned</span>
              <textarea
                className={textareaClassName}
                defaultValue={aar.aarLessonsLearned ?? ""}
                name="aarLessonsLearned"
              />
            </label>
          </div>
        </div>
        <Button type="submit" variant="outline">
          Save review
        </Button>
      </form>
    </FormShell>
  );
}
