import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

import { getCurrentUser } from "@/server/auth/current-user";
import {
  formFieldTypeCatalog,
  formTemplateTypeCatalog,
  submissionStatusCatalog,
} from "@/server/database/catalogs";
import { prisma } from "@/server/database/client";
import { can } from "@/server/permissions/access";
import type {
  ApplicationApprovalDecision,
  ApplicationApprovalStepDefinition,
  ApplicationFieldDefinition,
  ApplicationSubmissionDetail,
  ApplicationSubmissionListData,
  ApplicationSubmissionSummary,
  ApplicationTemplateDetail,
  ApplicationTemplateListData,
  ApplicationTemplateSummary,
  ApplicationsReferenceData,
  FormSubmissionsFilter,
  FormTemplatesFilter,
} from "@/server/applications/types";
import {
  canAccessFormScopedUnit,
  getAnswerDisplayValue,
  getFormFieldTypeLabel,
  getFormTemplateTypeLabel,
  getScopedFormUnitIds,
  isFormTemplateType,
  isSubmissionStatusKey,
  normalizeFilterValue,
} from "@/server/applications/utils";

type FormTemplateRecord = Prisma.FormTemplateGetPayload<{
  include: {
    targetUnit: true;
    fields: true;
    approvalSteps: {
      include: {
        targetRole: true;
      };
    };
    _count: {
      select: {
        approvalSteps: true;
        fields: true;
        submissions: true;
      };
    };
  };
}>;

type FormSubmissionRecord = Prisma.FormSubmissionGetPayload<{
  include: {
    template: true;
    status: true;
    targetUnit: true;
    reviewer: true;
    submittedBy: true;
    answers: {
      include: {
        field: true;
      };
    };
    comments: {
      include: {
        author: true;
      };
    };
    decisions: {
      include: {
        approvalStep: true;
        decidedBy: true;
        previousStatus: true;
        nextStatus: true;
      };
    };
    currentApprovalStep: {
      include: {
        targetRole: true;
      };
    };
  };
}>;

function mapField(record: FormTemplateRecord["fields"][number]): ApplicationFieldDefinition {
  return {
    id: record.id,
    key: record.key,
    label: record.label,
    description: record.description,
    fieldType: record.fieldType,
    fieldTypeLabel: getFormFieldTypeLabel(record.fieldType),
    placeholder: record.placeholder,
    helpText: record.helpText,
    options: Array.isArray(record.options)
      ? record.options.map((entry) => String(entry))
      : [],
    defaultValue:
      typeof record.defaultValue === "string" || typeof record.defaultValue === "number"
        ? String(record.defaultValue)
        : null,
    isRequired: record.isRequired,
    isEnabled: record.isEnabled,
    sortOrder: record.sortOrder,
  };
}

function mapApprovalStep(
  record:
    | FormTemplateRecord["approvalSteps"][number]
    | NonNullable<FormSubmissionRecord["currentApprovalStep"]>,
): ApplicationApprovalStepDefinition {
  return {
    id: record.id,
    stepKey: record.stepKey,
    title: record.title,
    description: record.description,
    sortOrder: record.sortOrder,
    reviewerPermissionKey: record.reviewerPermissionKey,
    reviewerRoleId: record.roleId,
    reviewerRoleLabel: record.targetRole?.label ?? null,
    reviewerUnitMode: record.reviewerUnitMode,
    isRequired: record.isRequired,
    isActive: record.isActive,
  };
}

function mapTemplate(record: FormTemplateRecord): ApplicationTemplateSummary {
  return {
    id: record.id,
    key: record.key,
    title: record.title,
    description: record.description,
    formType: record.formType,
    formTypeLabel: getFormTemplateTypeLabel(record.formType),
    targetUnit: record.targetUnit
      ? {
          id: record.targetUnit.id,
          key: record.targetUnit.key,
          label: record.targetUnit.name,
          hint: record.targetUnit.shortName,
        }
      : null,
    isEnabled: record.isEnabled,
    isArchived: record.archivedAt !== null,
    fieldCount: record._count.fields,
    approvalStepCount: record._count.approvalSteps,
    submissionCount: record._count.submissions,
    updatedAt: record.updatedAt,
  };
}

function mapSubmission(record: FormSubmissionRecord): ApplicationSubmissionSummary {
  return {
    id: record.id,
    createdAt: record.createdAt,
    descriptionSnapshot: record.descriptionSnapshot,
    formType: record.template.formType,
    formTypeLabel: getFormTemplateTypeLabel(record.template.formType),
    reviewer: record.reviewer
      ? {
          id: record.reviewer.id,
          label:
            record.reviewer.displayName ??
            record.reviewer.name ??
            record.reviewer.email ??
            "Unknown reviewer",
        }
      : null,
    status: {
      id: record.status.id,
      key: record.status.key,
      label: record.status.label,
      isTerminal: record.status.isTerminal,
    },
    submittedAt: record.submittedAt,
    submittedBy: record.submittedBy
      ? {
          id: record.submittedBy.id,
          label:
            record.submittedBy.displayName ??
            record.submittedBy.name ??
            record.submittedBy.email ??
            "Unknown submitter",
        }
      : null,
    targetUnit: record.targetUnit
      ? {
          id: record.targetUnit.id,
          key: record.targetUnit.key,
          label: record.targetUnit.name,
          hint: record.targetUnit.shortName,
        }
      : null,
    template: {
      id: record.template.id,
      key: record.template.key,
      title: record.template.title,
    },
    titleSnapshot: record.titleSnapshot,
    updatedAt: record.updatedAt,
  };
}

function mapSubmissionDecision(record: FormSubmissionRecord["decisions"][number]): ApplicationApprovalDecision {
  return {
    id: record.id,
    approvalStepTitle: record.approvalStep?.title ?? null,
    comment: record.comment,
    createdAt: record.createdAt,
    decision: record.decision,
    decidedByLabel:
      record.decidedBy?.displayName ??
      record.decidedBy?.name ??
      record.decidedBy?.email ??
      "System",
    nextStatusLabel: record.nextStatus?.label ?? null,
    previousStatusLabel: record.previousStatus?.label ?? null,
  };
}

function buildTemplateWhere(filters: FormTemplatesFilter, scopedUnitIds: string[] | null): Prisma.FormTemplateWhereInput {
  const q = normalizeFilterValue(filters.q);
  const formType = normalizeFilterValue(filters.formType);
  const state = normalizeFilterValue(filters.state);
  const unitId = normalizeFilterValue(filters.unitId);
  const andClauses: Prisma.FormTemplateWhereInput[] = [{ deletedAt: null }];

  if (scopedUnitIds) {
    andClauses.push({
      OR: [
        { targetUnitId: null },
        {
          targetUnitId: {
            in: scopedUnitIds.length > 0 ? scopedUnitIds : ["__no-form-scope__"],
          },
        },
      ],
    });
  }

  if (unitId) {
    andClauses.push({ targetUnitId: unitId });
  }

  if (formType && isFormTemplateType(formType)) {
    andClauses.push({ formType });
  }

  if (state === "enabled") {
    andClauses.push({ isEnabled: true, archivedAt: null });
  } else if (state === "disabled") {
    andClauses.push({ isEnabled: false, archivedAt: null });
  } else if (state === "archived") {
    andClauses.push({ archivedAt: { not: null } });
  }

  if (q) {
    andClauses.push({
      OR: [
        { title: { contains: q } },
        { description: { contains: q } },
        { key: { contains: q } },
      ],
    });
  }

  return {
    AND: andClauses,
  };
}

function buildSubmissionWhere(
  filters: FormSubmissionsFilter,
  scopedUnitIds: string[] | null,
): Prisma.FormSubmissionWhereInput {
  const q = normalizeFilterValue(filters.q);
  const status = normalizeFilterValue(filters.status);
  const formType = normalizeFilterValue(filters.formType);
  const unitId = normalizeFilterValue(filters.unitId);
  const reviewerId = normalizeFilterValue(filters.reviewerId);
  const andClauses: Prisma.FormSubmissionWhereInput[] = [];

  if (scopedUnitIds) {
    andClauses.push({
      OR: [
        { targetUnitId: null },
        {
          targetUnitId: {
            in: scopedUnitIds.length > 0 ? scopedUnitIds : ["__no-form-scope__"],
          },
        },
      ],
    });
  }

  if (unitId) {
    andClauses.push({ targetUnitId: unitId });
  }

  if (reviewerId) {
    andClauses.push({ reviewerUserId: reviewerId });
  }

  if (status && isSubmissionStatusKey(status)) {
    andClauses.push({
      status: {
        key: status,
      },
    });
  }

  if (formType && isFormTemplateType(formType)) {
    andClauses.push({
      template: {
        formType,
      },
    });
  }

  if (q) {
    andClauses.push({
      OR: [
        { titleSnapshot: { contains: q } },
        { descriptionSnapshot: { contains: q } },
        { template: { title: { contains: q } } },
        { submittedBy: { displayName: { contains: q } } },
        { reviewer: { displayName: { contains: q } } },
      ],
    });
  }

  return {
    AND: andClauses,
  };
}

function summarizeSubmissions(submissions: ApplicationSubmissionSummary[]) {
  return {
    approved: submissions.filter((submission) => submission.status.key === "approved").length,
    changesRequested: submissions.filter((submission) => submission.status.key === "changes_requested").length,
    denied: submissions.filter((submission) => submission.status.key === "denied").length,
    drafts: submissions.filter((submission) => submission.status.key === "draft").length,
    submitted: submissions.filter((submission) => submission.status.key === "submitted").length,
    total: submissions.length,
    underReview: submissions.filter((submission) => submission.status.key === "under_review").length,
  };
}

async function assertSubmissionAccess(record: FormSubmissionRecord) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("An authenticated user is required.");
  }

  if (record.submittedByUserId === user.id) {
    return user;
  }

  if (
    can(user, "forms.admin", { unitId: record.targetUnitId }) ||
    can(user, "forms.review", { unitId: record.targetUnitId }) ||
    can(user, "forms.comment", { unitId: record.targetUnitId })
  ) {
    return user;
  }

  throw new Error("You do not have access to this submission.");
}

async function requireFormsPermission(permissionKey: string) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/unauthorized");
  }

  if (can(user, "forms.admin") || can(user, permissionKey)) {
    return user;
  }

  redirect("/forbidden");
}

export async function getApplicationsReferenceData(): Promise<ApplicationsReferenceData> {
  const user = await requireFormsPermission("forms.view");
  const canReview = can(user, "forms.review") || can(user, "forms.admin");
  const scopedUnitIds = getScopedFormUnitIds(user, "forms.review");

  const [units, reviewers, roles] = await Promise.all([
    prisma.unit.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    canReview
      ? prisma.user.findMany({
          where: {
            isActive: true,
          },
          include: {
            userRoles: {
              where: {
                isActive: true,
                role: {
                  isActive: true,
                },
                ...(scopedUnitIds
                  ? {
                      OR: [
                        { unitId: null },
                        {
                          unitId: {
                            in: scopedUnitIds.length > 0 ? scopedUnitIds : ["__no-form-scope__"],
                          },
                        },
                      ],
                    }
                  : {}),
              },
              include: {
                role: true,
              },
            },
          },
          orderBy: [{ displayName: "asc" }, { name: "asc" }],
        })
      : Promise.resolve([]),
    prisma.role.findMany({
      where: {
        isActive: true,
      },
      orderBy: [{ isSystem: "desc" }, { label: "asc" }],
    }),
  ]);

  return {
    fieldTypes: [...formFieldTypeCatalog],
    roles: roles.map((role) => ({
      id: role.id,
      key: role.name,
      label: role.label,
      hint: role.isSystem ? "System role" : null,
    })),
    reviewers: reviewers
      .map((reviewer) => ({
        id: reviewer.id,
        label: reviewer.displayName ?? reviewer.name ?? reviewer.email ?? "Unknown reviewer",
      })),
    statuses: submissionStatusCatalog.map((status) => ({
      key: status.key,
      label: status.label,
      description: status.description,
      isTerminal: status.isTerminal,
    })),
    templateTypes: [...formTemplateTypeCatalog],
    units: units.map((unit) => ({
      id: unit.id,
      key: unit.key,
      label: unit.name,
      hint: unit.shortName,
    })),
  };
}

export async function listAvailableFormTemplates(): Promise<ApplicationTemplateListData> {
  const user = await requireFormsPermission("forms.view");
  const scopedUnitIds = getScopedFormUnitIds(user, "forms.view");
  const records = await prisma.formTemplate.findMany({
    where: {
      ...buildTemplateWhere({ state: "enabled" }, scopedUnitIds),
      isEnabled: true,
      archivedAt: null,
    },
    include: {
      targetUnit: true,
      fields: {
        where: {
          isEnabled: true,
        },
      },
      approvalSteps: {
        where: {
          isActive: true,
        },
        include: {
          targetRole: true,
        },
      },
      _count: {
        select: {
          approvalSteps: true,
          fields: true,
          submissions: true,
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
  });

  const templates = records.map(mapTemplate);

  return {
    templates,
    summary: {
      total: templates.length,
      active: templates.filter((template) => template.isEnabled && !template.isArchived).length,
      disabled: templates.filter((template) => !template.isEnabled && !template.isArchived).length,
      archived: templates.filter((template) => template.isArchived).length,
    },
  };
}

export async function listAdministrationFormTemplates(
  filters: FormTemplatesFilter = {},
): Promise<ApplicationTemplateListData> {
  const user = await requireFormsPermission("forms.view");
  const scopedUnitIds = getScopedFormUnitIds(user, "forms.edit");
  const records = await prisma.formTemplate.findMany({
    where: buildTemplateWhere(filters, scopedUnitIds),
    include: {
      targetUnit: true,
      fields: true,
      approvalSteps: {
        include: {
          targetRole: true,
        },
      },
      _count: {
        select: {
          approvalSteps: true,
          fields: true,
          submissions: true,
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
  });

  const templates = records.map(mapTemplate);

  return {
    templates,
    summary: {
      total: templates.length,
      active: templates.filter((template) => template.isEnabled && !template.isArchived).length,
      disabled: templates.filter((template) => !template.isEnabled && !template.isArchived).length,
      archived: templates.filter((template) => template.isArchived).length,
    },
  };
}

export async function getFormTemplateDetail(templateId: string): Promise<ApplicationTemplateDetail | null> {
  const user = await requireFormsPermission("forms.view");
  const scopedUnitIds = getScopedFormUnitIds(user, "forms.view");
  const record = await prisma.formTemplate.findFirst({
    where: {
      id: templateId,
      deletedAt: null,
      ...(scopedUnitIds
        ? {
            OR: [
              { targetUnitId: null },
              {
                targetUnitId: {
                  in: scopedUnitIds.length > 0 ? scopedUnitIds : ["__no-form-scope__"],
                },
              },
            ],
          }
        : {}),
    },
    include: {
      targetUnit: true,
      fields: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
      approvalSteps: {
        include: {
          targetRole: true,
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
      _count: {
        select: {
          approvalSteps: true,
          fields: true,
          submissions: true,
        },
      },
    },
  });

  if (!record) {
    return null;
  }

  return {
    ...mapTemplate(record),
    fields: record.fields.map(mapField),
    approvalSteps: record.approvalSteps.map(mapApprovalStep),
  };
}

export async function listOwnFormSubmissions(
  filters: FormSubmissionsFilter = {},
): Promise<ApplicationSubmissionListData> {
  const user = await requireFormsPermission("forms.view");
  const records = await prisma.formSubmission.findMany({
    where: {
      submittedByUserId: user.id,
      ...buildSubmissionWhere(filters, null),
    },
    include: {
      template: true,
      status: true,
      targetUnit: true,
      reviewer: true,
      submittedBy: true,
      answers: {
        include: {
          field: true,
        },
      },
      comments: {
        include: {
          author: true,
        },
      },
      decisions: {
        include: {
          approvalStep: true,
          decidedBy: true,
          previousStatus: true,
          nextStatus: true,
        },
      },
      currentApprovalStep: {
        include: {
          targetRole: true,
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  const submissions = records.map(mapSubmission);

  return {
    submissions,
    summary: summarizeSubmissions(submissions),
  };
}

export async function listSubmissionReviewQueue(
  filters: FormSubmissionsFilter = {},
): Promise<ApplicationSubmissionListData> {
  const user = await requireFormsPermission("forms.review");
  const scopedUnitIds = getScopedFormUnitIds(user, "forms.review");
  const records = await prisma.formSubmission.findMany({
    where: buildSubmissionWhere(filters, scopedUnitIds),
    include: {
      template: true,
      status: true,
      targetUnit: true,
      reviewer: true,
      submittedBy: true,
      answers: {
        include: {
          field: true,
        },
      },
      comments: {
        include: {
          author: true,
        },
      },
      decisions: {
        include: {
          approvalStep: true,
          decidedBy: true,
          previousStatus: true,
          nextStatus: true,
        },
      },
      currentApprovalStep: {
        include: {
          targetRole: true,
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  const submissions = records
    .filter((submission) => {
      if (can(user, "forms.admin", { unitId: submission.targetUnitId })) {
        return true;
      }

      return canAccessFormScopedUnit(user, "forms.review", submission.targetUnitId);
    })
    .map(mapSubmission);

  return {
    submissions,
    summary: summarizeSubmissions(submissions),
  };
}

export async function getFormSubmissionDetail(
  submissionId: string,
): Promise<ApplicationSubmissionDetail | null> {
  const record = await prisma.formSubmission.findUnique({
    where: {
      id: submissionId,
    },
    include: {
      template: true,
      status: true,
      targetUnit: true,
      reviewer: true,
      submittedBy: true,
      answers: {
        include: {
          field: true,
        },
        orderBy: [{ createdAt: "asc" }],
      },
      comments: {
        include: {
          author: true,
        },
        orderBy: [{ createdAt: "asc" }],
      },
      decisions: {
        include: {
          approvalStep: true,
          decidedBy: true,
          previousStatus: true,
          nextStatus: true,
        },
        orderBy: [{ createdAt: "asc" }],
      },
      currentApprovalStep: {
        include: {
          targetRole: true,
        },
      },
    },
  });

  if (!record) {
    return null;
  }

  const actor = await assertSubmissionAccess(record);
  const canViewInternalComments =
    can(actor, "forms.admin", { unitId: record.targetUnitId }) ||
    can(actor, "forms.review", { unitId: record.targetUnitId });

  return {
    ...mapSubmission(record),
    answers: record.answers.map((answer) => ({
      id: answer.id,
      fieldId: answer.fieldId,
      fieldKeySnapshot: answer.fieldKeySnapshot,
      fieldLabelSnapshot: answer.fieldLabelSnapshot,
      valueDisplay: getAnswerDisplayValue(answer.valueJson, answer.valueText),
      valueJson: answer.valueJson,
      valueText: answer.valueText,
    })),
    comments: record.comments
      .filter((comment) => canViewInternalComments || !comment.isInternal)
      .map((comment) => ({
        id: comment.id,
        authorLabel:
          comment.author?.displayName ??
          comment.author?.name ??
          comment.author?.email ??
          "System",
        body: comment.body,
        createdAt: comment.createdAt,
        isInternal: comment.isInternal,
      })),
    currentApprovalStep: record.currentApprovalStep
      ? mapApprovalStep(record.currentApprovalStep)
      : null,
    decisions: record.decisions.map(mapSubmissionDecision),
  };
}
