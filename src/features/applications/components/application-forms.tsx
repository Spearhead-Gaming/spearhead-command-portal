import { CircleDot, ClipboardList, FileStack, MessageSquareText, ShieldCheck } from "lucide-react";

import { StatusBadge, type BadgeTone } from "@/components/status/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/formatters";
import {
  addSubmissionCommentAction,
  approveSubmissionAction,
  archiveFormTemplateAction,
  archiveSubmissionAction,
  assignSubmissionReviewerAction,
  createFormSubmissionAction,
  createFormTemplateAction,
  denySubmissionAction,
  duplicateFormTemplateAction,
  requestSubmissionChangesAction,
  setFormTemplateEnabledStateAction,
  updateFormTemplateAction,
  upsertApprovalStepAction,
  upsertFormFieldAction,
  withdrawSubmissionAction,
} from "@/server/applications/actions";
import type {
  ApplicationFieldDefinition,
  ApplicationSubmissionComment,
  ApplicationSubmissionDetail,
  ApplicationTemplateDetail,
  ApplicationsReferenceData,
} from "@/server/applications/types";

export const fieldClassName =
  "flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
export const textareaClassName =
  "flex min-h-28 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
export const labelClassName =
  "text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground";

export type SearchParamsValue = string | string[] | undefined;
export type SearchParamsRecord = Record<string, SearchParamsValue>;

export function getSearchParamValue(
  searchParams: SearchParamsRecord,
  key: string,
) {
  const value = searchParams[key];

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export function buildHref(
  pathname: string,
  searchParams: SearchParamsRecord,
  updates: Record<string, string | undefined | null>,
) {
  const nextParams = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    const normalized = Array.isArray(value) ? value[0] : value;

    if (normalized) {
      nextParams.set(key, normalized);
    }
  }

  for (const [key, value] of Object.entries(updates)) {
    if (value) {
      nextParams.set(key, value);
    } else {
      nextParams.delete(key);
    }
  }

  const query = nextParams.toString();

  return query ? `${pathname}?${query}` : pathname;
}

export function getApplicationStatusTone(status: string): BadgeTone {
  switch (status) {
    case "approved":
      return "success";
    case "changes_requested":
    case "under_review":
      return "warning";
    case "denied":
      return "danger";
    case "submitted":
      return "info";
    default:
      return "muted";
  }
}

export function FlashNotice({
  message,
  tone,
}: {
  message: string;
  tone: BadgeTone;
}) {
  return (
    <Card className={tone === "danger" ? "border-danger/30 bg-danger/10" : "border-success/30 bg-success/10"}>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {tone === "danger" ? "Action blocked" : "Action completed"}
          </p>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        <StatusBadge label={tone === "danger" ? "Error" : "Saved"} tone={tone} />
      </CardContent>
    </Card>
  );
}

export function ApplicationStatusPill({
  label,
  statusKey,
}: {
  label: string;
  statusKey: string;
}) {
  return <StatusBadge label={label} tone={getApplicationStatusTone(statusKey)} />;
}

function SelectField({
  defaultValue,
  label,
  name,
  options,
  placeholder,
}: {
  defaultValue?: string | null;
  label: string;
  name: string;
  options: Array<{ id: string; label: string; hint?: string | null }>;
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

function SectionShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border/80 bg-card/90">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

export function CreateFormTemplateForm({
  referenceData,
  returnTo,
}: {
  referenceData: ApplicationsReferenceData;
  returnTo: string;
}) {
  return (
    <SectionShell
      description="Create a reusable application or request shell, then add fields and approval steps on the detail page."
      title="Create form template"
    >
      <form action={createFormTemplateAction} className="space-y-4">
        <input name="returnTo" type="hidden" value={returnTo} />
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClassName}>Title</span>
            <Input name="title" placeholder="Recruit Application" required />
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Key</span>
            <Input name="key" placeholder="Optional slug-like key" />
          </label>
        </div>
        <label className="space-y-2">
          <span className={labelClassName}>Description</span>
          <textarea className={textareaClassName} name="description" placeholder="Explain the purpose and expected use case." />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClassName}>Form Type</span>
            <select className={fieldClassName} defaultValue="" name="formType">
              <option value="">Select form type</option>
              {referenceData.templateTypes.map((type) => (
                <option key={type.key} value={type.key}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
          <SelectField
            label="Target unit"
            name="targetUnitId"
            options={referenceData.units}
            placeholder="Optional unit scope"
          />
        </div>
        <Button type="submit">Create template</Button>
      </form>
    </SectionShell>
  );
}

export function EditFormTemplateForm({
  detail,
  referenceData,
  returnTo,
}: {
  detail: ApplicationTemplateDetail;
  referenceData: ApplicationsReferenceData;
  returnTo: string;
}) {
  return (
    <SectionShell
      description="Adjust metadata, target unit, and type without rebuilding the surrounding workflow structure."
      title="Edit form template"
    >
      <form action={updateFormTemplateAction} className="space-y-4">
        <input name="formTemplateId" type="hidden" value={detail.id} />
        <input name="returnTo" type="hidden" value={returnTo} />
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClassName}>Title</span>
            <Input defaultValue={detail.title} name="title" required />
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Key</span>
            <Input defaultValue={detail.key} name="key" />
          </label>
        </div>
        <label className="space-y-2">
          <span className={labelClassName}>Description</span>
          <textarea className={textareaClassName} defaultValue={detail.description ?? ""} name="description" />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClassName}>Form Type</span>
            <select className={fieldClassName} defaultValue={detail.formType} name="formType">
              {referenceData.templateTypes.map((type) => (
                <option key={type.key} value={type.key}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
          <SelectField
            defaultValue={detail.targetUnit?.id ?? null}
            label="Target unit"
            name="targetUnitId"
            options={referenceData.units}
            placeholder="Optional unit scope"
          />
        </div>
        <Button type="submit">Save template</Button>
      </form>
    </SectionShell>
  );
}

export function FormFieldEditorForm({
  detail,
  field,
  referenceData,
  returnTo,
}: {
  detail: ApplicationTemplateDetail;
  field?: ApplicationFieldDefinition;
  referenceData: ApplicationsReferenceData;
  returnTo: string;
}) {
  const optionRows =
    field?.options.length && field.options.length > 0
      ? [...field.options, "", "", ""].slice(0, 5)
      : ["", "", "", "", ""];

  return (
    <SectionShell
      description="Fields stay reusable and type-driven so later recruiting, transfer, and LOA workflows can share the same submission engine."
      title={field ? `Edit field: ${field.label}` : "Add field"}
    >
      <form action={upsertFormFieldAction} className="space-y-4">
        <input name="fieldId" type="hidden" value={field?.id ?? ""} />
        <input name="returnTo" type="hidden" value={returnTo} />
        <input name="templateId" type="hidden" value={detail.id} />
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClassName}>Label</span>
            <Input defaultValue={field?.label ?? ""} name="label" required />
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Key</span>
            <Input defaultValue={field?.key ?? ""} name="key" placeholder="Optional stable field key" />
          </label>
        </div>
        <label className="space-y-2">
          <span className={labelClassName}>Description</span>
          <textarea className={textareaClassName} defaultValue={field?.description ?? ""} name="description" />
        </label>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-2">
            <span className={labelClassName}>Field type</span>
            <select className={fieldClassName} defaultValue={field?.fieldType ?? ""} name="fieldType">
              <option value="">Select field type</option>
              {referenceData.fieldTypes.map((type) => (
                <option key={type.key} value={type.key}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Placeholder</span>
            <Input defaultValue={field?.placeholder ?? ""} name="placeholder" />
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Default value</span>
            <Input defaultValue={field?.defaultValue ?? ""} name="defaultValue" />
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Sort order</span>
            <Input defaultValue={field?.sortOrder ?? 0} min="0" name="sortOrder" type="number" />
          </label>
        </div>
        <label className="space-y-2">
          <span className={labelClassName}>Help text</span>
          <textarea className={textareaClassName} defaultValue={field?.helpText ?? ""} name="helpText" />
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          {optionRows.map((value, index) => (
            <label key={`${field?.id ?? "new"}-option-${index}`} className="space-y-2">
              <span className={labelClassName}>Option {index + 1}</span>
              <Input defaultValue={value} name="option" placeholder="Optional select or radio option" />
            </label>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/45 px-4 py-3 text-sm text-foreground">
            <input className="h-4 w-4 rounded border-border bg-input" defaultChecked={field?.isRequired ?? false} name="isRequired" type="checkbox" value="true" />
            Required
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/45 px-4 py-3 text-sm text-foreground">
            <input className="h-4 w-4 rounded border-border bg-input" defaultChecked={field ? !field.isEnabled : false} name="disabled" type="checkbox" value="true" />
            Disabled
          </label>
        </div>
        <Button type="submit">{field ? "Save field" : "Add field"}</Button>
      </form>
    </SectionShell>
  );
}

export function ApprovalStepEditorForm({
  detail,
  referenceData,
  returnTo,
  step,
}: {
  detail: ApplicationTemplateDetail;
  referenceData: ApplicationsReferenceData;
  returnTo: string;
  step?: ApplicationTemplateDetail["approvalSteps"][number];
}) {
  return (
    <SectionShell
      description="Keep the workflow simple for now with one-step approval plus clear placeholders for multi-step, role-targeted review."
      title={step ? `Edit step: ${step.title}` : "Add approval step"}
    >
      <form action={upsertApprovalStepAction} className="space-y-4">
        <input name="returnTo" type="hidden" value={returnTo} />
        <input name="stepId" type="hidden" value={step?.id ?? ""} />
        <input name="templateId" type="hidden" value={detail.id} />
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClassName}>Step title</span>
            <Input defaultValue={step?.title ?? ""} name="title" required />
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Step key</span>
            <Input defaultValue={step?.stepKey ?? ""} name="stepKey" placeholder="Optional stable step key" />
          </label>
        </div>
        <label className="space-y-2">
          <span className={labelClassName}>Description</span>
          <textarea className={textareaClassName} defaultValue={step?.description ?? ""} name="description" />
        </label>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-2">
            <span className={labelClassName}>Reviewer permission</span>
            <Input defaultValue={step?.reviewerPermissionKey ?? ""} name="reviewerPermissionKey" placeholder="forms.review" />
          </label>
          <SelectField
            defaultValue={step?.reviewerRoleId ?? null}
            label="Target role"
            name="reviewerRoleId"
            options={referenceData.roles}
            placeholder="Optional role gate"
          />
          <label className="space-y-2">
            <span className={labelClassName}>Unit reviewer mode</span>
            <select className={fieldClassName} defaultValue={step?.reviewerUnitMode ?? "none"} name="reviewerUnitMode">
              <option value="none">No unit targeting</option>
              <option value="target_unit">Target unit</option>
              <option value="submitter_unit">Submitter unit placeholder</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Sort order</span>
            <Input defaultValue={step?.sortOrder ?? 0} min="0" name="sortOrder" type="number" />
          </label>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/45 px-4 py-3 text-sm text-foreground">
            <input className="h-4 w-4 rounded border-border bg-input" defaultChecked={step ? !step.isRequired : false} name="optional" type="checkbox" value="true" />
            Optional step
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/45 px-4 py-3 text-sm text-foreground">
            <input className="h-4 w-4 rounded border-border bg-input" defaultChecked={step ? !step.isActive : false} name="disabled" type="checkbox" value="true" />
            Disabled
          </label>
        </div>
        <Button type="submit">{step ? "Save approval step" : "Add approval step"}</Button>
      </form>
    </SectionShell>
  );
}

export function FormTemplateStateForms({
  detail,
  returnTo,
}: {
  detail: ApplicationTemplateDetail;
  returnTo: string;
}) {
  const nextState = detail.isEnabled ? "disabled" : "enabled";

  return (
    <SectionShell
      description="Disable forms without deleting history, then archive them once the workflow is fully retired."
      title="Template state"
    >
      <div className="flex flex-wrap gap-3">
        <form action={setFormTemplateEnabledStateAction}>
          <input name="formTemplateId" type="hidden" value={detail.id} />
          <input name="nextState" type="hidden" value={nextState} />
          <input name="returnTo" type="hidden" value={returnTo} />
          <Button type="submit" variant="outline">
            {detail.isEnabled ? "Disable template" : "Enable template"}
          </Button>
        </form>
        <form action={duplicateFormTemplateAction}>
          <input name="formTemplateId" type="hidden" value={detail.id} />
          <input name="returnTo" type="hidden" value="/administration/forms" />
          <Button type="submit" variant="outline">
            Duplicate template
          </Button>
        </form>
        {!detail.isArchived ? (
          <form action={archiveFormTemplateAction}>
            <input name="formTemplateId" type="hidden" value={detail.id} />
            <input name="returnTo" type="hidden" value={returnTo} />
            <Button type="submit" variant="outline">
              Archive template
            </Button>
          </form>
        ) : null}
      </div>
    </SectionShell>
  );
}

function SubmissionField({
  field,
  referenceData,
}: {
  field: ApplicationFieldDefinition;
  referenceData: ApplicationsReferenceData;
}) {
  const fieldName = `answer:${field.id}`;
  const placeholder = field.placeholder ?? field.helpText ?? "";

  if (field.fieldType === "long_text") {
    return (
      <label className="space-y-2">
        <span className={labelClassName}>{field.label}</span>
        <textarea className={textareaClassName} defaultValue={field.defaultValue ?? ""} name={fieldName} placeholder={placeholder} />
        {field.helpText ? <p className="text-sm text-muted-foreground">{field.helpText}</p> : null}
      </label>
    );
  }

  if (field.fieldType === "dropdown" || field.fieldType === "unit_selector" || field.fieldType === "member_selector") {
    const options =
      field.fieldType === "unit_selector"
        ? referenceData.units.map((unit) => ({ value: unit.label, label: unit.label }))
        : field.fieldType === "member_selector"
          ? referenceData.reviewers.map((reviewer) => ({ value: reviewer.label, label: reviewer.label }))
        : field.options.map((option) => ({ value: option, label: option }));

    return (
      <label className="space-y-2">
        <span className={labelClassName}>{field.label}</span>
        <select className={fieldClassName} defaultValue={field.defaultValue ?? ""} name={fieldName}>
          <option value="">Select an option</option>
          {options.map((option) => (
            <option key={`${field.id}-${option.value}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {field.helpText ? <p className="text-sm text-muted-foreground">{field.helpText}</p> : null}
      </label>
    );
  }

  if (field.fieldType === "radio") {
    return (
      <fieldset className="space-y-3">
        <legend className={labelClassName}>{field.label}</legend>
        <div className="grid gap-3">
          {field.options.map((option) => (
            <label key={`${field.id}-${option}`} className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/45 px-4 py-3 text-sm text-foreground">
              <input className="h-4 w-4 rounded border-border bg-input" defaultChecked={field.defaultValue === option} name={fieldName} type="radio" value={option} />
              <span>{option}</span>
            </label>
          ))}
        </div>
        {field.helpText ? <p className="text-sm text-muted-foreground">{field.helpText}</p> : null}
      </fieldset>
    );
  }

  if (field.fieldType === "checkbox" || field.fieldType === "acknowledgement_checkbox") {
    return (
      <label className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/45 px-4 py-3 text-sm text-foreground">
        <input className="h-4 w-4 rounded border-border bg-input" defaultChecked={field.defaultValue === "true"} name={fieldName} type="checkbox" value="true" />
        <span>{field.label}</span>
      </label>
    );
  }

  return (
    <label className="space-y-2">
      <span className={labelClassName}>{field.label}</span>
      <Input
        defaultValue={field.defaultValue ?? ""}
        name={fieldName}
        placeholder={placeholder}
        type={field.fieldType === "date" ? "date" : "text"}
      />
      {field.helpText ? <p className="text-sm text-muted-foreground">{field.helpText}</p> : null}
    </label>
  );
}

export function FormSubmissionComposer({
  referenceData,
  template,
  returnTo,
}: {
  referenceData: ApplicationsReferenceData;
  template: ApplicationTemplateDetail;
  returnTo: string;
}) {
  const activeFields = template.fields
    .filter((field) => field.isEnabled)
    .sort((left, right) => left.sortOrder - right.sortOrder);

  return (
    <SectionShell
      description="This submission flow stays intentionally service-driven so later transfer, LOA, and recruiting automation can attach without rebuilding the UI."
      title="Submit application"
    >
      <form action={createFormSubmissionAction} className="space-y-4">
        <input name="returnTo" type="hidden" value={returnTo} />
        <input name="templateId" type="hidden" value={template.id} />
        <input name="targetUnitId" type="hidden" value={template.targetUnit?.id ?? ""} />
        <div className="grid gap-4">
          {activeFields.map((field) => (
            <SubmissionField key={field.id} field={field} referenceData={referenceData} />
          ))}
        </div>
        <label className="space-y-2">
          <span className={labelClassName}>Comment for reviewers</span>
          <textarea className={textareaClassName} name="comment" placeholder="Optional notes, context, or follow-up details." />
        </label>
        <div className="flex flex-wrap gap-3">
          <Button name="submissionMode" type="submit" value="submit">
            Submit application
          </Button>
          <Button name="submissionMode" type="submit" value="draft" variant="outline">
            Save draft
          </Button>
        </div>
      </form>
    </SectionShell>
  );
}

export function ApplicationCommentTimeline({
  comments,
}: {
  comments: ApplicationSubmissionComment[];
}) {
  return (
    <div className="space-y-3">
      {comments.map((comment) => (
        <Card key={comment.id} className="border-border/70 bg-background/45">
          <CardContent className="space-y-2 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <MessageSquareText className="h-4 w-4 text-primary" />
              <p className="font-semibold text-foreground">{comment.authorLabel}</p>
              <StatusBadge
                label={comment.isInternal ? "Internal" : "Comment"}
                tone={comment.isInternal ? "warning" : "info"}
              />
            </div>
            <p className="text-sm leading-7 text-muted-foreground">{comment.body}</p>
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              {formatDateTime(comment.createdAt)}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ApplicationDecisionTimeline({
  submission,
}: {
  submission: ApplicationSubmissionDetail;
}) {
  return (
    <div className="space-y-3">
      {submission.decisions.map((decision) => (
        <Card key={decision.id} className="border-border/70 bg-background/45">
          <CardContent className="space-y-2 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <p className="font-semibold text-foreground">{decision.decidedByLabel}</p>
              <StatusBadge label={decision.decision.replaceAll("_", " ")} tone={getApplicationStatusTone(decision.decision)} />
            </div>
            <p className="text-sm text-muted-foreground">
              {decision.approvalStepTitle ?? "No step label"} / {decision.previousStatusLabel ?? "Unknown"} to {decision.nextStatusLabel ?? "Unknown"}
            </p>
            {decision.comment ? <p className="text-sm leading-7 text-muted-foreground">{decision.comment}</p> : null}
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              {formatDateTime(decision.createdAt)}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function SubmissionCommentForm({
  allowInternal,
  returnTo,
  submissionId,
}: {
  allowInternal: boolean;
  returnTo: string;
  submissionId: string;
}) {
  return (
    <SectionShell
      description="Comments create a shared timeline without forcing staff to leave the queue or ask the submitter to repeat context elsewhere."
      title="Add comment"
    >
      <form action={addSubmissionCommentAction} className="space-y-4">
        <input name="returnTo" type="hidden" value={returnTo} />
        <input name="submissionId" type="hidden" value={submissionId} />
        <label className="space-y-2">
          <span className={labelClassName}>Comment</span>
          <textarea className={textareaClassName} name="body" placeholder="Share context, follow-up questions, or approval notes." required />
        </label>
        {allowInternal ? (
          <label className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/45 px-4 py-3 text-sm text-foreground">
            <input className="h-4 w-4 rounded border-border bg-input" name="isInternal" type="checkbox" value="true" />
            Internal staff-only note
          </label>
        ) : null}
        <Button type="submit">Post comment</Button>
      </form>
    </SectionShell>
  );
}

export function SubmissionReviewerForm({
  referenceData,
  returnTo,
  selectedReviewerId,
  submissionId,
}: {
  referenceData: ApplicationsReferenceData;
  returnTo: string;
  selectedReviewerId?: string | null;
  submissionId: string;
}) {
  return (
    <SectionShell
      description="Reviewer assignment stays explicit so queues remain predictable and future automation can route to the right staff lane."
      title="Assign reviewer"
    >
      <form action={assignSubmissionReviewerAction} className="space-y-4">
        <input name="returnTo" type="hidden" value={returnTo} />
        <input name="submissionId" type="hidden" value={submissionId} />
        <SelectField
          defaultValue={selectedReviewerId ?? null}
          label="Reviewer"
          name="reviewerUserId"
          options={referenceData.reviewers}
          placeholder="Unassigned"
        />
        <label className="space-y-2">
          <span className={labelClassName}>Reason</span>
          <textarea className={textareaClassName} name="reason" placeholder="Optional handoff note for the audit trail." />
        </label>
        <Button type="submit" variant="outline">
          Save reviewer
        </Button>
      </form>
    </SectionShell>
  );
}

function SubmissionStatusActionForm({
  action,
  buttonLabel,
  description,
  returnTo,
  submissionId,
  variant = "default",
}: {
  action: (formData: FormData) => Promise<void>;
  buttonLabel: string;
  description: string;
  returnTo: string;
  submissionId: string;
  variant?: "default" | "outline";
}) {
  return (
    <form action={action} className="space-y-3">
      <input name="returnTo" type="hidden" value={returnTo} />
      <input name="submissionId" type="hidden" value={submissionId} />
      <label className="space-y-2">
        <span className={labelClassName}>Comment</span>
        <textarea className={textareaClassName} name="comment" placeholder={description} />
      </label>
      <Button type="submit" variant={variant}>
        {buttonLabel}
      </Button>
    </form>
  );
}

export function SubmissionReviewActions({
  canApprove,
  canArchive,
  canDeny,
  canReview,
  returnTo,
  submissionId,
}: {
  canApprove: boolean;
  canArchive: boolean;
  canDeny: boolean;
  canReview: boolean;
  returnTo: string;
  submissionId: string;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {canReview ? (
        <SectionShell
          description="Send the submission back with a clear change request while preserving review history."
          title="Request changes"
        >
          <SubmissionStatusActionForm
            action={requestSubmissionChangesAction}
            buttonLabel="Request changes"
            description="What needs to be updated before this can move forward?"
            returnTo={returnTo}
            submissionId={submissionId}
            variant="outline"
          />
        </SectionShell>
      ) : null}
      {canApprove ? (
        <SectionShell
          description="Approve this step or advance the submission through the next configured approval stage."
          title="Approve"
        >
          <SubmissionStatusActionForm
            action={approveSubmissionAction}
            buttonLabel="Approve submission"
            description="Optional approval summary for the audit trail."
            returnTo={returnTo}
            submissionId={submissionId}
          />
        </SectionShell>
      ) : null}
      {canDeny ? (
        <SectionShell
          description="Deny the submission with a permanent review decision and an auditable note."
          title="Deny"
        >
          <SubmissionStatusActionForm
            action={denySubmissionAction}
            buttonLabel="Deny submission"
            description="Explain why the request is being denied."
            returnTo={returnTo}
            submissionId={submissionId}
            variant="outline"
          />
        </SectionShell>
      ) : null}
      {canArchive ? (
        <SectionShell
          description="Archive the submission after review is complete or the request has aged out of the active queue."
          title="Archive"
        >
          <SubmissionStatusActionForm
            action={archiveSubmissionAction}
            buttonLabel="Archive submission"
            description="Optional archive note."
            returnTo={returnTo}
            submissionId={submissionId}
            variant="outline"
          />
        </SectionShell>
      ) : null}
    </div>
  );
}

export function SubmissionWithdrawForm({
  returnTo,
  submissionId,
}: {
  returnTo: string;
  submissionId: string;
}) {
  return (
    <SectionShell
      description="Withdraw the request without deleting the record so reviewers still retain full history."
      title="Withdraw submission"
    >
      <SubmissionStatusActionForm
        action={withdrawSubmissionAction}
        buttonLabel="Withdraw submission"
        description="Optional reason for withdrawing your request."
        returnTo={returnTo}
        submissionId={submissionId}
        variant="outline"
      />
    </SectionShell>
  );
}

export function FormPreviewFields({
  fields,
}: {
  fields: ApplicationTemplateDetail["fields"];
}) {
  return (
    <div className="space-y-3">
      {fields.map((field) => (
        <Card key={field.id} className="border-border/70 bg-background/45">
          <CardContent className="space-y-3 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              <p className="font-semibold text-foreground">{field.label}</p>
              <StatusBadge label={field.fieldTypeLabel} tone="info" />
              {field.isRequired ? <StatusBadge label="Required" tone="warning" /> : null}
              {!field.isEnabled ? <StatusBadge label="Disabled" tone="muted" /> : null}
            </div>
            <p className="text-sm text-muted-foreground">
              {field.description ?? field.helpText ?? field.placeholder ?? "No additional guidance yet."}
            </p>
            {field.options.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {field.options.map((option) => (
                  <StatusBadge key={`${field.id}-${option}`} label={option} tone="muted" />
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function WorkflowPreview({
  detail,
}: {
  detail: ApplicationTemplateDetail;
}) {
  return (
    <div className="space-y-3">
      {detail.approvalSteps.map((step) => (
        <Card key={step.id} className="border-border/70 bg-background/45">
          <CardContent className="space-y-2 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <CircleDot className="h-4 w-4 text-primary" />
              <p className="font-semibold text-foreground">{step.title}</p>
              <StatusBadge label={step.reviewerUnitMode.replaceAll("_", " ")} tone="muted" />
              {step.reviewerPermissionKey ? (
                <StatusBadge label={step.reviewerPermissionKey} tone="info" />
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">
              {step.description ?? "No additional reviewer guidance yet."}
            </p>
            {step.reviewerRoleLabel ? (
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Target role {step.reviewerRoleLabel}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function SubmissionActivitySummary({
  submission,
}: {
  submission: ApplicationSubmissionDetail;
}) {
  return (
    <div className="space-y-3">
      <Card className="border-border/70 bg-background/45">
        <CardContent className="space-y-2 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <FileStack className="h-4 w-4 text-primary" />
            <p className="font-semibold text-foreground">{submission.titleSnapshot}</p>
            <ApplicationStatusPill label={submission.status.label} statusKey={submission.status.key} />
          </div>
          <p className="text-sm text-muted-foreground">
            Submitted {formatDateTime(submission.submittedAt ?? submission.createdAt)}
          </p>
        </CardContent>
      </Card>
      {submission.currentApprovalStep ? (
        <Card className="border-border/70 bg-background/45">
          <CardContent className="space-y-2 p-4">
            <p className="font-semibold text-foreground">Current approval step</p>
            <p className="text-sm text-muted-foreground">
              {submission.currentApprovalStep.title}
              {submission.currentApprovalStep.reviewerPermissionKey
                ? ` / ${submission.currentApprovalStep.reviewerPermissionKey}`
                : ""}
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
