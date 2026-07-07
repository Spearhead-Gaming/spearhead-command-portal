import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/server/auth/current-user";
import { prisma } from "@/server/database/client";
import { recordAuditEvent } from "@/server/services/audit-log-service";
import {
  queueFormApprovedNotificationPlaceholder,
  queueFormChangesRequestedNotificationPlaceholder,
  queueFormCommentAddedNotificationPlaceholder,
  queueFormDeniedNotificationPlaceholder,
  queueFormReviewRequestedNotificationPlaceholder,
  queueFormSubmittedNotificationPlaceholder,
  queueLoaRequestedNotificationPlaceholder,
  queueRaspApplicationSubmittedNotificationPlaceholder,
  queueTransferRequestedNotificationPlaceholder,
} from "@/server/notifications/hooks";
import { can } from "@/server/permissions/access";
import type {
  AddSubmissionCommentInput,
  AssignSubmissionReviewerInput,
  CreateFormSubmissionInput,
  CreateFormTemplateInput,
  UpdateFormTemplateInput,
  UpdateSubmissionStatusInput,
  UpsertApprovalStepInput,
  UpsertFormFieldInput,
} from "@/server/applications/types";
import {
  canTransitionSubmissionStatus,
  isFormFieldType,
  isFormTemplateType,
  normalizeOptionalString,
  normalizeRequiredString,
  slugifyFormKey,
} from "@/server/applications/utils";

type ManagedSubmissionRecord = Prisma.FormSubmissionGetPayload<{
  include: {
    template: {
      include: {
        approvalSteps: {
          orderBy: {
            sortOrder: "asc";
          };
        };
      };
    };
    status: true;
    targetUnit: true;
    reviewer: true;
    submittedBy: true;
    currentApprovalStep: true;
  };
}>;

function revalidateApplicationRoutes(input?: {
  formTemplateId?: string | null;
}) {
  revalidatePath("/", "layout");
  revalidatePath("/applications");
  revalidatePath("/administration/forms");
  revalidatePath("/administration/submissions");

  if (input?.formTemplateId) {
    revalidatePath(`/applications/${input.formTemplateId}`);
    revalidatePath(`/administration/forms/${input.formTemplateId}`);
  }
}

function toJsonValue(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  return value as Prisma.InputJsonValue;
}

function getUniqueRecipientUserIds(userIds: Array<string | null | undefined>) {
  return Array.from(new Set(userIds.filter((userId): userId is string => Boolean(userId))));
}

async function getSubmissionStatusByKey(key: string) {
  return prisma.submissionStatus.findUnique({
    where: {
      key,
    },
  });
}

async function getManagedTemplate(formTemplateId: string) {
  return prisma.formTemplate.findUnique({
    where: {
      id: formTemplateId,
    },
    include: {
      fields: true,
      approvalSteps: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
      targetUnit: true,
    },
  });
}

async function getManagedSubmission(submissionId: string) {
  return prisma.formSubmission.findUnique({
    where: {
      id: submissionId,
    },
    include: {
      template: {
        include: {
          approvalSteps: {
            where: {
              isActive: true,
            },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          },
        },
      },
      status: true,
      targetUnit: true,
      reviewer: true,
      submittedBy: true,
      currentApprovalStep: true,
    },
  });
}

async function requireScopedFormPermission(permissionKey: string, unitId?: string | null) {
  const actor = await getCurrentUser();

  if (!actor) {
    throw new Error("An authenticated user is required.");
  }

  if (can(actor, "forms.admin", { unitId })) {
    return actor;
  }

  if (can(actor, permissionKey, { unitId })) {
    return actor;
  }

  throw new Error("You do not have permission to perform that form action.");
}

async function requireBaseFormPermission(permissionKey: string) {
  const actor = await getCurrentUser();

  if (!actor) {
    throw new Error("An authenticated user is required.");
  }

  if (can(actor, "forms.admin") || can(actor, permissionKey)) {
    return actor;
  }

  throw new Error("You do not have permission to perform that form action.");
}

async function assertSubmissionActorAccess(
  submission: ManagedSubmissionRecord,
  permissionKey: string,
) {
  const actor = await getCurrentUser();

  if (!actor) {
    throw new Error("An authenticated user is required.");
  }

  if (submission.submittedByUserId === actor.id && permissionKey === "forms.comment") {
    return actor;
  }

  if (can(actor, "forms.admin", { unitId: submission.targetUnitId })) {
    return actor;
  }

  if (can(actor, permissionKey, { unitId: submission.targetUnitId })) {
    return actor;
  }

  throw new Error("You do not have access to that submission.");
}

function getNextApprovalStep(submission: ManagedSubmissionRecord) {
  if (!submission.currentApprovalStepId) {
    return submission.template.approvalSteps[0] ?? null;
  }

  const currentIndex = submission.template.approvalSteps.findIndex(
    (step) => step.id === submission.currentApprovalStepId,
  );

  if (currentIndex === -1) {
    return submission.template.approvalSteps[0] ?? null;
  }

  return submission.template.approvalSteps[currentIndex + 1] ?? null;
}

async function transitionSubmissionStatus(input: {
  actorUserId: string;
  comment?: string | null;
  decision: string;
  nextStatusKey: string;
  submission: ManagedSubmissionRecord;
}) {
  const nextStatus = await getSubmissionStatusByKey(input.nextStatusKey);

  if (!nextStatus) {
    throw new Error("The requested submission status is not configured.");
  }

  if (!canTransitionSubmissionStatus(input.submission.status.key, nextStatus.key)) {
    throw new Error(
      `${input.submission.status.label} submissions cannot transition to ${nextStatus.label}.`,
    );
  }

  const isApproval = input.decision === "approved";
  const nextApprovalStep = isApproval ? getNextApprovalStep(input.submission) : null;
  const shouldAdvanceStep =
    isApproval &&
    input.submission.currentApprovalStepId !== null &&
    nextApprovalStep !== null &&
    nextApprovalStep.id !== input.submission.currentApprovalStepId;
  const resolvedStatusKey = shouldAdvanceStep ? "under_review" : nextStatus.key;
  const resolvedStatus =
    resolvedStatusKey === nextStatus.key
      ? nextStatus
      : await getSubmissionStatusByKey(resolvedStatusKey);

  if (!resolvedStatus) {
    throw new Error("The follow-on review status is not configured.");
  }

  const updated = await prisma.formSubmission.update({
    where: {
      id: input.submission.id,
    },
    data: {
      currentApprovalStepId: shouldAdvanceStep ? nextApprovalStep?.id ?? null : input.submission.currentApprovalStepId,
      reviewedAt: ["approved", "denied"].includes(input.decision) && !shouldAdvanceStep ? new Date() : input.submission.reviewedAt,
      reviewerUserId: shouldAdvanceStep ? null : input.submission.reviewerUserId,
      submissionStatusId: resolvedStatus.id,
    },
    include: {
      status: true,
    },
  });

  await prisma.approvalDecision.create({
    data: {
      approvalStepId: input.submission.currentApprovalStepId,
      comment: normalizeOptionalString(input.comment),
      decision: input.decision,
      decidedByUserId: input.actorUserId,
      nextStatusId: updated.submissionStatusId,
      previousStatusId: input.submission.submissionStatusId,
      submissionId: input.submission.id,
    },
  });

  await recordAuditEvent({
    action: "form.submission.status_changed",
    actorUserId: input.actorUserId,
    entityId: input.submission.id,
    entityType: "FormSubmission",
    oldValue: {
      currentApprovalStepId: input.submission.currentApprovalStepId,
      reviewerUserId: input.submission.reviewerUserId,
      status: input.submission.status.key,
    },
    newValue: {
      currentApprovalStepId: shouldAdvanceStep ? nextApprovalStep?.id ?? null : input.submission.currentApprovalStepId,
      reviewerUserId: shouldAdvanceStep ? null : input.submission.reviewerUserId,
      status: updated.status.key,
    },
    reason: normalizeOptionalString(input.comment),
    summary: `${input.submission.titleSnapshot} moved to ${updated.status.label}.`,
  });

  return {
    nextApprovalStep,
    status: updated.status,
    updated,
  };
}

export async function createFormTemplate(input: CreateFormTemplateInput) {
  const actor = await requireBaseFormPermission("forms.create");
  const title = normalizeRequiredString(input.title, "Form title");
  const key = slugifyFormKey(input.key ? normalizeRequiredString(input.key, "Form key") : title);
  const formType = normalizeRequiredString(input.formType, "Form type");

  if (!isFormTemplateType(formType)) {
    throw new Error("Select a valid form type.");
  }

  const template = await prisma.formTemplate.create({
    data: {
      createdByUserId: actor.id,
      description: normalizeOptionalString(input.description),
      formType,
      isEnabled: true,
      key,
      targetUnitId: normalizeOptionalString(input.targetUnitId),
      title,
    },
  });

  await recordAuditEvent({
    action: "form.template.created",
    actorUserId: actor.id,
    entityId: template.id,
    entityType: "FormTemplate",
    newValue: {
      description: template.description,
      formType: template.formType,
      isEnabled: template.isEnabled,
      key: template.key,
      targetUnitId: template.targetUnitId,
      title: template.title,
    },
    summary: `${template.title} form template created.`,
  });

  revalidateApplicationRoutes({ formTemplateId: template.id });

  return template;
}

export async function updateFormTemplate(input: UpdateFormTemplateInput) {
  const existing = await getManagedTemplate(input.formTemplateId);

  if (!existing) {
    throw new Error("Form template not found.");
  }

  const actor = await requireScopedFormPermission("forms.edit", existing.targetUnitId);
  const title = normalizeRequiredString(input.title, "Form title");
  const key = slugifyFormKey(input.key ? normalizeRequiredString(input.key, "Form key") : title);
  const formType = normalizeRequiredString(input.formType, "Form type");

  if (!isFormTemplateType(formType)) {
    throw new Error("Select a valid form type.");
  }

  const updated = await prisma.formTemplate.update({
    where: {
      id: existing.id,
    },
    data: {
      description: normalizeOptionalString(input.description),
      formType,
      key,
      targetUnitId: normalizeOptionalString(input.targetUnitId),
      title,
    },
  });

  await recordAuditEvent({
    action: "form.template.edited",
    actorUserId: actor.id,
    entityId: updated.id,
    entityType: "FormTemplate",
    oldValue: {
      description: existing.description,
      formType: existing.formType,
      key: existing.key,
      targetUnitId: existing.targetUnitId,
      title: existing.title,
    },
    newValue: {
      description: updated.description,
      formType: updated.formType,
      key: updated.key,
      targetUnitId: updated.targetUnitId,
      title: updated.title,
    },
    summary: `${updated.title} form template updated.`,
  });

  revalidateApplicationRoutes({ formTemplateId: updated.id });

  return updated;
}

export async function upsertFormField(input: UpsertFormFieldInput) {
  const template = await getManagedTemplate(input.templateId);

  if (!template) {
    throw new Error("Form template not found.");
  }

  const actor = await requireScopedFormPermission("forms.edit", template.targetUnitId);
  const label = normalizeRequiredString(input.label, "Field label");
  const fieldType = normalizeRequiredString(input.fieldType, "Field type");

  if (!isFormFieldType(fieldType)) {
    throw new Error("Select a valid field type.");
  }

  const key = slugifyFormKey(input.key ? normalizeRequiredString(input.key, "Field key") : label);
  const options = (input.options ?? [])
    .map((entry) => entry.trim())
    .filter(Boolean);
  const record = input.fieldId
    ? await prisma.formField.update({
        where: {
          id: input.fieldId,
        },
        data: {
          defaultValue: toJsonValue(normalizeOptionalString(input.defaultValue)),
          description: normalizeOptionalString(input.description),
          fieldType,
          helpText: normalizeOptionalString(input.helpText),
          isEnabled: input.isEnabled ?? true,
          isRequired: input.isRequired ?? false,
          key,
          label,
          options: toJsonValue(options),
          placeholder: normalizeOptionalString(input.placeholder),
          sortOrder: input.sortOrder ?? 0,
        },
      })
    : await prisma.formField.create({
        data: {
          defaultValue: toJsonValue(normalizeOptionalString(input.defaultValue)),
          description: normalizeOptionalString(input.description),
          fieldType,
          helpText: normalizeOptionalString(input.helpText),
          isEnabled: input.isEnabled ?? true,
          isRequired: input.isRequired ?? false,
          key,
          label,
          options: toJsonValue(options),
          placeholder: normalizeOptionalString(input.placeholder),
          sortOrder: input.sortOrder ?? 0,
          templateId: template.id,
        },
      });

  await recordAuditEvent({
    action: input.fieldId ? "form.template.field_edited" : "form.template.field_created",
    actorUserId: actor.id,
    entityId: record.id,
    entityType: "FormField",
    newValue: {
      fieldType: record.fieldType,
      isEnabled: record.isEnabled,
      isRequired: record.isRequired,
      key: record.key,
      label: record.label,
      sortOrder: record.sortOrder,
      templateId: record.templateId,
    },
    summary: `${record.label} ${input.fieldId ? "updated" : "added"} on ${template.title}.`,
  });

  revalidateApplicationRoutes({ formTemplateId: template.id });

  return record;
}

export async function upsertApprovalStep(input: UpsertApprovalStepInput) {
  const template = await getManagedTemplate(input.templateId);

  if (!template) {
    throw new Error("Form template not found.");
  }

  const actor = await requireScopedFormPermission("forms.edit", template.targetUnitId);
  const title = normalizeRequiredString(input.title, "Approval step title");
  const stepKey = slugifyFormKey(
    input.stepKey ? normalizeRequiredString(input.stepKey, "Approval step key") : title,
  );
  const record = input.stepId
    ? await prisma.approvalStep.update({
        where: {
          id: input.stepId,
        },
        data: {
          description: normalizeOptionalString(input.description),
          isActive: input.isActive ?? true,
          isRequired: input.isRequired ?? true,
          reviewerPermissionKey: normalizeOptionalString(input.reviewerPermissionKey),
          roleId: normalizeOptionalString(input.reviewerRoleId),
          reviewerUnitMode: normalizeOptionalString(input.reviewerUnitMode) ?? "none",
          sortOrder: input.sortOrder ?? 0,
          stepKey,
          title,
        },
      })
    : await prisma.approvalStep.create({
        data: {
          description: normalizeOptionalString(input.description),
          isActive: input.isActive ?? true,
          isRequired: input.isRequired ?? true,
          reviewerPermissionKey: normalizeOptionalString(input.reviewerPermissionKey),
          roleId: normalizeOptionalString(input.reviewerRoleId),
          reviewerUnitMode: normalizeOptionalString(input.reviewerUnitMode) ?? "none",
          sortOrder: input.sortOrder ?? 0,
          stepKey,
          templateId: template.id,
          title,
        },
      });

  await recordAuditEvent({
    action: input.stepId ? "form.template.approval_step_edited" : "form.template.approval_step_created",
    actorUserId: actor.id,
    entityId: record.id,
    entityType: "ApprovalStep",
    newValue: {
      reviewerPermissionKey: record.reviewerPermissionKey,
      reviewerRoleId: record.roleId,
      reviewerUnitMode: record.reviewerUnitMode,
      sortOrder: record.sortOrder,
      stepKey: record.stepKey,
      templateId: record.templateId,
      title: record.title,
    },
    summary: `${record.title} ${input.stepId ? "updated" : "added"} on ${template.title}.`,
  });

  revalidateApplicationRoutes({ formTemplateId: template.id });

  return record;
}

export async function setFormTemplateEnabledState(
  formTemplateId: string,
  isEnabled: boolean,
  reason?: string | null,
) {
  const template = await getManagedTemplate(formTemplateId);

  if (!template) {
    throw new Error("Form template not found.");
  }

  const actor = await requireScopedFormPermission("forms.edit", template.targetUnitId);
  const updated = await prisma.formTemplate.update({
    where: {
      id: template.id,
    },
    data: {
      isEnabled,
    },
  });

  await recordAuditEvent({
    action: "form.template.edited",
    actorUserId: actor.id,
    entityId: updated.id,
    entityType: "FormTemplate",
    oldValue: {
      isEnabled: template.isEnabled,
    },
    newValue: {
      isEnabled: updated.isEnabled,
    },
    reason: normalizeOptionalString(reason),
    summary: `${updated.title} ${isEnabled ? "enabled" : "disabled"}.`,
  });

  revalidateApplicationRoutes({ formTemplateId: template.id });

  return updated;
}

export async function archiveFormTemplate(formTemplateId: string, reason?: string | null) {
  const template = await getManagedTemplate(formTemplateId);

  if (!template) {
    throw new Error("Form template not found.");
  }

  const actor = await requireScopedFormPermission("forms.archive", template.targetUnitId);
  const updated = await prisma.formTemplate.update({
    where: {
      id: template.id,
    },
    data: {
      archivedAt: new Date(),
      isEnabled: false,
    },
  });

  await recordAuditEvent({
    action: "form.template.archived",
    actorUserId: actor.id,
    entityId: updated.id,
    entityType: "FormTemplate",
    oldValue: {
      archivedAt: template.archivedAt?.toISOString() ?? null,
      isEnabled: template.isEnabled,
    },
    newValue: {
      archivedAt: updated.archivedAt?.toISOString() ?? null,
      isEnabled: updated.isEnabled,
    },
    reason: normalizeOptionalString(reason),
    summary: `${updated.title} archived.`,
  });

  revalidateApplicationRoutes({ formTemplateId: template.id });

  return updated;
}

export async function duplicateFormTemplate(formTemplateId: string) {
  const template = await getManagedTemplate(formTemplateId);

  if (!template) {
    throw new Error("Form template not found.");
  }

  const actor = await requireScopedFormPermission("forms.edit", template.targetUnitId);
  const duplicateKey = `${template.key}-copy-${Date.now().toString(36)}`.slice(0, 120);
  const duplicate = await prisma.formTemplate.create({
    data: {
      createdByUserId: actor.id,
      description: template.description,
      formType: template.formType,
      isEnabled: false,
      key: duplicateKey,
      targetUnitId: template.targetUnitId,
      title: `${template.title} Copy`,
      fields: {
        create: template.fields
          .sort((left, right) => left.sortOrder - right.sortOrder)
          .map((field) => ({
            defaultValue: field.defaultValue as Prisma.InputJsonValue | undefined,
            description: field.description,
            fieldType: field.fieldType,
            helpText: field.helpText,
            isEnabled: field.isEnabled,
            isRequired: field.isRequired,
            key: field.key,
            label: field.label,
            options: field.options as Prisma.InputJsonValue | undefined,
            placeholder: field.placeholder,
            sortOrder: field.sortOrder,
          })),
      },
      approvalSteps: {
        create: template.approvalSteps
          .sort((left, right) => left.sortOrder - right.sortOrder)
          .map((step) => ({
            description: step.description,
            isActive: step.isActive,
            isRequired: step.isRequired,
            reviewerPermissionKey: step.reviewerPermissionKey,
            reviewerUnitMode: step.reviewerUnitMode,
            roleId: step.roleId,
            sortOrder: step.sortOrder,
            stepKey: step.stepKey,
            title: step.title,
          })),
      },
    },
  });

  await recordAuditEvent({
    action: "form.template.duplicated",
    actorUserId: actor.id,
    entityId: duplicate.id,
    entityType: "FormTemplate",
    metadata: {
      sourceTemplateId: template.id,
    },
    summary: `${template.title} duplicated as ${duplicate.title}.`,
  });

  revalidateApplicationRoutes({ formTemplateId: duplicate.id });

  return duplicate;
}

export async function createFormSubmission(input: CreateFormSubmissionInput) {
  const actor = await requireBaseFormPermission("forms.submit");
  const template = await getManagedTemplate(input.templateId);

  if (!template || template.deletedAt) {
    throw new Error("Form template not found.");
  }

  if (!template.isEnabled || template.archivedAt) {
    throw new Error("This form is not currently accepting submissions.");
  }

  const targetUnitId = normalizeOptionalString(input.targetUnitId) ?? template.targetUnitId;
  const statusKey = input.submissionMode === "draft" ? "draft" : "submitted";
  const status = await getSubmissionStatusByKey(statusKey);

  if (!status) {
    throw new Error("Submission status configuration is missing.");
  }

  const activeFields = template.fields
    .filter((field) => field.isEnabled)
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const fieldById = new Map(activeFields.map((field) => [field.id, field]));

  for (const field of activeFields) {
    if (!field.isRequired) {
      continue;
    }

    const answer = input.answers.find((entry) => entry.fieldId === field.id);
    const valueText = normalizeOptionalString(answer?.valueText);
    const hasJsonValue =
      answer?.valueJson !== undefined &&
      answer.valueJson !== null &&
      `${answer.valueJson}`.trim() !== "";

    if (!valueText && !hasJsonValue) {
      throw new Error(`${field.label} is required.`);
    }
  }

  const firstApprovalStep =
    template.approvalSteps
      .filter((step) => step.isActive)
      .sort((left, right) => left.sortOrder - right.sortOrder)[0] ?? null;

  const submission = await prisma.formSubmission.create({
    data: {
      currentApprovalStepId: firstApprovalStep?.id ?? null,
      descriptionSnapshot: template.description,
      reviewerUserId: null,
      submissionStatusId: status.id,
      submittedAt: input.submissionMode === "submit" ? new Date() : null,
      submittedByUserId: actor.id,
      targetUnitId,
      templateId: template.id,
      titleSnapshot: template.title,
      answers: {
        create: input.answers
          .filter((entry) => fieldById.has(entry.fieldId))
          .map((entry) => {
            const field = fieldById.get(entry.fieldId)!;
            const valueText = normalizeOptionalString(entry.valueText);
            const normalizedJson =
              entry.valueJson !== undefined
                ? entry.valueJson
                : valueText ?? null;

            return {
              fieldId: field.id,
              fieldKeySnapshot: field.key,
              fieldLabelSnapshot: field.label,
              valueJson: toJsonValue(normalizedJson),
              valueText,
            };
          }),
      },
      comments:
        input.comment && input.comment.trim()
          ? {
              create: {
                authorUserId: actor.id,
                body: normalizeRequiredString(input.comment, "Submission comment"),
                isInternal: false,
              },
            }
          : undefined,
    },
    include: {
      status: true,
    },
  });

  await recordAuditEvent({
    action: "form.submitted",
    actorUserId: actor.id,
    entityId: submission.id,
    entityType: "FormSubmission",
    newValue: {
      submissionMode: input.submissionMode,
      targetUnitId: submission.targetUnitId,
      templateId: submission.templateId,
      status: submission.status.key,
    },
    summary: `${template.title} ${input.submissionMode === "draft" ? "draft saved" : "submitted"}.`,
  });

  if (input.submissionMode === "submit") {
    await queueFormSubmittedNotificationPlaceholder({
      actorUserId: actor.id,
      formTitle: template.title,
      recipientUserIds: [actor.id],
      submissionId: submission.id,
      targetUnitId,
    });

    await queueFormReviewRequestedNotificationPlaceholder({
      actorUserId: actor.id,
      formTitle: template.title,
      recipientUserIds: [],
    });

    if (template.formType === "unit_transfer_request") {
    await queueTransferRequestedNotificationPlaceholder({
      actorUserId: actor.id,
      formTitle: template.title,
      recipientUserIds: [actor.id],
      });
    }

    if (template.formType === "loa_request") {
    await queueLoaRequestedNotificationPlaceholder({
      actorUserId: actor.id,
      formTitle: template.title,
      recipientUserIds: [actor.id],
      });
    }

    if (template.formType === "rasp_application") {
    await queueRaspApplicationSubmittedNotificationPlaceholder({
      actorUserId: actor.id,
      formTitle: template.title,
      recipientUserIds: [actor.id],
      });
    }
  }

  revalidateApplicationRoutes({ formTemplateId: template.id });

  return submission;
}

export async function addSubmissionComment(input: AddSubmissionCommentInput) {
  const submission = await getManagedSubmission(input.submissionId);

  if (!submission) {
    throw new Error("Submission not found.");
  }

  const actor = await assertSubmissionActorAccess(submission, "forms.comment");

  if (input.isInternal && submission.submittedByUserId === actor.id) {
    throw new Error("Only staff comments may be marked internal.");
  }

  const comment = await prisma.submissionComment.create({
    data: {
      authorUserId: actor.id,
      body: normalizeRequiredString(input.body, "Comment"),
      isInternal: input.isInternal ?? false,
      submissionId: submission.id,
    },
  });

  await recordAuditEvent({
    action: "form.comment.added",
    actorUserId: actor.id,
    entityId: submission.id,
    entityType: "FormSubmission",
    metadata: {
      commentId: comment.id,
      isInternal: comment.isInternal,
    },
    summary: `Comment added to ${submission.titleSnapshot}.`,
  });

  await queueFormCommentAddedNotificationPlaceholder({
    actorUserId: actor.id,
    formTitle: submission.titleSnapshot,
    recipientUserIds: getUniqueRecipientUserIds([
      submission.submittedByUserId,
      submission.reviewerUserId,
    ]).filter((userId) => userId !== actor.id),
  });

  revalidateApplicationRoutes({ formTemplateId: submission.templateId });

  return comment;
}

export async function assignSubmissionReviewer(input: AssignSubmissionReviewerInput) {
  const submission = await getManagedSubmission(input.submissionId);

  if (!submission) {
    throw new Error("Submission not found.");
  }

  const actor = await assertSubmissionActorAccess(submission, "forms.assign_reviewer");
  const underReviewStatus = await getSubmissionStatusByKey("under_review");

  if (!underReviewStatus) {
    throw new Error("Under Review submission status is not configured.");
  }

  const updated = await prisma.formSubmission.update({
    where: {
      id: submission.id,
    },
    data: {
      reviewerUserId: normalizeOptionalString(input.reviewerUserId),
      submissionStatusId:
        submission.status.key === "submitted" ? underReviewStatus.id : submission.submissionStatusId,
    },
  });

  await recordAuditEvent({
    action: "form.reviewer.assigned",
    actorUserId: actor.id,
    entityId: submission.id,
    entityType: "FormSubmission",
    oldValue: {
      reviewerUserId: submission.reviewerUserId,
      status: submission.status.key,
    },
    newValue: {
      reviewerUserId: updated.reviewerUserId,
      status:
        submission.status.key === "submitted" ? underReviewStatus.key : submission.status.key,
    },
    reason: normalizeOptionalString(input.reason),
    summary: `${submission.titleSnapshot} reviewer assignment updated.`,
  });

  await queueFormReviewRequestedNotificationPlaceholder({
    actorUserId: actor.id,
    formTitle: submission.titleSnapshot,
    recipientUserIds: getUniqueRecipientUserIds([
      updated.reviewerUserId,
      submission.submittedByUserId,
    ]),
  });

  revalidateApplicationRoutes({ formTemplateId: submission.templateId });

  return updated;
}

export async function requestSubmissionChanges(input: UpdateSubmissionStatusInput) {
  const submission = await getManagedSubmission(input.submissionId);

  if (!submission) {
    throw new Error("Submission not found.");
  }

  const actor = await assertSubmissionActorAccess(submission, "forms.review");
  const result = await transitionSubmissionStatus({
    actorUserId: actor.id,
    comment: input.comment,
    decision: "changes_requested",
    nextStatusKey: "changes_requested",
    submission,
  });

  await recordAuditEvent({
    action: "form.changes_requested",
    actorUserId: actor.id,
    entityId: submission.id,
    entityType: "FormSubmission",
    reason: normalizeOptionalString(input.comment),
    summary: `${submission.titleSnapshot} was sent back with requested changes.`,
  });

  await queueFormChangesRequestedNotificationPlaceholder({
    actorUserId: actor.id,
    formTitle: submission.titleSnapshot,
    recipientUserIds: getUniqueRecipientUserIds([submission.submittedByUserId]),
  });

  revalidateApplicationRoutes({ formTemplateId: submission.templateId });

  return result;
}

export async function approveSubmission(input: UpdateSubmissionStatusInput) {
  const submission = await getManagedSubmission(input.submissionId);

  if (!submission) {
    throw new Error("Submission not found.");
  }

  const actor = await assertSubmissionActorAccess(submission, "forms.approve");
  const result = await transitionSubmissionStatus({
    actorUserId: actor.id,
    comment: input.comment,
    decision: "approved",
    nextStatusKey: "approved",
    submission,
  });

  await recordAuditEvent({
    action: "form.approval.made",
    actorUserId: actor.id,
    entityId: submission.id,
    entityType: "FormSubmission",
    reason: normalizeOptionalString(input.comment),
    summary:
      result.nextApprovalStep && result.updated.status.key === "under_review"
        ? `${submission.titleSnapshot} advanced to ${result.nextApprovalStep.title}.`
        : `${submission.titleSnapshot} approved.`,
  });

  if (result.updated.status.key === "approved") {
    await queueFormApprovedNotificationPlaceholder({
      actorUserId: actor.id,
      formTitle: submission.titleSnapshot,
      recipientUserIds: getUniqueRecipientUserIds([submission.submittedByUserId]),
      submissionId: submission.id,
      targetUnitId: submission.targetUnitId,
    });
  } else if (result.nextApprovalStep) {
    await queueFormReviewRequestedNotificationPlaceholder({
      actorUserId: actor.id,
      formTitle: submission.titleSnapshot,
      recipientUserIds: getUniqueRecipientUserIds([submission.submittedByUserId]),
    });
  }

  revalidateApplicationRoutes({ formTemplateId: submission.templateId });

  return result;
}

export async function denySubmission(input: UpdateSubmissionStatusInput) {
  const submission = await getManagedSubmission(input.submissionId);

  if (!submission) {
    throw new Error("Submission not found.");
  }

  const actor = await assertSubmissionActorAccess(submission, "forms.deny");
  const result = await transitionSubmissionStatus({
    actorUserId: actor.id,
    comment: input.comment,
    decision: "denied",
    nextStatusKey: "denied",
    submission,
  });

  await recordAuditEvent({
    action: "form.denial.made",
    actorUserId: actor.id,
    entityId: submission.id,
    entityType: "FormSubmission",
    reason: normalizeOptionalString(input.comment),
    summary: `${submission.titleSnapshot} denied.`,
  });

  await queueFormDeniedNotificationPlaceholder({
    actorUserId: actor.id,
    formTitle: submission.titleSnapshot,
    recipientUserIds: getUniqueRecipientUserIds([submission.submittedByUserId]),
    submissionId: submission.id,
    targetUnitId: submission.targetUnitId,
  });

  revalidateApplicationRoutes({ formTemplateId: submission.templateId });

  return result;
}

export async function withdrawSubmission(input: UpdateSubmissionStatusInput) {
  const submission = await getManagedSubmission(input.submissionId);

  if (!submission) {
    throw new Error("Submission not found.");
  }

  const actor = await getCurrentUser();

  if (!actor || submission.submittedByUserId !== actor.id) {
    throw new Error("Only the original submitter can withdraw this submission.");
  }

  if (!canTransitionSubmissionStatus(submission.status.key, "withdrawn")) {
    throw new Error("This submission can no longer be withdrawn.");
  }

  const withdrawnStatus = await getSubmissionStatusByKey("withdrawn");

  if (!withdrawnStatus) {
    throw new Error("Withdrawn submission status is not configured.");
  }

  const updated = await prisma.formSubmission.update({
    where: {
      id: submission.id,
    },
    data: {
      reviewedAt: new Date(),
      submissionStatusId: withdrawnStatus.id,
      withdrawnAt: new Date(),
    },
  });

  await recordAuditEvent({
    action: "form.submission.status_changed",
    actorUserId: actor.id,
    entityId: submission.id,
    entityType: "FormSubmission",
    oldValue: {
      status: submission.status.key,
    },
    newValue: {
      status: withdrawnStatus.key,
    },
    reason: normalizeOptionalString(input.comment),
    summary: `${submission.titleSnapshot} withdrawn by submitter.`,
  });

  revalidateApplicationRoutes({ formTemplateId: submission.templateId });

  return updated;
}

export async function archiveSubmission(input: UpdateSubmissionStatusInput) {
  const submission = await getManagedSubmission(input.submissionId);

  if (!submission) {
    throw new Error("Submission not found.");
  }

  const actor = await assertSubmissionActorAccess(submission, "forms.archive");
  const archivedStatus = await getSubmissionStatusByKey("archived");

  if (!archivedStatus) {
    throw new Error("Archived submission status is not configured.");
  }

  if (!canTransitionSubmissionStatus(submission.status.key, "archived")) {
    throw new Error("This submission cannot be archived from its current state.");
  }

  const updated = await prisma.formSubmission.update({
    where: {
      id: submission.id,
    },
    data: {
      archivedAt: new Date(),
      submissionStatusId: archivedStatus.id,
    },
  });

  await recordAuditEvent({
    action: "form.submission.archived",
    actorUserId: actor.id,
    entityId: submission.id,
    entityType: "FormSubmission",
    oldValue: {
      status: submission.status.key,
    },
    newValue: {
      status: archivedStatus.key,
    },
    reason: normalizeOptionalString(input.comment),
    summary: `${submission.titleSnapshot} archived.`,
  });

  revalidateApplicationRoutes({ formTemplateId: submission.templateId });

  return updated;
}
