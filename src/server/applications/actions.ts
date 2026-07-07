"use server";

import { redirect } from "next/navigation";

import {
  addSubmissionComment,
  approveSubmission,
  archiveFormTemplate,
  archiveSubmission,
  assignSubmissionReviewer,
  createFormSubmission,
  createFormTemplate,
  denySubmission,
  duplicateFormTemplate,
  requestSubmissionChanges,
  setFormTemplateEnabledState,
  updateFormTemplate,
  upsertApprovalStep,
  upsertFormField,
  withdrawSubmission,
} from "@/server/applications/service";

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function getOptionalNumber(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);

  if (!value) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function withFlash(returnTo: string, key: "message" | "error", value: string) {
  const [pathname, existingQuery] = returnTo.split("?");
  const params = new URLSearchParams(existingQuery ?? "");
  params.set(key, value);

  return `${pathname}?${params.toString()}`;
}

async function runAction(
  formData: FormData,
  operation: () => Promise<void>,
  successMessage: string,
) {
  const returnTo = getRequiredString(formData, "returnTo") || "/applications";

  try {
    await operation();
    redirect(withFlash(returnTo, "message", successMessage));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to complete the request.";
    redirect(withFlash(returnTo, "error", message));
  }
}

function getAnswerRows(formData: FormData) {
  const rows: Array<{
    fieldId: string;
    valueJson?: unknown;
    valueText?: string | null;
  }> = [];

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("answer:")) {
      continue;
    }

    const fieldId = key.replace("answer:", "");
    const stringValue = typeof value === "string" ? value : "";
    rows.push({
      fieldId,
      valueJson: stringValue,
      valueText: stringValue,
    });
  }

  return rows;
}

function getOptionRows(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);
}

export async function createFormTemplateAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await createFormTemplate({
        description: getOptionalString(formData, "description"),
        formType: getRequiredString(formData, "formType"),
        key: getOptionalString(formData, "key"),
        targetUnitId: getOptionalString(formData, "targetUnitId"),
        title: getRequiredString(formData, "title"),
      });
    },
    "Form template created.",
  );
}

export async function updateFormTemplateAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await updateFormTemplate({
        description: getOptionalString(formData, "description"),
        formTemplateId: getRequiredString(formData, "formTemplateId"),
        formType: getRequiredString(formData, "formType"),
        key: getOptionalString(formData, "key"),
        targetUnitId: getOptionalString(formData, "targetUnitId"),
        title: getRequiredString(formData, "title"),
      });
    },
    "Form template updated.",
  );
}

export async function upsertFormFieldAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await upsertFormField({
        defaultValue: getOptionalString(formData, "defaultValue"),
        description: getOptionalString(formData, "description"),
        fieldId: getOptionalString(formData, "fieldId"),
        fieldType: getRequiredString(formData, "fieldType"),
        helpText: getOptionalString(formData, "helpText"),
        isEnabled: !getBoolean(formData, "disabled"),
        isRequired: getBoolean(formData, "isRequired"),
        key: getOptionalString(formData, "key"),
        label: getRequiredString(formData, "label"),
        options: getOptionRows(formData, "option"),
        placeholder: getOptionalString(formData, "placeholder"),
        sortOrder: getOptionalNumber(formData, "sortOrder"),
        templateId: getRequiredString(formData, "templateId"),
      });
    },
    "Form field saved.",
  );
}

export async function upsertApprovalStepAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await upsertApprovalStep({
        description: getOptionalString(formData, "description"),
        isActive: !getBoolean(formData, "disabled"),
        isRequired: !getBoolean(formData, "optional"),
        reviewerPermissionKey: getOptionalString(formData, "reviewerPermissionKey"),
        reviewerRoleId: getOptionalString(formData, "reviewerRoleId"),
        reviewerUnitMode: getOptionalString(formData, "reviewerUnitMode"),
        sortOrder: getOptionalNumber(formData, "sortOrder"),
        stepId: getOptionalString(formData, "stepId"),
        stepKey: getOptionalString(formData, "stepKey"),
        templateId: getRequiredString(formData, "templateId"),
        title: getRequiredString(formData, "title"),
      });
    },
    "Approval step saved.",
  );
}

export async function setFormTemplateEnabledStateAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await setFormTemplateEnabledState(
        getRequiredString(formData, "formTemplateId"),
        getRequiredString(formData, "nextState") === "enabled",
        getOptionalString(formData, "reason"),
      );
    },
    "Form template state updated.",
  );
}

export async function archiveFormTemplateAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await archiveFormTemplate(
        getRequiredString(formData, "formTemplateId"),
        getOptionalString(formData, "reason"),
      );
    },
    "Form template archived.",
  );
}

export async function duplicateFormTemplateAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await duplicateFormTemplate(getRequiredString(formData, "formTemplateId"));
    },
    "Form template duplicated.",
  );
}

export async function createFormSubmissionAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      const submissionMode = getRequiredString(formData, "submissionMode");

      if (submissionMode !== "draft" && submissionMode !== "submit") {
        throw new Error("Select a valid submission action.");
      }

      await createFormSubmission({
        answers: getAnswerRows(formData),
        comment: getOptionalString(formData, "comment"),
        submissionMode,
        targetUnitId: getOptionalString(formData, "targetUnitId"),
        templateId: getRequiredString(formData, "templateId"),
      });
    },
    "Submission saved.",
  );
}

export async function addSubmissionCommentAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await addSubmissionComment({
        body: getRequiredString(formData, "body"),
        isInternal: getBoolean(formData, "isInternal"),
        submissionId: getRequiredString(formData, "submissionId"),
      });
    },
    "Comment added.",
  );
}

export async function assignSubmissionReviewerAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await assignSubmissionReviewer({
        reason: getOptionalString(formData, "reason"),
        reviewerUserId: getOptionalString(formData, "reviewerUserId"),
        submissionId: getRequiredString(formData, "submissionId"),
      });
    },
    "Reviewer assignment updated.",
  );
}

export async function requestSubmissionChangesAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await requestSubmissionChanges({
        comment: getOptionalString(formData, "comment"),
        submissionId: getRequiredString(formData, "submissionId"),
      });
    },
    "Changes requested.",
  );
}

export async function approveSubmissionAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await approveSubmission({
        comment: getOptionalString(formData, "comment"),
        submissionId: getRequiredString(formData, "submissionId"),
      });
    },
    "Submission approved.",
  );
}

export async function denySubmissionAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await denySubmission({
        comment: getOptionalString(formData, "comment"),
        submissionId: getRequiredString(formData, "submissionId"),
      });
    },
    "Submission denied.",
  );
}

export async function withdrawSubmissionAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await withdrawSubmission({
        comment: getOptionalString(formData, "comment"),
        submissionId: getRequiredString(formData, "submissionId"),
      });
    },
    "Submission withdrawn.",
  );
}

export async function archiveSubmissionAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await archiveSubmission({
        comment: getOptionalString(formData, "comment"),
        submissionId: getRequiredString(formData, "submissionId"),
      });
    },
    "Submission archived.",
  );
}
