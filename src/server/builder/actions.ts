"use server";

import { redirect } from "next/navigation";

import {
  upsertAutomationRule,
  upsertDashboardLayout,
  upsertDashboardWidgetPlacement,
  upsertWorkflowTemplate,
} from "@/server/builder/service";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function getOptionalString(formData: FormData, key: string) {
  const value = getString(formData, key).trim();

  return value ? value : null;
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

function getStrings(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);
}

function withFlash(returnTo: string, key: "message" | "error", value: string) {
  const [pathname, existingQuery] = returnTo.split("?");
  const params = new URLSearchParams(existingQuery ?? "");
  params.set(key, value);

  return `${pathname}?${params.toString()}`;
}

async function runBuilderAction(
  formData: FormData,
  operation: () => Promise<void>,
  successMessage: string,
) {
  const returnTo = getString(formData, "returnTo") || "/administration/builder";

  try {
    await operation();
    redirect(withFlash(returnTo, "message", successMessage));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to complete builder action.";
    redirect(withFlash(returnTo, "error", message));
  }
}

export async function upsertWorkflowTemplateAction(formData: FormData) {
  await runBuilderAction(
    formData,
    async () => {
      await upsertWorkflowTemplate({
        description: getOptionalString(formData, "description"),
        formType: getOptionalString(formData, "formType"),
        id: getOptionalString(formData, "id"),
        key: getOptionalString(formData, "key"),
        name: getString(formData, "name"),
        notificationHooks: getStrings(formData, "notificationHook"),
        reviewerPermissionKey: getOptionalString(formData, "reviewerPermissionKey"),
        reviewerUnitMode: getOptionalString(formData, "reviewerUnitMode"),
        statusTransitionMap: getOptionalString(formData, "statusTransitionMap"),
        triggerType: getString(formData, "triggerType"),
      });
    },
    "Workflow template saved.",
  );
}

export async function upsertAutomationRuleAction(formData: FormData) {
  await runBuilderAction(
    formData,
    async () => {
      await upsertAutomationRule({
        actions: getStrings(formData, "action"),
        conditions: getOptionalString(formData, "conditions"),
        description: getOptionalString(formData, "description"),
        id: getOptionalString(formData, "id"),
        isEnabled: getBoolean(formData, "isEnabled"),
        key: getOptionalString(formData, "key"),
        name: getString(formData, "name"),
        triggerType: getString(formData, "triggerType"),
      });
    },
    "Automation rule saved.",
  );
}

export async function upsertDashboardLayoutAction(formData: FormData) {
  await runBuilderAction(
    formData,
    async () => {
      await upsertDashboardLayout({
        dashboardType: getString(formData, "dashboardType"),
        description: getOptionalString(formData, "description"),
        id: getOptionalString(formData, "id"),
        isEnabled: !getBoolean(formData, "disabled"),
        isUnitScoped: getBoolean(formData, "isUnitScoped"),
        key: getOptionalString(formData, "key"),
        name: getString(formData, "name"),
        targetPermissionKey: getOptionalString(formData, "targetPermissionKey"),
      });
    },
    "Dashboard layout saved.",
  );
}

export async function upsertDashboardWidgetPlacementAction(formData: FormData) {
  await runBuilderAction(
    formData,
    async () => {
      await upsertDashboardWidgetPlacement({
        config: getOptionalString(formData, "config"),
        dashboardLayoutId: getString(formData, "dashboardLayoutId"),
        id: getOptionalString(formData, "id"),
        isVisible: !getBoolean(formData, "hidden"),
        requiredPermissionKey: getOptionalString(formData, "requiredPermissionKey"),
        sortOrder: getOptionalNumber(formData, "sortOrder"),
        title: getOptionalString(formData, "title"),
        widgetKey: getString(formData, "widgetKey"),
      });
    },
    "Dashboard widget saved.",
  );
}
