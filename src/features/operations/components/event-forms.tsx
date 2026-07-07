import {
  archiveEventAction,
  cancelEventAction,
  createEventAction,
  editEventAction,
  publishEventAction,
  sendDiscordAnnouncementAction,
} from "@/server/events/actions";
import type { EventListItem, EventReferenceData } from "@/server/events/types";
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
  children: React.ReactNode;
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

type CreateEventFormProps = {
  referenceData: EventReferenceData;
  returnTo: string;
};

export function CreateEventForm({
  referenceData,
  returnTo,
}: CreateEventFormProps) {
  return (
    <FormShell
      description="Create the operation record first, then publish it when the schedule, tasking, and unit context are ready."
      title="Create operation"
    >
      <form action={createEventAction} className="space-y-4">
        <input name="returnTo" type="hidden" value={returnTo} />
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClassName}>Title</span>
            <input className={fieldClassName} name="title" placeholder="Operation Nightfall" required />
          </label>
          <SelectField
            label="Event type"
            name="eventType"
            options={referenceData.eventTypes}
            placeholder="Select event type"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            label="Host unit"
            name="hostUnitId"
            options={referenceData.units}
            placeholder="Select host unit"
          />
          <SelectField
            label="Deployment"
            name="campaignId"
            options={referenceData.campaigns}
            placeholder="Optional deployment"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClassName}>Starts at</span>
            <input className={fieldClassName} name="startsAt" required type="datetime-local" />
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Ends at</span>
            <input className={fieldClassName} name="endsAt" type="datetime-local" />
          </label>
        </div>
        <label className="space-y-2">
          <span className={labelClassName}>Description</span>
          <textarea className={textareaClassName} name="description" placeholder="Operation brief, training objective, patrol notes, or meeting notes" />
        </label>
        <label className="space-y-2">
          <span className={labelClassName}>Reason</span>
          <textarea className={textareaClassName} name="reason" placeholder="Optional audit note for scheduling context" />
        </label>
        <Button type="submit">Create operation</Button>
      </form>
    </FormShell>
  );
}

type EditEventFormProps = {
  event: EventListItem;
  referenceData: EventReferenceData;
  returnTo: string;
};

export function EditEventForm({
  event,
  referenceData,
  returnTo,
}: EditEventFormProps) {
  return (
    <FormShell
      description="Adjust scheduling, host-unit context, or deployment linkage without losing attendance history."
      title="Edit operation"
    >
      <form action={editEventAction} className="space-y-4">
        <input name="eventId" type="hidden" value={event.id} />
        <input name="returnTo" type="hidden" value={returnTo} />
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClassName}>Title</span>
            <input className={fieldClassName} defaultValue={event.title} name="title" required />
          </label>
          <SelectField
            defaultValue={event.eventType}
            label="Event type"
            name="eventType"
            options={referenceData.eventTypes}
            placeholder="Select event type"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            defaultValue={event.hostUnit?.id ?? null}
            label="Host unit"
            name="hostUnitId"
            options={referenceData.units}
            placeholder="Select host unit"
          />
          <SelectField
            defaultValue={event.campaign?.id ?? null}
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
              defaultValue={getDateTimeInputValue(event.startsAt)}
              name="startsAt"
              required
              type="datetime-local"
            />
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Ends at</span>
            <input
              className={fieldClassName}
              defaultValue={getDateTimeInputValue(event.endsAt)}
              name="endsAt"
              type="datetime-local"
            />
          </label>
        </div>
        <label className="space-y-2">
          <span className={labelClassName}>Description</span>
          <textarea className={textareaClassName} defaultValue={event.description ?? ""} name="description" />
        </label>
        <label className="space-y-2">
          <span className={labelClassName}>Reason</span>
          <textarea className={textareaClassName} name="reason" placeholder="Why this schedule or metadata update is being made" />
        </label>
        <Button type="submit">Save operation</Button>
      </form>
    </FormShell>
  );
}

type EventLifecycleActionFormProps = {
  action: "publish" | "cancel" | "archive";
  eventId: string;
  returnTo: string;
};

const lifecycleConfig = {
  publish: {
    title: "Publish event",
    description:
      "Publishing opens member-facing visibility and RSVP tracking. If you have Discord send access, the portal also attempts the mapped event-channel announcement.",
    submitLabel: "Publish event",
    actionHandler: publishEventAction,
    buttonVariant: "default" as const,
  },
  cancel: {
    title: "Cancel event",
    description: "Cancellation preserves the record while clearly closing the operational plan.",
    submitLabel: "Cancel event",
    actionHandler: cancelEventAction,
    buttonVariant: "outline" as const,
  },
  archive: {
    title: "Archive event",
    description: "Archiving keeps the event available for reporting while removing it from active scheduling focus.",
    submitLabel: "Archive event",
    actionHandler: archiveEventAction,
    buttonVariant: "outline" as const,
  },
};

export function EventLifecycleActionForm({
  action,
  eventId,
  returnTo,
}: EventLifecycleActionFormProps) {
  const config = lifecycleConfig[action];

  return (
    <FormShell description={config.description} title={config.title}>
      <form action={config.actionHandler} className="space-y-4">
        <input name="eventId" type="hidden" value={eventId} />
        <input name="returnTo" type="hidden" value={returnTo} />
        <label className="space-y-2">
          <span className={labelClassName}>Reason</span>
          <textarea className={textareaClassName} name="reason" placeholder="Optional audit note" />
        </label>
        <Button type="submit" variant={config.buttonVariant}>
          {config.submitLabel}
        </Button>
      </form>
    </FormShell>
  );
}

type DiscordAnnouncementActionFormProps = {
  eventId: string;
  returnTo: string;
};

export function DiscordAnnouncementActionForm({
  eventId,
  returnTo,
}: DiscordAnnouncementActionFormProps) {
  return (
    <FormShell
      description="Send the published event announcement to the mapped Discord event channel using portal-tracked delivery records and RSVP buttons."
      title="Send Discord announcement"
    >
      <form action={sendDiscordAnnouncementAction} className="space-y-4">
        <input name="eventId" type="hidden" value={eventId} />
        <input name="returnTo" type="hidden" value={returnTo} />
        <Button type="submit">Send announcement</Button>
      </form>
    </FormShell>
  );
}
