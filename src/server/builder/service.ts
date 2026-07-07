import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/server/database/client";
import { requirePermission } from "@/server/permissions/access";
import { recordAuditEvent } from "@/server/services/audit-log-service";
import {
  automationActionCatalog,
  automationTriggerCatalog,
  dashboardTypeCatalog,
  widgetCatalog,
  workflowTriggerCatalog,
} from "@/server/builder/catalog";

type BuilderMutationInput = {
  description?: string | null;
  id?: string | null;
  key?: string | null;
  name: string;
};

export type UpsertWorkflowTemplateInput = BuilderMutationInput & {
  formType?: string | null;
  notificationHooks?: string[] | null;
  reviewerPermissionKey?: string | null;
  reviewerUnitMode?: string | null;
  statusTransitionMap?: string | null;
  triggerType: string;
};

export type UpsertAutomationRuleInput = BuilderMutationInput & {
  actions?: string[] | null;
  conditions?: string | null;
  isEnabled: boolean;
  triggerType: string;
};

export type UpsertDashboardLayoutInput = BuilderMutationInput & {
  dashboardType: string;
  isEnabled: boolean;
  isUnitScoped: boolean;
  targetPermissionKey?: string | null;
};

export type UpsertDashboardWidgetPlacementInput = {
  config?: string | null;
  dashboardLayoutId: string;
  id?: string | null;
  isVisible: boolean;
  requiredPermissionKey?: string | null;
  sortOrder?: number | null;
  title?: string | null;
  widgetKey: string;
};

function normalizeRequiredString(value: string, label: string) {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  return normalized;
}

function normalizeOptionalString(value?: string | null) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function slugifyBuilderKey(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function parseJsonObject(value?: string | null) {
  const normalized = normalizeOptionalString(value);

  if (!normalized) {
    return undefined;
  }

  try {
    return JSON.parse(normalized) as Prisma.InputJsonValue;
  } catch {
    throw new Error("JSON configuration must be valid.");
  }
}

function stringArrayJson(values?: string[] | null) {
  const normalized = values?.map((value) => value.trim()).filter(Boolean) ?? [];

  return normalized.length > 0 ? normalized : undefined;
}

function revalidateBuilderRoutes() {
  revalidatePath("/", "layout");
  revalidatePath("/administration/builder");
  revalidatePath("/administration/builder/workflows");
  revalidatePath("/administration/builder/dashboards");
  revalidatePath("/administration/builder/widgets");
  revalidatePath("/administration/builder/automations");
  revalidatePath("/administration/forms");
}

function assertInCatalog(value: string, catalog: readonly string[], label: string) {
  if (!catalog.includes(value)) {
    throw new Error(`Select a valid ${label}.`);
  }
}

export async function listWidgetDefinitions() {
  await requirePermission("builder.view");

  return [...widgetCatalog];
}

export async function getBuilderOverview() {
  await requirePermission("builder.view");

  const [forms, workflows, automations, dashboardLayouts] = await Promise.all([
    prisma.formTemplate.count({
      where: {
        deletedAt: null,
      },
    }),
    prisma.workflowTemplate.count({
      where: {
        deletedAt: null,
      },
    }),
    prisma.automationRule.count({
      where: {
        deletedAt: null,
      },
    }),
    prisma.dashboardLayout.count({
      where: {
        deletedAt: null,
      },
    }),
  ]);

  return {
    automations,
    dashboardLayouts,
    forms,
    widgets: widgetCatalog.length,
    workflows,
  };
}

export async function listWorkflowTemplates() {
  await requirePermission("builder.view");

  return prisma.workflowTemplate.findMany({
    where: {
      deletedAt: null,
    },
    include: {
      steps: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
  });
}

export async function upsertWorkflowTemplate(input: UpsertWorkflowTemplateInput) {
  const actor = await requirePermission("builder.workflows.manage");
  const name = normalizeRequiredString(input.name, "Workflow name");
  const key = slugifyBuilderKey(input.key ? normalizeRequiredString(input.key, "Workflow key") : name);
  const triggerType = normalizeRequiredString(input.triggerType, "Workflow trigger");

  assertInCatalog(triggerType, workflowTriggerCatalog, "workflow trigger");

  const existing = input.id
    ? await prisma.workflowTemplate.findUnique({
        where: {
          id: input.id,
        },
      })
    : null;
  const data = {
    description: normalizeOptionalString(input.description),
    formType: normalizeOptionalString(input.formType),
    isEnabled: true,
    key,
    name,
    notificationHooks: stringArrayJson(input.notificationHooks),
    reviewerPermissionKey: normalizeOptionalString(input.reviewerPermissionKey),
    reviewerUnitMode: normalizeOptionalString(input.reviewerUnitMode) ?? "none",
    statusTransitionMap: parseJsonObject(input.statusTransitionMap),
    triggerType,
  };
  const workflow = existing
    ? await prisma.workflowTemplate.update({
        where: {
          id: existing.id,
        },
        data,
      })
    : await prisma.workflowTemplate.create({
        data: {
          ...data,
          steps: {
            create: {
              reviewerPermissionKey: data.reviewerPermissionKey,
              reviewerUnitMode: data.reviewerUnitMode,
              sortOrder: 10,
              stepKey: "initial-review",
              title: "Initial Review",
            },
          },
        },
      });

  await recordAuditEvent({
    action: existing ? "builder.workflow_template.edited" : "builder.workflow_template.created",
    actorUserId: actor.id,
    entityId: workflow.id,
    entityType: "WorkflowTemplate",
    newValue: data,
    oldValue: existing
      ? {
          key: existing.key,
          name: existing.name,
          triggerType: existing.triggerType,
        }
      : undefined,
    summary: `${workflow.name} workflow template ${existing ? "updated" : "created"}.`,
  });

  revalidateBuilderRoutes();

  return workflow;
}

export async function listAutomationRules() {
  await requirePermission("builder.view");

  return prisma.automationRule.findMany({
    where: {
      deletedAt: null,
    },
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
  });
}

export async function upsertAutomationRule(input: UpsertAutomationRuleInput) {
  const actor = await requirePermission("builder.automations.manage");
  const name = normalizeRequiredString(input.name, "Automation rule name");
  const key = slugifyBuilderKey(input.key ? normalizeRequiredString(input.key, "Automation rule key") : name);
  const triggerType = normalizeRequiredString(input.triggerType, "Automation trigger");

  assertInCatalog(triggerType, automationTriggerCatalog, "automation trigger");

  for (const action of input.actions ?? []) {
    assertInCatalog(action, automationActionCatalog, "automation action");
  }

  const existing = input.id
    ? await prisma.automationRule.findUnique({
        where: {
          id: input.id,
        },
      })
    : null;
  const data = {
    actions: stringArrayJson(input.actions),
    conditions: parseJsonObject(input.conditions),
    description: normalizeOptionalString(input.description),
    isEnabled: input.isEnabled,
    key,
    lastRunStatus: existing?.lastRunStatus ?? "not_run",
    name,
    triggerType,
  };
  const rule = existing
    ? await prisma.automationRule.update({
        where: {
          id: existing.id,
        },
        data,
      })
    : await prisma.automationRule.create({
        data,
      });

  await recordAuditEvent({
    action: existing
      ? existing.isEnabled !== rule.isEnabled
        ? "builder.automation_rule.enabled_state_changed"
        : "builder.automation_rule.edited"
      : "builder.automation_rule.created",
    actorUserId: actor.id,
    entityId: rule.id,
    entityType: "AutomationRule",
    newValue: data,
    oldValue: existing
      ? {
          isEnabled: existing.isEnabled,
          key: existing.key,
          name: existing.name,
          triggerType: existing.triggerType,
        }
      : undefined,
    summary: `${rule.name} automation rule ${existing ? "updated" : "created"}.`,
  });

  revalidateBuilderRoutes();

  return rule;
}

export async function listDashboardLayouts() {
  await requirePermission("builder.view");

  return prisma.dashboardLayout.findMany({
    where: {
      deletedAt: null,
    },
    include: {
      widgets: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
  });
}

export async function upsertDashboardLayout(input: UpsertDashboardLayoutInput) {
  const actor = await requirePermission("builder.dashboards.manage");
  const name = normalizeRequiredString(input.name, "Dashboard layout name");
  const key = slugifyBuilderKey(input.key ? normalizeRequiredString(input.key, "Dashboard layout key") : name);
  const dashboardType = normalizeRequiredString(input.dashboardType, "Dashboard type");

  assertInCatalog(dashboardType, dashboardTypeCatalog, "dashboard type");

  const existing = input.id
    ? await prisma.dashboardLayout.findUnique({
        where: {
          id: input.id,
        },
      })
    : null;
  const data = {
    dashboardType,
    description: normalizeOptionalString(input.description),
    isEnabled: input.isEnabled,
    isUnitScoped: input.isUnitScoped,
    key,
    name,
    targetPermissionKey: normalizeOptionalString(input.targetPermissionKey),
  };
  const layout = existing
    ? await prisma.dashboardLayout.update({
        where: {
          id: existing.id,
        },
        data,
      })
    : await prisma.dashboardLayout.create({
        data,
      });

  await recordAuditEvent({
    action: "builder.dashboard_layout.changed",
    actorUserId: actor.id,
    entityId: layout.id,
    entityType: "DashboardLayout",
    newValue: data,
    oldValue: existing
      ? {
          dashboardType: existing.dashboardType,
          key: existing.key,
          name: existing.name,
        }
      : undefined,
    summary: `${layout.name} dashboard layout ${existing ? "updated" : "created"}.`,
  });

  revalidateBuilderRoutes();

  return layout;
}

export async function upsertDashboardWidgetPlacement(input: UpsertDashboardWidgetPlacementInput) {
  const actor = await requirePermission("builder.widgets.manage");
  const widgetKey = normalizeRequiredString(input.widgetKey, "Widget");

  if (!widgetCatalog.some((widget) => widget.key === widgetKey)) {
    throw new Error("Select a valid widget.");
  }

  const layout = await prisma.dashboardLayout.findUnique({
    where: {
      id: input.dashboardLayoutId,
    },
  });

  if (!layout) {
    throw new Error("Dashboard layout not found.");
  }

  const existing = input.id
    ? await prisma.dashboardWidgetPlacement.findUnique({
        where: {
          id: input.id,
        },
      })
    : null;
  const data = {
    config: parseJsonObject(input.config),
    dashboardLayoutId: layout.id,
    isVisible: input.isVisible,
    requiredPermissionKey: normalizeOptionalString(input.requiredPermissionKey),
    sortOrder: input.sortOrder ?? 0,
    title: normalizeOptionalString(input.title),
    widgetKey,
  };
  const placement = existing
    ? await prisma.dashboardWidgetPlacement.update({
        where: {
          id: existing.id,
        },
        data,
      })
    : await prisma.dashboardWidgetPlacement.create({
        data,
      });

  await recordAuditEvent({
    action:
      existing && existing.isVisible !== placement.isVisible
        ? "builder.widget_visibility.changed"
        : "builder.dashboard_layout.changed",
    actorUserId: actor.id,
    entityId: placement.id,
    entityType: "DashboardWidgetPlacement",
    newValue: data,
    oldValue: existing
      ? {
          isVisible: existing.isVisible,
          sortOrder: existing.sortOrder,
          widgetKey: existing.widgetKey,
        }
      : undefined,
    summary: `${widgetKey} widget placement ${existing ? "updated" : "added"} on ${layout.name}.`,
  });

  revalidateBuilderRoutes();

  return placement;
}
