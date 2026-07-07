import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DashboardWidget } from "@/components/dashboard/dashboard-widget";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/status/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/formatters";
import { getCurrentUser } from "@/server/auth/current-user";
import {
  getApplicationsReferenceData,
  getFormSubmissionDetail,
  getFormTemplateDetail,
  listAdministrationFormTemplates,
  listAvailableFormTemplates,
  listOwnFormSubmissions,
  listSubmissionReviewQueue,
} from "@/server/applications/queries";
import type {
  FormSubmissionsFilter,
  FormTemplatesFilter,
} from "@/server/applications/types";
import { isFormTemplateType, isSubmissionStatusKey } from "@/server/applications/utils";
import { can } from "@/server/permissions/access";
import { ApplicationInspectorDrawer } from "@/features/applications/components/application-inspector-drawer";
import {
  ApplicationCommentTimeline,
  ApplicationDecisionTimeline,
  ApplicationStatusPill,
  ApprovalStepEditorForm,
  FlashNotice,
  FormFieldEditorForm,
  FormPreviewFields,
  FormSubmissionComposer,
  FormTemplateStateForms,
  CreateFormTemplateForm,
  EditFormTemplateForm,
  SubmissionActivitySummary,
  SubmissionCommentForm,
  SubmissionReviewActions,
  SubmissionReviewerForm,
  SubmissionWithdrawForm,
  WorkflowPreview,
  buildHref,
  fieldClassName,
  getApplicationStatusTone,
  getSearchParamValue,
  type SearchParamsRecord,
} from "@/features/applications/components/application-forms";

async function requireApplicationRoutePermission(permissionKey: string) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/unauthorized");
  }

  if (can(user, "forms.admin") || can(user, permissionKey)) {
    return user;
  }

  redirect("/forbidden");
}

function ApplicationsFiltersCard({
  filters,
}: {
  filters: {
    formType?: string;
    q?: string;
    status?: string;
  };
}) {
  return (
    <Card className="border-border/80 bg-card/82">
      <CardHeader>
        <CardTitle>My submissions</CardTitle>
        <CardDescription>
          Search your drafts, active reviews, and final decisions without losing the wider applications context.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action="/applications" className="grid gap-4 md:grid-cols-[minmax(0,1fr)_14rem_14rem_auto]" method="get">
          <input className={fieldClassName} defaultValue={filters.q ?? ""} name="q" placeholder="Search by title or description" />
          <select className={fieldClassName} defaultValue={filters.formType ?? ""} name="formType">
            <option value="">All form types</option>
            <option value="recruit_application">Recruit application</option>
            <option value="unit_transfer_request">Transfer request</option>
            <option value="loa_request">LOA request</option>
            <option value="staff_application">Staff application</option>
            <option value="instructor_application">Instructor application</option>
            <option value="rasp_application">RASP placeholder</option>
          </select>
          <select className={fieldClassName} defaultValue={filters.status ?? ""} name="status">
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="changes_requested">Changes Requested</option>
            <option value="approved">Approved</option>
            <option value="denied">Denied</option>
            <option value="withdrawn">Withdrawn</option>
            <option value="archived">Archived</option>
          </select>
          <Button type="submit" variant="outline">
            Apply
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function AvailableFormCard({
  href,
  template,
}: {
  href: string;
  template: Awaited<ReturnType<typeof listAvailableFormTemplates>>["templates"][number];
}) {
  return (
    <Card className="border-border/70 bg-background/45">
      <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground">{template.title}</p>
            <StatusBadge label={template.formTypeLabel} tone="info" />
            {template.targetUnit ? <StatusBadge label={template.targetUnit.label} tone="muted" /> : null}
            {template.isArchived ? <StatusBadge label="Archived" tone="warning" /> : null}
          </div>
          <p className="text-sm text-muted-foreground">
            {template.description ?? "No description has been added yet."}
          </p>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            {template.fieldCount} fields / {template.approvalStepCount} review steps
          </p>
        </div>
        <Button asChild>
          <Link href={href}>Open form</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function SubmissionCard({
  href,
  submission,
}: {
  href: string;
  submission: Awaited<ReturnType<typeof listOwnFormSubmissions>>["submissions"][number];
}) {
  return (
    <Card className="border-border/70 bg-background/45">
      <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground">{submission.titleSnapshot}</p>
            <ApplicationStatusPill label={submission.status.label} statusKey={submission.status.key} />
            <StatusBadge label={submission.formTypeLabel} tone="info" />
            {submission.targetUnit ? <StatusBadge label={submission.targetUnit.label} tone="muted" /> : null}
          </div>
          <p className="text-sm text-muted-foreground">
            {submission.descriptionSnapshot ?? "No template description snapshot was stored."}
          </p>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Created {formatDateTime(submission.createdAt)}
            {submission.reviewer ? ` / Reviewer ${submission.reviewer.label}` : " / Reviewer unassigned"}
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href={href}>Inspect</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function SubmissionInspectorPanels({
  submission,
}: {
  submission: NonNullable<Awaited<ReturnType<typeof getFormSubmissionDetail>>>;
}) {
  return [
    {
      label: "Overview",
      content: <SubmissionActivitySummary submission={submission} />,
    },
    {
      label: "Answers",
      content: (
        <div className="space-y-3">
          {submission.answers.map((answer) => (
            <Card key={answer.id} className="border-border/70 bg-background/45">
              <CardContent className="space-y-2 p-4">
                <p className="font-semibold text-foreground">{answer.fieldLabelSnapshot}</p>
                <p className="text-sm leading-7 text-muted-foreground">{answer.valueDisplay}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ),
    },
    {
      label: "Comments",
      content:
        submission.comments.length > 0 ? (
          <ApplicationCommentTimeline comments={submission.comments} />
        ) : (
          <EmptyState
            description="Comments will appear here as submitters and reviewers coordinate the request."
            title="No comments yet"
          />
        ),
    },
    {
      label: "Decisions",
      content:
        submission.decisions.length > 0 ? (
          <ApplicationDecisionTimeline submission={submission} />
        ) : (
          <EmptyState
            description="Approval history will appear here once reviewers act on the submission."
            title="No decisions yet"
          />
        ),
    },
  ];
}

function MemberSubmissionDrawerContent({
  canComment,
  closeHref,
  submission,
}: {
  canComment: boolean;
  closeHref: string;
  submission: NonNullable<Awaited<ReturnType<typeof getFormSubmissionDetail>>>;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href={`/applications/${submission.template.id}`}>Open template</Link>
        </Button>
      </div>
      {canComment ? (
        <SubmissionCommentForm
          allowInternal={false}
          returnTo={closeHref}
          submissionId={submission.id}
        />
      ) : null}
      {["draft", "submitted", "changes_requested"].includes(submission.status.key) ? (
        <SubmissionWithdrawForm returnTo={closeHref} submissionId={submission.id} />
      ) : null}
    </div>
  );
}

function TemplateFiltersCard({
  filters,
  referenceData,
}: {
  filters: {
    formType?: string;
    q?: string;
    state?: string;
    unitId?: string;
  };
  referenceData: Awaited<ReturnType<typeof getApplicationsReferenceData>>;
}) {
  return (
    <Card className="border-border/80 bg-card/82">
      <CardHeader>
        <CardTitle>Template filters</CardTitle>
        <CardDescription>
          Review configurable applications by purpose, target unit, or lifecycle state before adjusting the builder.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action="/administration/forms" className="grid gap-4 md:grid-cols-2 xl:grid-cols-5" method="get">
          <input className={fieldClassName} defaultValue={filters.q ?? ""} name="q" placeholder="Search title or key" />
          <select className={fieldClassName} defaultValue={filters.formType ?? ""} name="formType">
            <option value="">All form types</option>
            {referenceData.templateTypes.map((type) => (
              <option key={type.key} value={type.key}>
                {type.label}
              </option>
            ))}
          </select>
          <SelectUnitField defaultValue={filters.unitId} name="unitId" referenceData={referenceData} />
          <select className={fieldClassName} defaultValue={filters.state ?? ""} name="state">
            <option value="">All states</option>
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
            <option value="archived">Archived</option>
          </select>
          <Button type="submit" variant="outline">
            Apply
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function SelectUnitField({
  defaultValue,
  name,
  referenceData,
}: {
  defaultValue?: string;
  name: string;
  referenceData: Awaited<ReturnType<typeof getApplicationsReferenceData>>;
}) {
  return (
    <select className={fieldClassName} defaultValue={defaultValue ?? ""} name={name}>
      <option value="">All units</option>
      {referenceData.units.map((unit) => (
        <option key={unit.id} value={unit.id}>
          {unit.label}
        </option>
      ))}
    </select>
  );
}

export function TemplateCard({
  template,
}: {
  template: Awaited<ReturnType<typeof listAdministrationFormTemplates>>["templates"][number];
}) {
  return (
    <Card className="border-border/70 bg-background/45">
      <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground">{template.title}</p>
            <StatusBadge label={template.formTypeLabel} tone="info" />
            <StatusBadge label={template.isEnabled ? "Enabled" : "Disabled"} tone={template.isEnabled ? "success" : "warning"} />
            {template.isArchived ? <StatusBadge label="Archived" tone="muted" /> : null}
          </div>
          <p className="text-sm text-muted-foreground">
            {template.description ?? "No template description has been added yet."}
          </p>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            {template.fieldCount} fields / {template.approvalStepCount} steps / {template.submissionCount} submissions
          </p>
        </div>
        <Button asChild size="sm">
          <Link href={`/administration/forms/${template.id}`}>Open builder</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function ReviewQueueFiltersCard({
  filters,
  referenceData,
}: {
  filters: {
    formType?: string;
    q?: string;
    reviewerId?: string;
    status?: string;
    unitId?: string;
  };
  referenceData: Awaited<ReturnType<typeof getApplicationsReferenceData>>;
}) {
  return (
    <Card className="border-border/80 bg-card/82">
      <CardHeader>
        <CardTitle>Review queue filters</CardTitle>
        <CardDescription>
          Keep submissions searchable by queue state, target unit, reviewer, and use case before opening the inspector.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action="/administration/submissions" className="grid gap-4 md:grid-cols-2 xl:grid-cols-5" method="get">
          <input className={fieldClassName} defaultValue={filters.q ?? ""} name="q" placeholder="Search title, submitter, or reviewer" />
          <select className={fieldClassName} defaultValue={filters.formType ?? ""} name="formType">
            <option value="">All form types</option>
            {referenceData.templateTypes.map((type) => (
              <option key={type.key} value={type.key}>
                {type.label}
              </option>
            ))}
          </select>
          <SelectUnitField defaultValue={filters.unitId} name="unitId" referenceData={referenceData} />
          <select className={fieldClassName} defaultValue={filters.reviewerId ?? ""} name="reviewerId">
            <option value="">All reviewers</option>
            {referenceData.reviewers.map((reviewer) => (
              <option key={reviewer.id} value={reviewer.id}>
                {reviewer.label}
              </option>
            ))}
          </select>
          <select className={fieldClassName} defaultValue={filters.status ?? ""} name="status">
            <option value="">All statuses</option>
            {referenceData.statuses.map((status) => (
              <option key={status.key} value={status.key}>
                {status.label}
              </option>
            ))}
          </select>
          <Button type="submit" variant="outline">
            Apply
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ReviewQueueCard({
  href,
  submission,
}: {
  href: string;
  submission: Awaited<ReturnType<typeof listSubmissionReviewQueue>>["submissions"][number];
}) {
  return (
    <Card className="border-border/70 bg-background/45">
      <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground">{submission.titleSnapshot}</p>
            <ApplicationStatusPill label={submission.status.label} statusKey={submission.status.key} />
            <StatusBadge label={submission.formTypeLabel} tone="info" />
            {submission.targetUnit ? <StatusBadge label={submission.targetUnit.label} tone="muted" /> : null}
          </div>
          <p className="text-sm text-muted-foreground">
            Submitter {submission.submittedBy?.label ?? "Unknown"} / Reviewer {submission.reviewer?.label ?? "Unassigned"}
          </p>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Updated {formatDateTime(submission.updatedAt)}
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href={href}>Inspect</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function ReviewQueueDrawerContent({
  canApprove,
  canArchive,
  canAssignReviewer,
  canComment,
  canDeny,
  canReview,
  closeHref,
  referenceData,
  submission,
}: {
  canApprove: boolean;
  canArchive: boolean;
  canAssignReviewer: boolean;
  canComment: boolean;
  canDeny: boolean;
  canReview: boolean;
  closeHref: string;
  referenceData: Awaited<ReturnType<typeof getApplicationsReferenceData>>;
  submission: NonNullable<Awaited<ReturnType<typeof getFormSubmissionDetail>>>;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href={`/applications/${submission.template.id}`}>Open member form</Link>
        </Button>
      </div>
      {canAssignReviewer ? (
        <SubmissionReviewerForm
          referenceData={referenceData}
          returnTo={closeHref}
          selectedReviewerId={submission.reviewer?.id ?? null}
          submissionId={submission.id}
        />
      ) : null}
      {canComment ? (
        <SubmissionCommentForm
          allowInternal
          returnTo={closeHref}
          submissionId={submission.id}
        />
      ) : null}
      <SubmissionReviewActions
        canApprove={canApprove}
        canArchive={canArchive}
        canDeny={canDeny}
        canReview={canReview}
        returnTo={closeHref}
        submissionId={submission.id}
      />
    </div>
  );
}

export async function ApplicationsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const formTypeParam = getSearchParamValue(resolvedSearchParams, "formType");
  const statusParam = getSearchParamValue(resolvedSearchParams, "status");
  const filters: FormSubmissionsFilter = {
    formType: formTypeParam && isFormTemplateType(formTypeParam) ? formTypeParam : "",
    q: getSearchParamValue(resolvedSearchParams, "q"),
    status: statusParam && isSubmissionStatusKey(statusParam) ? statusParam : "",
  };
  const selectedSubmissionId = getSearchParamValue(resolvedSearchParams, "submission");
  const message = getSearchParamValue(resolvedSearchParams, "message");
  const error = getSearchParamValue(resolvedSearchParams, "error");
  const [templatesData, ownSubmissionsData, selectedSubmission, currentUser] = await Promise.all([
    listAvailableFormTemplates(),
    listOwnFormSubmissions(filters),
    selectedSubmissionId ? getFormSubmissionDetail(selectedSubmissionId) : Promise.resolve(null),
    getCurrentUser(),
  ]);
  const drawerHref = buildHref("/applications", resolvedSearchParams, {
    error: undefined,
    message: undefined,
    submission: selectedSubmissionId,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={["Applications"]}
        description="Submit member-facing requests, track their current review state, and continue the conversation without leaving the portal."
        title="Applications"
      />
      {message ? <FlashNotice message={message} tone="success" /> : null}
      {error ? <FlashNotice message={error} tone="danger" /> : null}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardWidget description="Enabled application templates members can open right now." title="Open Forms" tone="info" value={String(templatesData.summary.active)} />
        <KpiCard hint="Your total saved drafts and submitted requests." label="My Submissions" tone="muted" value={String(ownSubmissionsData.summary.total)} />
        <KpiCard hint="Requests currently moving through review." label="Under Review" tone="warning" value={String(ownSubmissionsData.summary.underReview)} />
        <KpiCard hint="Requests that have already reached an approved end state." label="Approved" tone="success" value={String(ownSubmissionsData.summary.approved)} />
      </section>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="space-y-6">
          <Card className="border-border/80 bg-card/88">
            <CardHeader>
              <CardTitle>Available forms</CardTitle>
              <CardDescription>
                Launch a request from the portal and let the workflow engine keep the review state, comments, and audit history together.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {templatesData.templates.length > 0 ? (
                templatesData.templates.map((template) => (
                  <AvailableFormCard
                    key={template.id}
                    href={`/applications/${template.id}`}
                    template={template}
                  />
                ))
              ) : (
                <EmptyState
                  description="No enabled form templates are visible to this account yet."
                  title="No forms available"
                />
              )}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <ApplicationsFiltersCard filters={filters} />
          <Card className="border-border/80 bg-card/88">
            <CardHeader>
              <CardTitle>My submission tracker</CardTitle>
              <CardDescription>
                Keep your current requests, change requests, and outcomes in one searchable operational timeline.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {ownSubmissionsData.submissions.length > 0 ? (
                ownSubmissionsData.submissions.map((submission) => (
                  <SubmissionCard
                    key={submission.id}
                    href={buildHref("/applications", resolvedSearchParams, { submission: submission.id })}
                    submission={submission}
                  />
                ))
              ) : (
                <EmptyState
                  description="Start an application from the available forms list to create your first tracked request."
                  title="No submissions yet"
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      {selectedSubmission ? (
        <ApplicationInspectorDrawer
          closeHref={buildHref("/applications", resolvedSearchParams, {
            error: undefined,
            message: undefined,
            submission: undefined,
          })}
          open
          statusBadge={{
            label: selectedSubmission.status.label,
            tone: getApplicationStatusTone(selectedSubmission.status.key),
          }}
          subtitle={selectedSubmission.descriptionSnapshot ?? "Submission detail, comment thread, and workflow state."}
          tabPanels={SubmissionInspectorPanels({ submission: selectedSubmission })}
          title={selectedSubmission.titleSnapshot}
        >
          <MemberSubmissionDrawerContent
            canComment={Boolean(currentUser && can(currentUser, "forms.comment"))}
            closeHref={drawerHref}
            submission={selectedSubmission}
          />
        </ApplicationInspectorDrawer>
      ) : null}
    </div>
  );
}

export async function ApplicationTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [template, referenceData] = await Promise.all([
    getFormTemplateDetail(id),
    getApplicationsReferenceData(),
  ]);

  if (!template) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={["Applications", template.title]}
        contextLabel={template.key}
        description="Member-facing submission workspace for configurable applications, requests, and future approval-driven community workflows."
        title={template.title}
      />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardWidget description="Configured submission prompts for this template." title="Fields" tone="info" value={String(template.fieldCount)} />
        <KpiCard hint="Approval stages currently configured." label="Workflow Steps" tone="warning" value={String(template.approvalStepCount)} />
        <KpiCard hint="Total requests already created from this template." label="Submissions" tone="muted" value={String(template.submissionCount)} />
        <KpiCard hint="Current template availability for members." label="Template State" tone={template.isEnabled ? "success" : "warning"} value={template.isEnabled ? "Enabled" : "Disabled"} />
      </section>
      {!template.isEnabled || template.isArchived ? (
        <Card className="border-warning/30 bg-warning/10">
          <CardContent className="p-4 text-sm leading-6 text-warning">
            This template is currently not accepting submissions. The member-facing layout remains visible so the workflow structure can still be reviewed.
          </CardContent>
        </Card>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <FormSubmissionComposer
          referenceData={referenceData}
          returnTo="/applications"
          template={template}
        />
        <div className="space-y-4">
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Form overview</CardTitle>
              <CardDescription>
                This request foundation stays reusable across recruiting, transfers, LOA, staff applications, and future RASP review.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <StatusBadge label={template.formTypeLabel} tone="info" />
              {template.targetUnit ? <StatusBadge label={template.targetUnit.label} tone="muted" /> : null}
              <p className="text-sm leading-7 text-muted-foreground">
                {template.description ?? "No additional description has been supplied yet."}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Workflow preview</CardTitle>
              <CardDescription>
                Reviewers and steps are configured centrally so future automation can attach without rewriting the member submission surface.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {template.approvalSteps.length > 0 ? (
                <WorkflowPreview detail={template} />
              ) : (
                <EmptyState
                  description="No approval steps have been configured yet."
                  title="Workflow not configured"
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export async function AdministrationFormsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  await requireApplicationRoutePermission("forms.edit");

  const resolvedSearchParams = (await searchParams) ?? {};
  const templateFormType = getSearchParamValue(resolvedSearchParams, "formType");
  const templateState = getSearchParamValue(resolvedSearchParams, "state");
  const filters: FormTemplatesFilter = {
    formType: templateFormType && isFormTemplateType(templateFormType) ? templateFormType : "",
    q: getSearchParamValue(resolvedSearchParams, "q"),
    state:
      templateState === "enabled" ||
      templateState === "disabled" ||
      templateState === "archived"
        ? templateState
        : "",
    unitId: getSearchParamValue(resolvedSearchParams, "unitId"),
  };
  const message = getSearchParamValue(resolvedSearchParams, "message");
  const error = getSearchParamValue(resolvedSearchParams, "error");
  const [templatesData, referenceData] = await Promise.all([
    listAdministrationFormTemplates(filters),
    getApplicationsReferenceData(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={["Administration", "Forms"]}
        description="Manage reusable application templates, field definitions, and workflow metadata before deeper business automation is attached."
        title="Forms"
      />
      {message ? <FlashNotice message={message} tone="success" /> : null}
      {error ? <FlashNotice message={error} tone="danger" /> : null}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardWidget description="Active templates currently visible to members or scoped staff." title="Enabled" tone="success" value={String(templatesData.summary.active)} />
        <KpiCard hint="Templates kept available for editing but not currently accepting submissions." label="Disabled" tone="warning" value={String(templatesData.summary.disabled)} />
        <KpiCard hint="Retired templates preserved for audit and reporting continuity." label="Archived" tone="muted" value={String(templatesData.summary.archived)} />
        <KpiCard hint="Total builder records in the current filtered workspace." label="Templates" tone="info" value={String(templatesData.summary.total)} />
      </section>
      <TemplateFiltersCard filters={filters} referenceData={referenceData} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <Card className="border-border/80 bg-card/88">
          <CardHeader>
            <CardTitle>Template catalog</CardTitle>
            <CardDescription>
              Each template stays configuration-first so later recruiting, transfer, and LOA workflows can reuse the same foundation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {templatesData.templates.length > 0 ? (
              templatesData.templates.map((template) => (
                <TemplateCard key={template.id} template={template} />
              ))
            ) : (
              <EmptyState
                description="No form templates matched the current filters."
                title="No templates found"
              />
            )}
          </CardContent>
        </Card>
        <CreateFormTemplateForm referenceData={referenceData} returnTo="/administration/forms" />
      </div>
    </div>
  );
}

export async function AdministrationFormDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<SearchParamsRecord>;
}) {
  await requireApplicationRoutePermission("forms.edit");

  const { id } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const message = getSearchParamValue(resolvedSearchParams, "message");
  const error = getSearchParamValue(resolvedSearchParams, "error");
  const [template, referenceData] = await Promise.all([
    getFormTemplateDetail(id),
    getApplicationsReferenceData(),
  ]);

  if (!template) {
    notFound();
  }

  const returnTo = `/administration/forms/${template.id}`;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={["Administration", "Forms", template.title]}
        contextLabel={template.key}
        description="Field-level builder foundation for configurable forms, submission workflows, and future approval-driven community processes."
        title={template.title}
      />
      {message ? <FlashNotice message={message} tone="success" /> : null}
      {error ? <FlashNotice message={error} tone="danger" /> : null}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardWidget description="Configured form fields in current sort order." title="Fields" tone="info" value={String(template.fieldCount)} />
        <KpiCard hint="Approval stages attached to this template." label="Workflow Steps" tone="warning" value={String(template.approvalStepCount)} />
        <KpiCard hint="Tracked submission records already created from this template." label="Submissions" tone="muted" value={String(template.submissionCount)} />
        <KpiCard hint="Current acceptance state for members." label="State" tone={template.isEnabled ? "success" : "warning"} value={template.isEnabled ? "Enabled" : "Disabled"} />
      </section>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-6">
          <EditFormTemplateForm detail={template} referenceData={referenceData} returnTo={returnTo} />
          <Card className="border-border/80 bg-card/88">
            <CardHeader>
              <CardTitle>Field builder</CardTitle>
              <CardDescription>
                Edit existing prompts inline or add new fields for future recruiting, transfer, LOA, staff, and instructor workflows.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormFieldEditorForm detail={template} referenceData={referenceData} returnTo={returnTo} />
              {template.fields.length > 0 ? (
                template.fields.map((field) => (
                  <FormFieldEditorForm
                    key={field.id}
                    detail={template}
                    field={field}
                    referenceData={referenceData}
                    returnTo={returnTo}
                  />
                ))
              ) : (
                <EmptyState
                  description="Add the first field to start shaping a reusable submission experience."
                  title="No fields yet"
                />
              )}
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/88">
            <CardHeader>
              <CardTitle>Approval workflow</CardTitle>
              <CardDescription>
                Start with a simple approval lane now and leave room for future multi-step review without rebuilding the template model.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ApprovalStepEditorForm detail={template} referenceData={referenceData} returnTo={returnTo} />
              {template.approvalSteps.length > 0 ? (
                template.approvalSteps.map((step) => (
                  <ApprovalStepEditorForm
                    key={step.id}
                    detail={template}
                    referenceData={referenceData}
                    returnTo={returnTo}
                    step={step}
                  />
                ))
              ) : (
                <EmptyState
                  description="Add the first approval step to make the review queue actionable."
                  title="No workflow steps yet"
                />
              )}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Form preview</CardTitle>
              <CardDescription>
                Read-only preview of the prompts members will see on the submission route.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {template.fields.length > 0 ? (
                <FormPreviewFields fields={template.fields} />
              ) : (
                <EmptyState
                  description="The preview will populate after fields are added."
                  title="Nothing to preview yet"
                />
              )}
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Workflow preview</CardTitle>
              <CardDescription>
                Review which permissions and reviewer lanes the template will route into.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {template.approvalSteps.length > 0 ? (
                <WorkflowPreview detail={template} />
              ) : (
                <EmptyState
                  description="Approval routing preview appears once steps are configured."
                  title="No review flow yet"
                />
              )}
            </CardContent>
          </Card>
          <FormTemplateStateForms detail={template} returnTo={returnTo} />
        </div>
      </div>
    </div>
  );
}

export async function AdministrationSubmissionsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  await requireApplicationRoutePermission("forms.review");

  const resolvedSearchParams = (await searchParams) ?? {};
  const reviewFormType = getSearchParamValue(resolvedSearchParams, "formType");
  const reviewStatus = getSearchParamValue(resolvedSearchParams, "status");
  const filters: FormSubmissionsFilter = {
    formType: reviewFormType && isFormTemplateType(reviewFormType) ? reviewFormType : "",
    q: getSearchParamValue(resolvedSearchParams, "q"),
    reviewerId: getSearchParamValue(resolvedSearchParams, "reviewerId"),
    status: reviewStatus && isSubmissionStatusKey(reviewStatus) ? reviewStatus : "",
    unitId: getSearchParamValue(resolvedSearchParams, "unitId"),
  };
  const selectedSubmissionId = getSearchParamValue(resolvedSearchParams, "submission");
  const message = getSearchParamValue(resolvedSearchParams, "message");
  const error = getSearchParamValue(resolvedSearchParams, "error");
  const [referenceData, queueData, selectedSubmission, currentUser] = await Promise.all([
    getApplicationsReferenceData(),
    listSubmissionReviewQueue(filters),
    selectedSubmissionId ? getFormSubmissionDetail(selectedSubmissionId) : Promise.resolve(null),
    getCurrentUser(),
  ]);

  const closeHref = buildHref("/administration/submissions", resolvedSearchParams, {
    error: undefined,
    message: undefined,
    submission: selectedSubmissionId,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={["Administration", "Submissions"]}
        description="Staff review queue for configurable applications and requests, with comment threads, reviewer assignment, and approval actions kept in one inspector-driven surface."
        title="Submission Review Queue"
      />
      {message ? <FlashNotice message={message} tone="success" /> : null}
      {error ? <FlashNotice message={error} tone="danger" /> : null}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardWidget description="Total submissions visible in the current review slice." title="Queue Total" tone="info" value={String(queueData.summary.total)} />
        <KpiCard hint="Submissions still waiting on staff action." label="Submitted" tone="warning" value={String(queueData.summary.submitted)} />
        <KpiCard hint="Submissions actively being processed." label="Under Review" tone="warning" value={String(queueData.summary.underReview)} />
        <KpiCard hint="Requests already approved in the filtered workspace." label="Approved" tone="success" value={String(queueData.summary.approved)} />
      </section>
      <ReviewQueueFiltersCard filters={filters} referenceData={referenceData} />
      <Card className="border-border/80 bg-card/88">
        <CardHeader>
          <CardTitle>Review queue</CardTitle>
          <CardDescription>
            Open a submission in the inspector to assign reviewers, leave staff notes, or record approval decisions without losing queue context.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {queueData.submissions.length > 0 ? (
            queueData.submissions.map((submission) => (
              <ReviewQueueCard
                key={submission.id}
                href={buildHref("/administration/submissions", resolvedSearchParams, { submission: submission.id })}
                submission={submission}
              />
            ))
          ) : (
            <EmptyState
              description="No submissions matched the current queue filters."
              title="Review queue is clear"
            />
          )}
        </CardContent>
      </Card>
      {selectedSubmission ? (
        <ApplicationInspectorDrawer
          closeHref={buildHref("/administration/submissions", resolvedSearchParams, {
            error: undefined,
            message: undefined,
            submission: undefined,
          })}
          open
          statusBadge={{
            label: selectedSubmission.status.label,
            tone: getApplicationStatusTone(selectedSubmission.status.key),
          }}
          subtitle={selectedSubmission.descriptionSnapshot ?? "Submission detail, answers, comments, and staff review controls."}
          tabPanels={SubmissionInspectorPanels({ submission: selectedSubmission })}
          title={selectedSubmission.titleSnapshot}
        >
          <ReviewQueueDrawerContent
            canApprove={Boolean(currentUser && can(currentUser, "forms.approve", { unitId: selectedSubmission.targetUnit?.id ?? null }))}
            canArchive={Boolean(currentUser && can(currentUser, "forms.archive", { unitId: selectedSubmission.targetUnit?.id ?? null }))}
            canAssignReviewer={Boolean(currentUser && can(currentUser, "forms.assign_reviewer", { unitId: selectedSubmission.targetUnit?.id ?? null }))}
            canComment={Boolean(currentUser && can(currentUser, "forms.comment", { unitId: selectedSubmission.targetUnit?.id ?? null }))}
            canDeny={Boolean(currentUser && can(currentUser, "forms.deny", { unitId: selectedSubmission.targetUnit?.id ?? null }))}
            canReview={Boolean(currentUser && can(currentUser, "forms.review", { unitId: selectedSubmission.targetUnit?.id ?? null }))}
            closeHref={closeHref}
            referenceData={referenceData}
            submission={selectedSubmission}
          />
        </ApplicationInspectorDrawer>
      ) : null}
    </div>
  );
}
