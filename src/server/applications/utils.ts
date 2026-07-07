import type { PortalUser } from "@/features/auth/types";
import {
  formFieldTypeCatalog,
  formTemplateTypeCatalog,
  submissionStatusCatalog,
} from "@/server/database/catalogs";
import { getPermissionScope, normalizeFilterValue } from "@/server/events/utils";

export { normalizeFilterValue };

export function slugifyFormKey(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function normalizeRequiredString(value: string, label: string) {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  return normalized;
}

export function normalizeOptionalString(value?: string | null) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

export function isFormTemplateType(value: string): value is (typeof formTemplateTypeCatalog)[number]["key"] {
  return formTemplateTypeCatalog.some((entry) => entry.key === value);
}

export function isFormFieldType(value: string): value is (typeof formFieldTypeCatalog)[number]["key"] {
  return formFieldTypeCatalog.some((entry) => entry.key === value);
}

export function isSubmissionStatusKey(value: string): value is (typeof submissionStatusCatalog)[number]["key"] {
  return submissionStatusCatalog.some((entry) => entry.key === value);
}

export function getFormTemplateTypeLabel(value: string) {
  return (
    formTemplateTypeCatalog.find((entry) => entry.key === value)?.label ??
    value.replaceAll("_", " ")
  );
}

export function getFormFieldTypeLabel(value: string) {
  return (
    formFieldTypeCatalog.find((entry) => entry.key === value)?.label ??
    value.replaceAll("_", " ")
  );
}

export function getSubmissionStatusLabel(value: string) {
  return (
    submissionStatusCatalog.find((entry) => entry.key === value)?.label ??
    value.replaceAll("_", " ")
  );
}

export function getScopedFormUnitIds(user: PortalUser, permissionKey: string) {
  const scope = getPermissionScope(user, permissionKey);

  return scope.global ? null : scope.unitIds;
}

export function canAccessFormScopedUnit(
  user: PortalUser,
  permissionKey: string,
  unitId: string | null | undefined,
) {
  const scope = getPermissionScope(user, permissionKey);

  if (scope.global) {
    return true;
  }

  if (!unitId) {
    return false;
  }

  return scope.unitIds.includes(unitId);
}

export const allowedSubmissionTransitions = {
  draft: ["submitted", "withdrawn", "archived"],
  submitted: ["under_review", "withdrawn", "archived"],
  under_review: ["changes_requested", "approved", "denied", "archived"],
  changes_requested: ["submitted", "withdrawn", "archived"],
  approved: ["archived"],
  denied: ["archived"],
  withdrawn: ["archived"],
  archived: [],
} as const satisfies Record<
  (typeof submissionStatusCatalog)[number]["key"],
  readonly (typeof submissionStatusCatalog)[number]["key"][]
>;

export function canTransitionSubmissionStatus(currentStatus: string, nextStatus: string) {
  if (!isSubmissionStatusKey(currentStatus) || !isSubmissionStatusKey(nextStatus)) {
    return false;
  }

  if (currentStatus === nextStatus) {
    return true;
  }

  return (allowedSubmissionTransitions[currentStatus] as readonly string[]).includes(nextStatus);
}

export function getAnswerDisplayValue(valueJson: unknown, valueText: string | null) {
  if (typeof valueText === "string" && valueText.trim()) {
    return valueText.trim();
  }

  if (Array.isArray(valueJson)) {
    return valueJson.map((entry) => String(entry)).join(", ");
  }

  if (typeof valueJson === "string" || typeof valueJson === "number" || typeof valueJson === "boolean") {
    return String(valueJson);
  }

  if (valueJson && typeof valueJson === "object") {
    return JSON.stringify(valueJson);
  }

  return "No response";
}
