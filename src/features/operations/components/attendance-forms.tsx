import { bulkUpdateAttendanceAction, lockAttendanceAction, updateRsvpAction } from "@/server/attendance/actions";
import type { EventAttendanceWorkspace, ViewerEventRsvp } from "@/server/attendance/types";
import type { EventReferenceData } from "@/server/events/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const fieldClassName =
  "flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const textareaClassName =
  "flex min-h-20 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const labelClassName =
  "text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground";

function SelectField({
  name,
  options,
  defaultValue,
  placeholder,
}: {
  name: string;
  options: string[];
  defaultValue?: string | null;
  placeholder: string;
}) {
  return (
    <select className={fieldClassName} defaultValue={defaultValue ?? ""} name={name}>
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option.charAt(0).toUpperCase() + option.slice(1)}
        </option>
      ))}
    </select>
  );
}

type SelfRsvpFormProps = {
  eventId: string;
  returnTo: string;
  viewerRsvp: ViewerEventRsvp | null;
  memberProfileId?: string | null;
  referenceData: EventReferenceData;
};

export function SelfRsvpForm({
  eventId,
  returnTo,
  viewerRsvp,
  memberProfileId,
  referenceData,
}: SelfRsvpFormProps) {
  return (
    <Card className="border-border/80 bg-card/88">
      <CardHeader>
        <CardTitle>My RSVP</CardTitle>
        <CardDescription>
          Members can update their own RSVP here while staff keep final attendance in the same event workspace.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={updateRsvpAction} className="space-y-4">
          <input name="eventId" type="hidden" value={eventId} />
          <input name="returnTo" type="hidden" value={returnTo} />
          {memberProfileId ? (
            <input name="memberProfileId" type="hidden" value={memberProfileId} />
          ) : null}
          <label className="space-y-2">
            <span className={labelClassName}>RSVP status</span>
            <SelectField
              defaultValue={viewerRsvp?.rsvpStatus ?? null}
              name="rsvpStatus"
              options={referenceData.rsvpStatuses}
              placeholder="Select RSVP status"
            />
          </label>
          <Button type="submit">Update RSVP</Button>
        </form>
      </CardContent>
    </Card>
  );
}

type BulkAttendanceFormProps = {
  eventId: string;
  returnTo: string;
  workspace: EventAttendanceWorkspace;
  referenceData: EventReferenceData;
  canManageRsvp: boolean;
  canManageFinalAttendance: boolean;
};

export function BulkAttendanceForm({
  eventId,
  returnTo,
  workspace,
  referenceData,
  canManageRsvp,
  canManageFinalAttendance,
}: BulkAttendanceFormProps) {
  return (
    <Card className="border-border/80 bg-card/88">
      <CardHeader>
        <CardTitle>Attendance editor</CardTitle>
        <CardDescription>
          Update RSVP and final attendance without leaving the event detail workspace.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={bulkUpdateAttendanceAction} className="space-y-4">
          <input name="eventId" type="hidden" value={eventId} />
          <input name="returnTo" type="hidden" value={returnTo} />
          <div className="space-y-4">
            {workspace.rows.map((row) => (
              <div key={row.memberProfileId} className="rounded-xl border border-border/70 bg-background/45 p-4">
                <input name={`memberProfileId:${row.memberProfileId}`} type="hidden" value={row.memberProfileId} />
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_12rem_12rem_minmax(0,1fr)]">
                  <div>
                    <p className="font-semibold text-foreground">{row.displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      {[row.positionTitle, row.profileStatusLabel, row.rankAbbreviation]
                        .filter(Boolean)
                        .join(" / ")}
                    </p>
                  </div>
                  <label className="space-y-2">
                    <span className={labelClassName}>RSVP</span>
                    {canManageRsvp ? (
                      <SelectField
                        defaultValue={row.rsvpStatus}
                        name={`rsvpStatus:${row.memberProfileId}`}
                        options={referenceData.rsvpStatuses}
                        placeholder="No RSVP"
                      />
                    ) : (
                      <div className="rounded-lg border border-border/70 bg-card/60 px-3 py-2 text-sm text-muted-foreground">
                        {row.rsvpStatus ? row.rsvpStatus.toUpperCase() : "Missing RSVP"}
                      </div>
                    )}
                  </label>
                  <label className="space-y-2">
                    <span className={labelClassName}>Final</span>
                    {canManageFinalAttendance ? (
                      <SelectField
                        defaultValue={row.finalStatus}
                        name={`finalStatus:${row.memberProfileId}`}
                        options={referenceData.finalStatuses}
                        placeholder="Pending"
                      />
                    ) : (
                      <div className="rounded-lg border border-border/70 bg-card/60 px-3 py-2 text-sm text-muted-foreground">
                        {row.finalStatus ? row.finalStatus.toUpperCase() : "Pending"}
                      </div>
                    )}
                  </label>
                  <label className="space-y-2">
                    <span className={labelClassName}>Notes</span>
                    <textarea
                      className={textareaClassName}
                      defaultValue={row.notes ?? ""}
                      name={`notes:${row.memberProfileId}`}
                      placeholder="Optional attendance note"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
          <label className="space-y-2">
            <span className={labelClassName}>Reason</span>
            <textarea className={textareaClassName} name="reason" placeholder="Optional bulk-update audit note" />
          </label>
          <Button type="submit">Save attendance updates</Button>
        </form>
      </CardContent>
    </Card>
  );
}

type LockAttendanceFormProps = {
  eventId: string;
  returnTo: string;
};

export function LockAttendanceForm({
  eventId,
  returnTo,
}: LockAttendanceFormProps) {
  return (
    <Card className="border-border/80 bg-card/88">
      <CardHeader>
        <CardTitle>Finalize attendance</CardTitle>
        <CardDescription>
          Lock attendance after final statuses are entered so follow-up and reporting stay stable.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={lockAttendanceAction} className="space-y-4">
          <input name="eventId" type="hidden" value={eventId} />
          <input name="returnTo" type="hidden" value={returnTo} />
          <label className="space-y-2">
            <span className={labelClassName}>Reason</span>
            <textarea className={textareaClassName} name="reason" placeholder="Optional finalization note" />
          </label>
          <Button type="submit" variant="outline">
            Lock attendance
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
