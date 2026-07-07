import {
  archiveQualificationAction,
  awardQualificationAction,
  completeQualificationSignoffAction,
  createQualificationAction,
  editQualificationAction,
  manageQualificationRequirementAction,
  removeQualificationRequirementAction,
  revokeQualificationAction,
  updateQualificationRecordAction,
} from "@/server/qualifications/actions";
import type {
  QualificationDetail,
  QualificationRecordDetail,
  QualificationReferenceData,
} from "@/server/qualifications/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const fieldClassName =
  "flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const textareaClassName =
  "flex min-h-24 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const labelClassName =
  "text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground";

function SelectField({
  name,
  label,
  options,
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  options: Array<{ id: string; label: string; hint?: string | null }>;
  defaultValue?: string | null;
  placeholder: string;
}) {
  return (
    <label className="space-y-2">
      <span className={labelClassName}>{label}</span>
      <select className={fieldClassName} defaultValue={defaultValue ?? ""} name={name}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
            {option.hint ? ` - ${option.hint}` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

function FormShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border/80 bg-card/92">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

export function CreateQualificationForm({
  categories,
  returnTo,
}: {
  categories: QualificationReferenceData["categories"];
  returnTo: string;
}) {
  return (
    <form action={createQualificationAction} className="space-y-4">
      <input name="returnTo" type="hidden" value={returnTo} />
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className={labelClassName}>Key</span>
          <input className={fieldClassName} name="key" placeholder="combat-lifesaver" required />
        </label>
        <label className="space-y-2">
          <span className={labelClassName}>Label</span>
          <input className={fieldClassName} name="label" placeholder="Combat Lifesaver" required />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <SelectField
          label="Category"
          name="categoryId"
          options={categories}
          placeholder="Select category"
        />
        <label className="space-y-2">
          <span className={labelClassName}>Expires after days</span>
          <input className={fieldClassName} min="0" name="expiresAfterDays" type="number" />
        </label>
      </div>
      <label className="space-y-2">
        <span className={labelClassName}>Description</span>
        <textarea className={textareaClassName} name="description" placeholder="What this qualification represents" />
      </label>
      <label className="space-y-2">
        <span className={labelClassName}>Reason</span>
        <textarea className={textareaClassName} name="reason" placeholder="Optional audit note" />
      </label>
      <Button type="submit">Create qualification</Button>
    </form>
  );
}

export function EditQualificationForm({
  qualification,
  categories,
  returnTo,
}: {
  qualification: QualificationDetail;
  categories: QualificationReferenceData["categories"];
  returnTo: string;
}) {
  return (
    <form action={editQualificationAction} className="space-y-4">
      <input name="returnTo" type="hidden" value={returnTo} />
      <input name="qualificationId" type="hidden" value={qualification.id} />
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className={labelClassName}>Key</span>
          <input className={fieldClassName} defaultValue={qualification.key} name="key" required />
        </label>
        <label className="space-y-2">
          <span className={labelClassName}>Label</span>
          <input className={fieldClassName} defaultValue={qualification.label} name="label" required />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <SelectField
          defaultValue={qualification.category.id}
          label="Category"
          name="categoryId"
          options={categories}
          placeholder="Select category"
        />
        <label className="space-y-2">
          <span className={labelClassName}>Expires after days</span>
          <input
            className={fieldClassName}
            defaultValue={qualification.expiresAfterDays ?? ""}
            min="0"
            name="expiresAfterDays"
            type="number"
          />
        </label>
      </div>
      <label className="space-y-2">
        <span className={labelClassName}>Description</span>
        <textarea
          className={textareaClassName}
          defaultValue={qualification.description ?? ""}
          name="description"
        />
      </label>
      <label className="space-y-2">
        <span className={labelClassName}>Reason</span>
        <textarea className={textareaClassName} name="reason" placeholder="Optional audit note" />
      </label>
      <Button type="submit">Save qualification</Button>
    </form>
  );
}

export function ArchiveQualificationForm({
  qualificationId,
  returnTo,
}: {
  qualificationId: string;
  returnTo: string;
}) {
  return (
    <form action={archiveQualificationAction}>
      <input name="returnTo" type="hidden" value={returnTo} />
      <input name="qualificationId" type="hidden" value={qualificationId} />
      <Button type="submit" variant="outline">
        Archive qualification
      </Button>
    </form>
  );
}

export function ManageRequirementsForm({
  qualification,
  referenceData,
  returnTo,
}: {
  qualification: QualificationDetail;
  referenceData: QualificationReferenceData;
  returnTo: string;
}) {
  return (
    <div className="space-y-4">
      <form action={manageQualificationRequirementAction} className="space-y-4">
        <input name="returnTo" type="hidden" value={returnTo} />
        <input name="qualificationId" type="hidden" value={qualification.id} />
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            label="Unit requirement"
            name="unitId"
            options={referenceData.units}
            placeholder="Optional unit"
          />
          <SelectField
            label="Position requirement"
            name="positionId"
            options={referenceData.positions}
            placeholder="Optional position"
          />
        </div>
        <label className="space-y-2">
          <span className={labelClassName}>Requirement strength</span>
          <select className={fieldClassName} defaultValue="true" name="isRequired">
            <option value="true">Required</option>
            <option value="false">Recommended</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className={labelClassName}>Due within days</span>
          <input className={fieldClassName} min={1} name="dueWithinDays" placeholder="Optional unit timeline" type="number" />
        </label>
        <label className="space-y-2">
          <span className={labelClassName}>Requirement notes</span>
          <textarea className={textareaClassName} name="notes" placeholder="Optional requirement context" />
        </label>
        <label className="space-y-2">
          <span className={labelClassName}>Reason</span>
          <textarea className={textareaClassName} name="reason" placeholder="Optional audit note" />
        </label>
        <Button type="submit">Save requirement</Button>
      </form>
      {qualification.requirements.length > 0 ? (
        <div className="space-y-3">
          {qualification.requirements.map((requirement) => (
            <Card key={requirement.id} className="border-border/70 bg-background/45">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-foreground">
                    {requirement.position
                      ? `${requirement.position.title} (${requirement.position.unitShortName})`
                      : requirement.unit
                        ? requirement.unit.name
                        : "General requirement"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {requirement.notes ??
                      (requirement.isRequired
                        ? "Required qualification mapping"
                        : "Recommended qualification mapping")}
                  </p>
                  {requirement.dueWithinDays ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Must be completed within {requirement.dueWithinDays} days for this unit/position.
                    </p>
                  ) : null}
                </div>
                <form action={removeQualificationRequirementAction}>
                  <input name="returnTo" type="hidden" value={returnTo} />
                  <input name="requirementId" type="hidden" value={requirement.id} />
                  <Button type="submit" variant="outline">
                    Remove
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AwardQualificationForm({
  referenceData,
  returnTo,
  memberProfileId,
  qualificationId,
}: {
  referenceData: QualificationReferenceData;
  returnTo: string;
  memberProfileId?: string;
  qualificationId?: string;
}) {
  return (
    <form action={awardQualificationAction} className="space-y-4">
      <input name="returnTo" type="hidden" value={returnTo} />
      <div className="grid gap-4 md:grid-cols-2">
        <SelectField
          defaultValue={memberProfileId ?? null}
          label="Member"
          name="memberProfileId"
          options={referenceData.members}
          placeholder="Select member"
        />
        <SelectField
          defaultValue={qualificationId ?? null}
          label="Qualification"
          name="qualificationId"
          options={referenceData.qualifications}
          placeholder="Select qualification"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className={labelClassName}>Awarded at</span>
          <input className={fieldClassName} name="awardedAt" type="date" />
        </label>
        <label className="space-y-2">
          <span className={labelClassName}>Expires at</span>
          <input className={fieldClassName} name="expiresAt" type="date" />
        </label>
      </div>
      <label className="space-y-2">
        <span className={labelClassName}>Record status</span>
        <select className={fieldClassName} defaultValue="qualified" name="status">
          <option value="qualified">Qualified</option>
          <option value="pending_signoff">Pending sign-off</option>
        </select>
      </label>
      <label className="space-y-2">
        <span className={labelClassName}>Notes</span>
        <textarea className={textareaClassName} name="notes" placeholder="Instructor, standard, or admin note" />
      </label>
      <label className="space-y-2">
        <span className={labelClassName}>Reason</span>
        <textarea className={textareaClassName} name="reason" placeholder="Optional audit note" />
      </label>
      <Button type="submit">Award qualification</Button>
    </form>
  );
}

export function UpdateQualificationRecordForm({
  detail,
  returnTo,
}: {
  detail: QualificationRecordDetail;
  returnTo: string;
}) {
  if (!detail.record) {
    return null;
  }

  return (
    <form action={updateQualificationRecordAction} className="space-y-4">
      <input name="returnTo" type="hidden" value={returnTo} />
      <input name="recordId" type="hidden" value={detail.record.id} />
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className={labelClassName}>Awarded at</span>
          <input
            className={fieldClassName}
            defaultValue={detail.record.awardedAt.toISOString().slice(0, 10)}
            name="awardedAt"
            type="date"
          />
        </label>
        <label className="space-y-2">
          <span className={labelClassName}>Expires at</span>
          <input
            className={fieldClassName}
            defaultValue={detail.record.expiresAt ? detail.record.expiresAt.toISOString().slice(0, 10) : ""}
            name="expiresAt"
            type="date"
          />
        </label>
      </div>
      <label className="space-y-2">
        <span className={labelClassName}>Record status</span>
        <select className={fieldClassName} defaultValue={detail.record.status} name="status">
          <option value="qualified">Qualified</option>
          <option value="pending_signoff">Pending sign-off</option>
        </select>
      </label>
      <label className="space-y-2">
        <span className={labelClassName}>Notes</span>
        <textarea className={textareaClassName} defaultValue={detail.record.notes ?? ""} name="notes" />
      </label>
      <label className="space-y-2">
        <span className={labelClassName}>Reason</span>
        <textarea className={textareaClassName} name="reason" placeholder="Optional audit note" />
      </label>
      <Button type="submit">Save record</Button>
    </form>
  );
}

export function RevokeQualificationForm({
  detail,
  returnTo,
}: {
  detail: QualificationRecordDetail;
  returnTo: string;
}) {
  if (!detail.record) {
    return null;
  }

  return (
    <form action={revokeQualificationAction} className="space-y-4">
      <input name="returnTo" type="hidden" value={returnTo} />
      <input name="recordId" type="hidden" value={detail.record.id} />
      <label className="space-y-2">
        <span className={labelClassName}>Revoked at</span>
        <input className={fieldClassName} name="revokedAt" type="date" />
      </label>
      <label className="space-y-2">
        <span className={labelClassName}>Reason</span>
        <textarea className={textareaClassName} name="reason" placeholder="Why this qualification is being revoked" />
      </label>
      <Button type="submit" variant="outline">
        Revoke qualification
      </Button>
    </form>
  );
}

export function CompleteQualificationSignoffForm({
  detail,
  returnTo,
}: {
  detail: QualificationRecordDetail;
  returnTo: string;
}) {
  if (!detail.record) {
    return null;
  }

  return (
    <form action={completeQualificationSignoffAction} className="space-y-4">
      <input name="returnTo" type="hidden" value={returnTo} />
      <input name="recordId" type="hidden" value={detail.record.id} />
      <label className="space-y-2">
        <span className={labelClassName}>Reason</span>
        <textarea
          className={textareaClassName}
          name="reason"
          placeholder="Optional instructor or reviewer note"
        />
      </label>
      <Button type="submit">Complete sign-off</Button>
    </form>
  );
}

export function QualificationFormShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return <FormShell description={description} title={title}>{children}</FormShell>;
}
