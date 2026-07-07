import type {
  formFieldTypeCatalog,
  formTemplateTypeCatalog,
  submissionStatusCatalog,
} from "@/server/database/catalogs";

export type FormTemplateTypeKey = (typeof formTemplateTypeCatalog)[number]["key"];
export type FormFieldTypeKey = (typeof formFieldTypeCatalog)[number]["key"];
export type SubmissionStatusKey = (typeof submissionStatusCatalog)[number]["key"];

export type ApplicationOption = {
  id: string;
  label: string;
  hint?: string | null;
  key?: string;
};

export type FormTemplatesFilter = {
  q?: string;
  formType?: FormTemplateTypeKey | "";
  state?: "enabled" | "disabled" | "archived" | "";
  unitId?: string;
};

export type FormSubmissionsFilter = {
  q?: string;
  status?: SubmissionStatusKey | "";
  formType?: FormTemplateTypeKey | "";
  unitId?: string;
  reviewerId?: string;
};

export type ApplicationsReferenceData = {
  fieldTypes: Array<{
    key: FormFieldTypeKey;
    label: string;
    description: string;
  }>;
  roles: ApplicationOption[];
  reviewers: ApplicationOption[];
  statuses: Array<{
    key: SubmissionStatusKey;
    label: string;
    description: string;
    isTerminal: boolean;
  }>;
  templateTypes: Array<{
    key: FormTemplateTypeKey;
    label: string;
    description: string;
  }>;
  units: ApplicationOption[];
};

export type ApplicationFieldDefinition = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  fieldType: FormFieldTypeKey | string;
  fieldTypeLabel: string;
  placeholder: string | null;
  helpText: string | null;
  options: string[];
  defaultValue: string | null;
  isRequired: boolean;
  isEnabled: boolean;
  sortOrder: number;
};

export type ApplicationApprovalStepDefinition = {
  id: string;
  stepKey: string;
  title: string;
  description: string | null;
  sortOrder: number;
  reviewerPermissionKey: string | null;
  reviewerRoleId: string | null;
  reviewerRoleLabel: string | null;
  reviewerUnitMode: string;
  isRequired: boolean;
  isActive: boolean;
};

export type ApplicationTemplateSummary = {
  id: string;
  key: string;
  title: string;
  description: string | null;
  formType: FormTemplateTypeKey | string;
  formTypeLabel: string;
  targetUnit: ApplicationOption | null;
  isEnabled: boolean;
  isArchived: boolean;
  fieldCount: number;
  approvalStepCount: number;
  submissionCount: number;
  updatedAt: Date;
};

export type ApplicationTemplateDetail = ApplicationTemplateSummary & {
  fields: ApplicationFieldDefinition[];
  approvalSteps: ApplicationApprovalStepDefinition[];
};

export type ApplicationTemplateListData = {
  summary: {
    active: number;
    archived: number;
    disabled: number;
    total: number;
  };
  templates: ApplicationTemplateSummary[];
};

export type SubmissionStatusSummary = {
  id: string;
  key: SubmissionStatusKey | string;
  label: string;
  isTerminal: boolean;
};

export type ApplicationSubmissionSummary = {
  id: string;
  createdAt: Date;
  descriptionSnapshot: string | null;
  formType: FormTemplateTypeKey | string;
  formTypeLabel: string;
  reviewer: ApplicationOption | null;
  status: SubmissionStatusSummary;
  submittedAt: Date | null;
  submittedBy: ApplicationOption | null;
  targetUnit: ApplicationOption | null;
  template: {
    id: string;
    key: string;
    title: string;
  };
  titleSnapshot: string;
  updatedAt: Date;
};

export type ApplicationSubmissionAnswer = {
  id: string;
  fieldId: string | null;
  fieldKeySnapshot: string;
  fieldLabelSnapshot: string;
  valueDisplay: string;
  valueJson: unknown;
  valueText: string | null;
};

export type ApplicationSubmissionComment = {
  id: string;
  authorLabel: string;
  body: string;
  createdAt: Date;
  isInternal: boolean;
};

export type ApplicationApprovalDecision = {
  id: string;
  approvalStepTitle: string | null;
  comment: string | null;
  createdAt: Date;
  decision: string;
  decidedByLabel: string;
  nextStatusLabel: string | null;
  previousStatusLabel: string | null;
};

export type ApplicationSubmissionDetail = ApplicationSubmissionSummary & {
  answers: ApplicationSubmissionAnswer[];
  comments: ApplicationSubmissionComment[];
  currentApprovalStep: ApplicationApprovalStepDefinition | null;
  decisions: ApplicationApprovalDecision[];
};

export type ApplicationSubmissionListData = {
  submissions: ApplicationSubmissionSummary[];
  summary: {
    approved: number;
    changesRequested: number;
    denied: number;
    drafts: number;
    submitted: number;
    total: number;
    underReview: number;
  };
};

export type CreateFormTemplateInput = {
  description?: string | null;
  formType: string;
  key?: string | null;
  targetUnitId?: string | null;
  title: string;
};

export type UpdateFormTemplateInput = CreateFormTemplateInput & {
  formTemplateId: string;
};

export type UpsertFormFieldInput = {
  defaultValue?: string | null;
  description?: string | null;
  fieldId?: string | null;
  fieldType: string;
  helpText?: string | null;
  isEnabled?: boolean;
  isRequired?: boolean;
  key?: string | null;
  label: string;
  options?: string[];
  placeholder?: string | null;
  sortOrder?: number | null;
  templateId: string;
};

export type UpsertApprovalStepInput = {
  description?: string | null;
  isActive?: boolean;
  isRequired?: boolean;
  reviewerPermissionKey?: string | null;
  reviewerRoleId?: string | null;
  reviewerUnitMode?: string | null;
  sortOrder?: number | null;
  stepId?: string | null;
  stepKey?: string | null;
  templateId: string;
  title: string;
};

export type CreateFormSubmissionInput = {
  answers: Array<{
    fieldId: string;
    valueJson?: unknown;
    valueText?: string | null;
  }>;
  comment?: string | null;
  submissionMode: "draft" | "submit";
  targetUnitId?: string | null;
  templateId: string;
};

export type UpdateSubmissionStatusInput = {
  comment?: string | null;
  submissionId: string;
};

export type AssignSubmissionReviewerInput = {
  reason?: string | null;
  reviewerUserId?: string | null;
  submissionId: string;
};

export type AddSubmissionCommentInput = {
  body: string;
  isInternal?: boolean;
  submissionId: string;
};
