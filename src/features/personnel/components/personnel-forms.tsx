import { Plus, Save } from "lucide-react";

import {
  changePositionAction,
  changeRankAction,
  changeStatusAction,
  changeUnitAction,
  createMemberProfileAction,
  updateMemberProfileAction,
} from "@/server/personnel/actions";
import type { MemberDetail, PersonnelReferenceData } from "@/server/personnel/types";
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
  options: PersonnelReferenceData[keyof PersonnelReferenceData];
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

type CreateMemberFormCardProps = {
  options: PersonnelReferenceData;
  returnTo: string;
};

export function CreateMemberFormCard({
  options,
  returnTo,
}: CreateMemberFormCardProps) {
  return (
    <FormShell
      description="Create the official member profile first, then attach the initial roster context if it is known."
      title="Create member profile"
    >
      <form action={createMemberProfileAction} className="space-y-4">
        <input name="returnTo" type="hidden" value={returnTo} />
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClassName}>Callsign</span>
            <input className={fieldClassName} name="callsign" placeholder="Spearhead Actual" />
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Display name</span>
            <input
              className={fieldClassName}
              name="displayName"
              placeholder="Spearhead Actual"
              required
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClassName}>Join date</span>
            <input className={fieldClassName} name="joinDate" type="date" />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <SelectField
            defaultValue={options.statuses.find((status) => status.key === "active")?.id}
            label="Status"
            name="statusId"
            options={options.statuses}
            placeholder="Select status"
          />
          <SelectField
            label="Rank, optional"
            name="rankId"
            options={options.ranks}
            placeholder="No rank used"
          />
          <SelectField
            label="Unit"
            name="unitId"
            options={options.units}
            placeholder="No initial unit"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            label="Existing position"
            name="positionId"
            options={options.positions}
            placeholder="Select position"
          />
          <label className="space-y-2">
            <span className={labelClassName}>New position title</span>
            <input className={fieldClassName} name="positionTitle" placeholder="Squad Leader" />
          </label>
        </div>
        <label className="space-y-2">
          <span className={labelClassName}>Reason</span>
          <textarea
            className={textareaClassName}
            name="reason"
            placeholder="Optional roster onboarding note"
          />
        </label>
        <Button type="submit">
          <Plus className="h-4 w-4" />
          Create member
        </Button>
      </form>
    </FormShell>
  );
}

type EditMemberBasicsFormCardProps = {
  member: MemberDetail;
  returnTo: string;
};

export function EditMemberBasicsFormCard({
  member,
  returnTo,
}: EditMemberBasicsFormCardProps) {
  return (
    <FormShell
      description="Update the identity and profile basics without changing roster assignment history."
      title="Edit member basics"
    >
      <form action={updateMemberProfileAction} className="space-y-4">
        <input name="returnTo" type="hidden" value={returnTo} />
        <input name="memberProfileId" type="hidden" value={member.id} />
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClassName}>Callsign</span>
            <input className={fieldClassName} defaultValue={member.callsign ?? ""} name="callsign" />
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Display name</span>
            <input
              className={fieldClassName}
              defaultValue={member.displayName}
              name="displayName"
              required
            />
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Join date</span>
            <input
              className={fieldClassName}
              defaultValue={member.joinDate ? new Date(member.joinDate).toISOString().slice(0, 10) : ""}
              name="joinDate"
              type="date"
            />
          </label>
        </div>
        <label className="space-y-2">
          <span className={labelClassName}>Reason</span>
          <textarea
            className={textareaClassName}
            name="reason"
            placeholder="Optional edit note for the audit log"
          />
        </label>
        <Button type="submit">
          <Save className="h-4 w-4" />
          Save profile
        </Button>
      </form>
    </FormShell>
  );
}

type ChangeRankFormCardProps = {
  member: MemberDetail;
  options: PersonnelReferenceData;
  returnTo: string;
};

export function ChangeRankFormCard({
  member,
  options,
  returnTo,
}: ChangeRankFormCardProps) {
  return (
    <FormShell
      description="Optional rank updates create a new primary roster assignment entry so the service history remains intact."
      title="Set rank"
    >
      <form action={changeRankAction} className="space-y-4">
        <input name="returnTo" type="hidden" value={returnTo} />
        <input name="memberProfileId" type="hidden" value={member.id} />
        <SelectField
          defaultValue={member.rank?.id}
          label="Rank, optional"
          name="rankId"
          options={options.ranks}
          placeholder="No rank selected"
        />
        <label className="space-y-2">
          <span className={labelClassName}>Reason</span>
          <textarea
            className={textareaClassName}
            name="reason"
            placeholder="Promotion, demotion, correction, or admin update"
          />
        </label>
        <Button type="submit">Save rank</Button>
      </form>
    </FormShell>
  );
}

type AssignUnitFormCardProps = {
  member: MemberDetail;
  options: PersonnelReferenceData;
  returnTo: string;
};

export function AssignUnitFormCard({
  member,
  options,
  returnTo,
}: AssignUnitFormCardProps) {
  return (
    <FormShell
      description="Transfers and unit changes create a fresh primary roster assignment while preserving the previous one in history."
      title="Assign unit"
    >
      <form action={changeUnitAction} className="space-y-4">
        <input name="returnTo" type="hidden" value={returnTo} />
        <input name="memberProfileId" type="hidden" value={member.id} />
        <div className="grid gap-4 md:grid-cols-3">
          <SelectField
            defaultValue={member.unit?.id}
            label="Unit"
            name="unitId"
            options={options.units}
            placeholder="Select unit"
          />
          <SelectField
            defaultValue={member.rank?.id}
            label="Rank at assignment, optional"
            name="rankId"
            options={options.ranks}
            placeholder="No rank used"
          />
          <SelectField
            defaultValue={member.position?.id}
            label="Existing position"
            name="positionId"
            options={options.positions}
            placeholder="No position"
          />
        </div>
        <label className="space-y-2">
          <span className={labelClassName}>New position title</span>
          <input className={fieldClassName} name="positionTitle" placeholder="Operations Officer" />
        </label>
        <label className="space-y-2">
          <span className={labelClassName}>Reason</span>
          <textarea
            className={textareaClassName}
            name="reason"
            placeholder="Transfer, reassignment, leadership move, or administrative update"
          />
        </label>
        <Button type="submit">Assign unit</Button>
      </form>
    </FormShell>
  );
}

type AssignPositionFormCardProps = {
  member: MemberDetail;
  options: PersonnelReferenceData;
  returnTo: string;
};

export function AssignPositionFormCard({
  member,
  options,
  returnTo,
}: AssignPositionFormCardProps) {
  return (
    <FormShell
      description="Use an existing billet when possible, or capture a new position title when the unit structure is still being filled in."
      title="Assign position"
    >
      <form action={changePositionAction} className="space-y-4">
        <input name="returnTo" type="hidden" value={returnTo} />
        <input name="memberProfileId" type="hidden" value={member.id} />
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            defaultValue={member.unit?.id}
            label="Unit"
            name="unitId"
            options={options.units}
            placeholder="Select unit"
          />
          <SelectField
            defaultValue={member.position?.id}
            label="Existing position"
            name="positionId"
            options={options.positions}
            placeholder="Select position"
          />
        </div>
        <label className="space-y-2">
          <span className={labelClassName}>New position title</span>
          <input className={fieldClassName} name="positionTitle" placeholder="Platoon Sergeant" />
        </label>
        <label className="space-y-2">
          <span className={labelClassName}>Reason</span>
          <textarea
            className={textareaClassName}
            name="reason"
            placeholder="Billet update, staff assignment, or administrative correction"
          />
        </label>
        <Button type="submit">Assign position</Button>
      </form>
    </FormShell>
  );
}

type ChangeStatusFormCardProps = {
  member: MemberDetail;
  options: PersonnelReferenceData;
  returnTo: string;
};

export function ChangeStatusFormCard({
  member,
  options,
  returnTo,
}: ChangeStatusFormCardProps) {
  return (
    <FormShell
      description="Status updates affect the member's operational state without rewriting the historical roster trail."
      title="Change status"
    >
      <form action={changeStatusAction} className="space-y-4">
        <input name="returnTo" type="hidden" value={returnTo} />
        <input name="memberProfileId" type="hidden" value={member.id} />
        <SelectField
          defaultValue={member.status.id}
          label="Status"
          name="statusId"
          options={options.statuses}
          placeholder="Select status"
        />
        <label className="space-y-2">
          <span className={labelClassName}>Reason</span>
          <textarea
            className={textareaClassName}
            name="reason"
            placeholder="LOA request, inactive status, return to active service, or admin note"
          />
        </label>
        <Button type="submit">Update status</Button>
      </form>
    </FormShell>
  );
}
