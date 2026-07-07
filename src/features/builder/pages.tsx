import Link from "next/link";

import { DashboardWidget } from "@/components/dashboard/dashboard-widget";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/status/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CreateFormTemplateForm,
  FlashNotice,
  fieldClassName,
  getSearchParamValue,
  labelClassName,
  textareaClassName,
  type SearchParamsRecord,
} from "@/features/applications/components/application-forms";
import { TemplateCard } from "@/features/applications/pages";
import {
  automationActionCatalog,
  automationTriggerCatalog,
  dashboardTypeCatalog,
  widgetCatalog,
  workflowTriggerCatalog,
} from "@/server/builder/catalog";
import {
  upsertAutomationRuleAction,
  upsertDashboardLayoutAction,
  upsertDashboardWidgetPlacementAction,
  upsertWorkflowTemplateAction,
} from "@/server/builder/actions";
import {
  getBuilderOverview,
  listAutomationRules,
  listDashboardLayouts,
  listWidgetDefinitions,
  listWorkflowTemplates,
} from "@/server/builder/service";
import { getApplicationsReferenceData, listAdministrationFormTemplates } from "@/server/applications/queries";
import { requirePermission } from "@/server/permissions/access";

function titleCase(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function BuilderFlash({ searchParams }: { searchParams: SearchParamsRecord }) {
  const message = getSearchParamValue(searchParams, "message");
  const error = getSearchParamValue(searchParams, "error");

  return (
    <>
      {message ? <FlashNotice message={message} tone="success" /> : null}
      {error ? <FlashNotice message={error} tone="danger" /> : null}
    </>
  );
}

function BuilderSectionCard({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
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

function BuilderTextField({
  defaultValue,
  label,
  name,
  placeholder,
  required,
}: {
  defaultValue?: string | null;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="space-y-2">
      <span className={labelClassName}>{label}</span>
      <input
        className={fieldClassName}
        defaultValue={defaultValue ?? ""}
        name={name}
        placeholder={placeholder}
        required={required}
      />
    </label>
  );
}

function BuilderTextarea({
  defaultValue,
  label,
  name,
  placeholder,
}: {
  defaultValue?: string | null;
  label: string;
  name: string;
  placeholder?: string;
}) {
  return (
    <label className="space-y-2">
      <span className={labelClassName}>{label}</span>
      <textarea
        className={textareaClassName}
        defaultValue={defaultValue ?? ""}
        name={name}
        placeholder={placeholder}
      />
    </label>
  );
}

function BuilderNavCards() {
  const cards = [
    ["Forms", "/administration/builder/forms", "Template fields, ordering, preview, duplicate, archive"],
    ["Workflows", "/administration/builder/workflows", "Approval template structure and notification hooks"],
    ["Dashboards", "/administration/builder/dashboards", "Dashboard layouts, widget order, and targeting"],
    ["Widgets", "/administration/builder/widgets", "Admin-visible catalog of reusable dashboard widgets"],
    ["Automations", "/administration/builder/automations", "Safe trigger/action placeholders with no execution"],
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {cards.map(([title, href, description]) => (
        <Card key={href} className="border-border/70 bg-background/45">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href={href}>Open {title}</Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export async function BuilderOverviewPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  await requirePermission("builder.view");
  const resolvedSearchParams = (await searchParams) ?? {};
  const overview = await getBuilderOverview();

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={["Administration", "Builder"]}
        description="Configure form, workflow, dashboard, widget, and automation foundations without changing code."
        title="Platform Builder"
      />
      <BuilderFlash searchParams={resolvedSearchParams} />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <DashboardWidget description="Existing configurable application templates." title="Forms" tone="info" value={String(overview.forms)} />
        <KpiCard hint="Simple workflow template records." label="Workflows" tone="warning" value={String(overview.workflows)} />
        <KpiCard hint="Dashboard layout records." label="Layouts" tone="success" value={String(overview.dashboardLayouts)} />
        <KpiCard hint="Static widget definitions available to admins." label="Widgets" tone="info" value={String(overview.widgets)} />
        <KpiCard hint="Safe non-executing automation records." label="Automations" tone="muted" value={String(overview.automations)} />
      </section>
      <BuilderNavCards />
    </div>
  );
}

export async function BuilderFormsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  await requirePermission("builder.forms.manage");
  const resolvedSearchParams = (await searchParams) ?? {};
  const [templates, referenceData] = await Promise.all([
    listAdministrationFormTemplates(),
    getApplicationsReferenceData(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={["Administration", "Builder", "Forms"]}
        description="Polished form builder surface for template creation, preview, duplicate, archive, and field editing."
        title="Builder Forms"
      />
      <BuilderFlash searchParams={resolvedSearchParams} />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardWidget description="Enabled templates members can submit." title="Enabled" tone="success" value={String(templates.summary.active)} />
        <KpiCard hint="Templates held for editing." label="Disabled" tone="warning" value={String(templates.summary.disabled)} />
        <KpiCard hint="Retired templates preserved for history." label="Archived" tone="muted" value={String(templates.summary.archived)} />
        <KpiCard hint="Total visible templates." label="Templates" tone="info" value={String(templates.summary.total)} />
      </section>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <BuilderSectionCard
          description="Open any template to edit fields, ordering, help text, required toggles, preview, duplicate, and archive actions."
          title="Form templates"
        >
          {templates.templates.length > 0 ? (
            templates.templates.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))
          ) : (
            <EmptyState description="No form templates exist yet." title="No templates" />
          )}
        </BuilderSectionCard>
        <CreateFormTemplateForm referenceData={referenceData} returnTo="/administration/builder/forms" />
      </div>
    </div>
  );
}

export async function BuilderWorkflowsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  await requirePermission("builder.view");
  const resolvedSearchParams = (await searchParams) ?? {};
  const [workflows, referenceData] = await Promise.all([
    listWorkflowTemplates(),
    getApplicationsReferenceData(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={["Administration", "Builder", "Workflows"]}
        description="Structured workflow templates for approval lanes, reviewer permissions, status maps, and notification hooks."
        title="Workflow Templates"
      />
      <BuilderFlash searchParams={resolvedSearchParams} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <BuilderSectionCard
          description="These records do not replace form approval steps yet; they define reusable future workflow patterns."
          title="Workflow catalog"
        >
          {workflows.length > 0 ? (
            workflows.map((workflow) => (
              <div key={workflow.id} className="rounded-xl border border-border/70 bg-background/45 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{workflow.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{workflow.description ?? "No description"}</p>
                  </div>
                  <StatusBadge label={workflow.isEnabled ? "Enabled" : "Disabled"} tone={workflow.isEnabled ? "success" : "muted"} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusBadge label={titleCase(workflow.triggerType)} tone="info" />
                  {workflow.formType ? <StatusBadge label={titleCase(workflow.formType)} tone="warning" /> : null}
                  <StatusBadge label={`${workflow.steps.length} step${workflow.steps.length === 1 ? "" : "s"}`} tone="muted" />
                </div>
              </div>
            ))
          ) : (
            <EmptyState description="Create a workflow template to describe reusable review routing." title="No workflows yet" />
          )}
        </BuilderSectionCard>
        <BuilderSectionCard
          description="Start with card-based configuration. A visual workflow designer can use these records later."
          title="Create workflow"
        >
          <form action={upsertWorkflowTemplateAction} className="space-y-4">
            <input name="returnTo" type="hidden" value="/administration/builder/workflows" />
            <BuilderTextField label="Name" name="name" placeholder="Recruit Application Review" required />
            <BuilderTextField label="Key" name="key" placeholder="Optional stable key" />
            <BuilderTextarea label="Description" name="description" placeholder="Describe who reviews this workflow and why." />
            <label className="space-y-2">
              <span className={labelClassName}>Trigger type</span>
              <select className={fieldClassName} name="triggerType" required>
                <option value="">Select trigger</option>
                {workflowTriggerCatalog.map((trigger) => (
                  <option key={trigger} value={trigger}>{titleCase(trigger)}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className={labelClassName}>Form type association</span>
              <select className={fieldClassName} name="formType">
                <option value="">No form type</option>
                {referenceData.templateTypes.map((type) => (
                  <option key={type.key} value={type.key}>{type.label}</option>
                ))}
              </select>
            </label>
            <BuilderTextField label="Reviewer permission" name="reviewerPermissionKey" placeholder="forms.review" />
            <label className="space-y-2">
              <span className={labelClassName}>Reviewer unit scope</span>
              <select className={fieldClassName} defaultValue="none" name="reviewerUnitMode">
                <option value="none">None</option>
                <option value="target_unit">Target unit</option>
                <option value="submitter_unit">Submitter unit placeholder</option>
              </select>
            </label>
            <BuilderTextarea label="Status transition JSON" name="statusTransitionMap" placeholder={'{"submitted":"under_review","approved":"approved"}'} />
            <div className="grid gap-3">
              {["form.submitted", "form.approved", "form.denied"].map((hook) => (
                <label key={hook} className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/45 px-4 py-3 text-sm">
                  <input name="notificationHook" type="checkbox" value={hook} />
                  {hook}
                </label>
              ))}
            </div>
            <Button type="submit">Save workflow</Button>
          </form>
        </BuilderSectionCard>
      </div>
    </div>
  );
}

export async function BuilderAutomationsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  await requirePermission("builder.view");
  const resolvedSearchParams = (await searchParams) ?? {};
  const rules = await listAutomationRules();

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={["Administration", "Builder", "Automations"]}
        description="Safe automation rule foundation. Rules are configurable and auditable, but execution remains placeholder-only."
        title="Automation Rules"
      />
      <BuilderFlash searchParams={resolvedSearchParams} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <BuilderSectionCard description="Automation rules are observable configuration records and do not run unsafe actions yet." title="Rule catalog">
          {rules.length > 0 ? (
            rules.map((rule) => (
              <div key={rule.id} className="rounded-xl border border-border/70 bg-background/45 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{rule.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{rule.description ?? "No description"}</p>
                  </div>
                  <StatusBadge label={rule.isEnabled ? "Enabled" : "Disabled"} tone={rule.isEnabled ? "warning" : "muted"} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusBadge label={titleCase(rule.triggerType)} tone="info" />
                  <StatusBadge label={rule.lastRunStatus ?? "Not run"} tone="muted" />
                </div>
              </div>
            ))
          ) : (
            <EmptyState description="Create a rule to reserve future automation behavior." title="No automation rules" />
          )}
        </BuilderSectionCard>
        <BuilderSectionCard description="Conditions and actions are stored as configuration placeholders until the automation runner is introduced." title="Create rule">
          <form action={upsertAutomationRuleAction} className="space-y-4">
            <input name="returnTo" type="hidden" value="/administration/builder/automations" />
            <BuilderTextField label="Name" name="name" placeholder="Notify staff when form submitted" required />
            <BuilderTextField label="Key" name="key" placeholder="Optional stable key" />
            <BuilderTextarea label="Description" name="description" />
            <label className="space-y-2">
              <span className={labelClassName}>Trigger</span>
              <select className={fieldClassName} name="triggerType" required>
                <option value="">Select trigger</option>
                {automationTriggerCatalog.map((trigger) => (
                  <option key={trigger} value={trigger}>{titleCase(trigger)}</option>
                ))}
              </select>
            </label>
            <BuilderTextarea label="Conditions JSON" name="conditions" placeholder='{"formType":"loa_request"}' />
            <div className="grid gap-3">
              {automationActionCatalog.map((action) => (
                <label key={action} className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/45 px-4 py-3 text-sm">
                  <input name="action" type="checkbox" value={action} />
                  {titleCase(action)}
                </label>
              ))}
            </div>
            <label className="flex items-center gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
              <input name="isEnabled" type="checkbox" />
              Enabled placeholder
            </label>
            <Button type="submit">Save automation rule</Button>
          </form>
        </BuilderSectionCard>
      </div>
    </div>
  );
}

export async function BuilderDashboardsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  await requirePermission("builder.view");
  const resolvedSearchParams = (await searchParams) ?? {};
  const layouts = await listDashboardLayouts();

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={["Administration", "Builder", "Dashboards"]}
        description="Configurable dashboard layout foundation with widget order, visibility, permission targeting, and unit-scope placeholders."
        title="Dashboard Layouts"
      />
      <BuilderFlash searchParams={resolvedSearchParams} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <BuilderSectionCard description="Layouts store widget lists and targeting metadata; the live dashboard can consume this foundation later." title="Layouts">
          {layouts.length > 0 ? (
            layouts.map((layout) => (
              <div key={layout.id} className="rounded-xl border border-border/70 bg-background/45 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{layout.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{layout.description ?? "No description"}</p>
                  </div>
                  <StatusBadge label={layout.isEnabled ? "Enabled" : "Disabled"} tone={layout.isEnabled ? "success" : "muted"} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusBadge label={titleCase(layout.dashboardType)} tone="info" />
                  {layout.isUnitScoped ? <StatusBadge label="Unit scoped" tone="warning" /> : null}
                  <StatusBadge label={`${layout.widgets.length} widget${layout.widgets.length === 1 ? "" : "s"}`} tone="muted" />
                </div>
                <div className="mt-4 space-y-3">
                  {layout.widgets.map((widget) => (
                    <div key={widget.id} className="rounded-lg border border-border/70 bg-card/70 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-foreground">{widget.title ?? titleCase(widget.widgetKey)}</p>
                        <StatusBadge label={widget.isVisible ? "Visible" : "Hidden"} tone={widget.isVisible ? "success" : "muted"} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">Order {widget.sortOrder} / {widget.requiredPermissionKey ?? "No permission target"}</p>
                    </div>
                  ))}
                  <form action={upsertDashboardWidgetPlacementAction} className="space-y-3 rounded-xl border border-border/70 bg-card/60 p-3">
                    <input name="dashboardLayoutId" type="hidden" value={layout.id} />
                    <input name="returnTo" type="hidden" value="/administration/builder/dashboards" />
                    <label className="space-y-2">
                      <span className={labelClassName}>Add widget</span>
                      <select className={fieldClassName} name="widgetKey" required>
                        <option value="">Select widget</option>
                        {widgetCatalog.map((widget) => (
                          <option key={widget.key} value={widget.key}>{widget.label}</option>
                        ))}
                      </select>
                    </label>
                    <div className="grid gap-3 md:grid-cols-2">
                      <BuilderTextField label="Title override" name="title" />
                      <BuilderTextField label="Required permission" name="requiredPermissionKey" />
                      <BuilderTextField label="Sort order" name="sortOrder" />
                    </div>
                    <BuilderTextarea label="Widget config JSON" name="config" placeholder='{"size":"wide"}' />
                    <Button size="sm" type="submit">Add widget</Button>
                  </form>
                </div>
              </div>
            ))
          ) : (
            <EmptyState description="Create the first dashboard layout to configure future widget composition." title="No dashboard layouts" />
          )}
        </BuilderSectionCard>
        <BuilderSectionCard description="Use ordered widget lists for now. Drag-and-drop can be added later on top of the same records." title="Create layout">
          <form action={upsertDashboardLayoutAction} className="space-y-4">
            <input name="returnTo" type="hidden" value="/administration/builder/dashboards" />
            <BuilderTextField label="Name" name="name" placeholder="Unit Leadership Dashboard" required />
            <BuilderTextField label="Key" name="key" placeholder="Optional stable key" />
            <BuilderTextarea label="Description" name="description" />
            <label className="space-y-2">
              <span className={labelClassName}>Dashboard type</span>
              <select className={fieldClassName} name="dashboardType" required>
                <option value="">Select dashboard type</option>
                {dashboardTypeCatalog.map((type) => (
                  <option key={type} value={type}>{titleCase(type)}</option>
                ))}
              </select>
            </label>
            <BuilderTextField label="Target permission" name="targetPermissionKey" placeholder="units.dashboard.view" />
            <label className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/45 px-4 py-3 text-sm">
              <input name="isUnitScoped" type="checkbox" />
              Unit-scoped dashboard placeholder
            </label>
            <Button type="submit">Save layout</Button>
          </form>
        </BuilderSectionCard>
      </div>
    </div>
  );
}

export async function BuilderWidgetsPage() {
  await requirePermission("builder.view");
  const widgets = await listWidgetDefinitions();

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={["Administration", "Builder", "Widgets"]}
        description="Admin-visible dashboard widget catalog reserved for configurable dashboard layouts."
        title="Widget Catalog"
      />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardWidget description="Reusable widget definitions." title="Widgets" tone="info" value={String(widgets.length)} />
        <KpiCard hint="Readiness and command analytics widgets." label="Analytics" tone="success" value={String(widgets.filter((widget) => ["Training", "Attendance", "Units"].includes(widget.category)).length)} />
        <KpiCard hint="Operations and deployment widgets." label="Operations" tone="warning" value={String(widgets.filter((widget) => ["Operations", "Campaigns"].includes(widget.category)).length)} />
        <KpiCard hint="Admin/system widgets." label="Admin" tone="muted" value={String(widgets.filter((widget) => ["Discord", "Audit", "Notifications"].includes(widget.category)).length)} />
      </section>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {widgets.map((widget) => (
          <Card key={widget.key} className="border-border/70 bg-card/88">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{widget.label}</CardTitle>
                  <CardDescription>{widget.description}</CardDescription>
                </div>
                <StatusBadge label={widget.category} tone="info" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">{widget.key}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
