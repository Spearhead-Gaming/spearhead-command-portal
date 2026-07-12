import { AlertTriangle, BriefcaseBusiness, Gavel, HeartPulse, ShieldAlert } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { CollapsibleSection, NeedsAttention, SummaryCard } from "@/components/layout/progressive-disclosure";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge, type BadgeTone } from "@/components/status/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  addCaseEvidenceAction,
  addCaseNoteAction,
  assignCommunityCaseAction,
  createCommunityCaseAction,
  issueWarningAction,
  recordCaseDecisionAction,
  requestModerationActionAction,
  submitAppealAction,
  submitIncidentReportAction,
  transitionCommunityCaseAction,
} from "@/server/community-management/actions";
import { getCommunityManagementCenterData } from "@/server/community-management/queries";
import { formatDate, formatDateTime } from "@/lib/formatters";

const inputClassName =
  "flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const textareaClassName =
  "min-h-24 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const labelClassName = "text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground";

function statusTone(status: string): BadgeTone {
  if (["resolved", "closed", "succeeded"].includes(status)) {
    return "success";
  }

  if (["critical", "failed", "archived", "administrator_only"].includes(status)) {
    return "danger";
  }

  if (["pending_decision", "awaiting_information", "pending_provider", "high", "restricted", "command_only"].includes(status)) {
    return "warning";
  }

  if (["open", "under_review", "reopened", "medium"].includes(status)) {
    return "info";
  }

  return "muted";
}

function CaseSelect({
  cases,
  name = "caseId",
}: {
  cases: Awaited<ReturnType<typeof getCommunityManagementCenterData>>["cases"];
  name?: string;
}) {
  return (
    <select className={inputClassName} name={name}>
      {cases.map((communityCase) => (
        <option key={communityCase.id} value={communityCase.id}>
          {communityCase.caseNumber} - {communityCase.title}
        </option>
      ))}
    </select>
  );
}

export async function CommunityManagementCenterPage() {
  const data = await getCommunityManagementCenterData();
  const primaryCases = data.cases.filter((communityCase) =>
    ["open", "under_review", "awaiting_information", "pending_decision", "reopened"].includes(communityCase.status),
  );
  const attentionItems = [
    data.queues.criticalCases > 0
      ? {
          actionLabel: "Review cases",
          affectedEntity: "Critical queue",
          href: "/community-management#case-queues",
          label: `Review ${data.queues.criticalCases} critical case${data.queues.criticalCases === 1 ? "" : "s"}`,
          meta: "Critical cases should be handled before historical moderation or workload review.",
          tone: "danger" as const,
        }
      : null,
    data.queues.awaitingAssignment > 0
      ? {
          actionLabel: "Assign staff",
          affectedEntity: "Unassigned cases",
          href: "/community-management#case-queues",
          label: `${data.queues.awaitingAssignment} case${data.queues.awaitingAssignment === 1 ? "" : "s"} need assignment`,
          meta: "Assign an owner or queue so follow-up does not disappear into the backlog.",
          tone: "warning" as const,
        }
      : null,
    data.queues.pendingAppeals > 0
      ? {
          actionLabel: "Review appeals",
          affectedEntity: "Appeals",
          href: "/community-management#case-queues",
          label: `${data.queues.pendingAppeals} appeal${data.queues.pendingAppeals === 1 ? "" : "s"} awaiting decision`,
          meta: "Appeals remain visible until a staff decision is recorded.",
          tone: "warning" as const,
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={["Community Management"]}
        description="Neutral case management, incident review, appeals, staff notes, evidence, and Discord moderation history."
        title="Community Management Center"
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          description="Active cases requiring staff awareness."
          status={<BriefcaseBusiness aria-hidden="true" className="h-4 w-4 text-primary" />}
          title="Open cases"
          value={data.queues.openCases}
        />
        <SummaryCard
          description="High urgency cases without sensational labels."
          status={<ShieldAlert aria-hidden="true" className="h-4 w-4 text-danger" />}
          title="Critical"
          value={data.queues.criticalCases}
        />
        <SummaryCard
          description="Cases that need a staff owner or queue."
          status={<AlertTriangle aria-hidden="true" className="h-4 w-4 text-warning" />}
          title="Awaiting assignment"
          value={data.queues.awaitingAssignment}
        />
        <SummaryCard
          description="Appeals that still need review or decision."
          status={<Gavel aria-hidden="true" className="h-4 w-4 text-primary" />}
          title="Pending appeals"
          value={data.queues.pendingAppeals}
        />
      </section>

      <NeedsAttention
        emptyDescription="No critical cases, unassigned cases, or pending appeals need immediate staff action."
        items={attentionItems}
      />

      <CollapsibleSection
        badgeLabel="Supporting"
        description="Health indicators are useful context, but they should not compete with active cases."
        title="Community health indicators"
      >
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {data.healthIndicators.map((indicator) => (
            <Card key={indicator.label} className="border-border/80 bg-card/72">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <HeartPulse className="h-4 w-4 text-primary" />
                  <CardTitle>{indicator.label}</CardTitle>
                </div>
                <CardDescription>{indicator.hint}</CardDescription>
              </CardHeader>
              <CardContent>
                <StatusBadge label={indicator.value} tone={indicator.tone} />
              </CardContent>
            </Card>
          ))}
        </section>
      </CollapsibleSection>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_28rem]">
        <div className="space-y-6">
          <Card className="border-border/80 bg-card/88" id="case-queues">
            <CardHeader>
              <CardTitle>Case Queues</CardTitle>
              <CardDescription>Summary-first case cards. Secondary details stay inside expandable sections.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {primaryCases.length > 0 ? (
                primaryCases.map((communityCase) => (
                  <div key={communityCase.id} className="rounded-xl border border-border/70 bg-background/45 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">
                          {communityCase.caseNumber} - {communityCase.title}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {communityCase.caseType} / {communityCase.relatedMemberName ?? "No linked member"} / opened {formatDate(communityCase.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge label={communityCase.priority} tone={statusTone(communityCase.priority)} />
                        <StatusBadge label={communityCase.status} tone={statusTone(communityCase.status)} />
                        <StatusBadge label={communityCase.confidentiality} tone={statusTone(communityCase.confidentiality)} />
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Assigned: {communityCase.assignedToName ?? "Unassigned"} / Due {formatDate(communityCase.dueAt)}
                    </p>
                    {communityCase.latestTimeline ? (
                      <p className="mt-2 text-xs text-muted-foreground">Latest: {communityCase.latestTimeline}</p>
                    ) : null}
                    <details className="mt-3 rounded-lg border border-border/60 bg-background/50 p-3">
                      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Case Actions
                      </summary>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <form action={assignCommunityCaseAction} className="space-y-3">
                          <input name="caseId" type="hidden" value={communityCase.id} />
                          <label className="space-y-2">
                            <span className={labelClassName}>Assign To</span>
                            <select className={inputClassName} name="assignedToUserId">
                              <option value="">Permission queue / unassigned</option>
                              {data.reference.users.map((user) => (
                                <option key={user.id} value={user.id}>
                                  {user.displayName}
                                </option>
                              ))}
                            </select>
                          </label>
                          <input className={inputClassName} name="notes" placeholder="Assignment note" />
                          <Button size="sm" type="submit" variant="outline">Assign</Button>
                        </form>
                        <form action={transitionCommunityCaseAction} className="space-y-3">
                          <input name="caseId" type="hidden" value={communityCase.id} />
                          <label className="space-y-2">
                            <span className={labelClassName}>Transition</span>
                            <select className={inputClassName} name="status">
                              <option value="under_review">Under Review</option>
                              <option value="awaiting_information">Awaiting Information</option>
                              <option value="pending_decision">Pending Decision</option>
                              <option value="resolved">Resolved</option>
                              <option value="dismissed">Dismissed</option>
                              <option value="closed">Closed</option>
                              <option value="archived">Archived</option>
                            </select>
                          </label>
                          <input className={inputClassName} name="resolution" placeholder="Resolution note, if applicable" />
                          <Button size="sm" type="submit" variant="outline">Update Status</Button>
                        </form>
                      </div>
                    </details>
                  </div>
                ))
              ) : (
                <EmptyState description="New case records and incident reports will appear here." title="No active cases" />
              )}
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/88">
            <CardHeader>
              <CardTitle>Community Rules & Recommendations</CardTitle>
              <CardDescription>Advisory signals from the Universal Rule Engine. Nothing executes automatically.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.recommendations.length > 0 ? (
                data.recommendations.map((recommendation) => (
                  <div key={recommendation.id} className="rounded-xl border border-warning/30 bg-warning/6 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-foreground">{recommendation.title}</p>
                      <StatusBadge label={recommendation.priority} tone={statusTone(recommendation.priority)} />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{recommendation.recommendedAction}</p>
                  </div>
                ))
              ) : (
                <EmptyState description="Community recommendations appear when rules produce warnings or failures." title="No recommendations" />
              )}
            </CardContent>
          </Card>

          <CollapsibleSection
            description="Portal-recorded Discord moderation actions and unsupported provider placeholders."
            title="Moderation history"
          >
            <div className="space-y-3">
              {data.moderationActions.length > 0 ? (
                data.moderationActions.map((action) => (
                  <div key={action.id} className="rounded-xl border border-border/70 bg-background/45 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-semibold text-foreground">{action.action} / {action.targetDiscordUserId}</p>
                      <StatusBadge label={action.result} tone={statusTone(action.result)} />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{action.reason}</p>
                    {action.errorMessage ? <p className="mt-2 text-xs text-danger">{action.errorMessage}</p> : null}
                    <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(action.createdAt)}</p>
                  </div>
                ))
              ) : (
                <EmptyState description="Moderation actions appear after staff records or executes them through the portal." title="No moderation history" />
              )}
            </div>
          </CollapsibleSection>
        </div>

        <div className="space-y-6">
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Create Case</CardTitle>
              <CardDescription>Reusable Universal Case Engine intake.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createCommunityCaseAction} className="space-y-4">
                <label className="space-y-2">
                  <span className={labelClassName}>Type</span>
                  <select className={inputClassName} name="caseType">
                    {data.caseTypes.map((caseType) => (
                      <option key={caseType.id} value={caseType.id}>{caseType.displayName}</option>
                    ))}
                  </select>
                </label>
                <input className={inputClassName} name="title" placeholder="Case title" />
                <input className={inputClassName} name="summary" placeholder="Short summary" />
                <textarea className={textareaClassName} name="description" placeholder="Description" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <select className={inputClassName} name="priority" defaultValue="medium">
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                    <option value="informational">Informational</option>
                  </select>
                  <select className={inputClassName} name="confidentiality" defaultValue="standard">
                    <option value="standard">Standard</option>
                    <option value="restricted">Restricted</option>
                    <option value="command_only">Command Only</option>
                    <option value="administrator_only">Administrator Only</option>
                  </select>
                </div>
                <select className={inputClassName} name="relatedMemberId">
                  <option value="">No linked member</option>
                  {data.reference.members.map((member) => (
                    <option key={member.id} value={member.id}>{member.displayName}</option>
                  ))}
                </select>
                <input className={inputClassName} name="relatedDiscordUserId" placeholder="Discord user ID, optional" />
                <Button type="submit">Create Case</Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Incident Report</CardTitle>
              <CardDescription>Creates an incident case with structured intake details.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={submitIncidentReportAction} className="space-y-3">
                <input className={inputClassName} name="title" placeholder="Incident title" />
                <input className={inputClassName} name="category" placeholder="Category" />
                <input className={inputClassName} name="summary" placeholder="Summary" />
                <textarea className={textareaClassName} name="detailedReport" placeholder="Detailed report" />
                <input className={inputClassName} name="locationContext" placeholder="Location or context" />
                <Button size="sm" type="submit" variant="outline">Submit Incident</Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Case Workbench</CardTitle>
              <CardDescription>Notes, evidence, decisions, warnings, and appeals preserve history.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {data.cases.length > 0 ? (
                <>
                  <form action={addCaseNoteAction} className="space-y-3">
                    <CaseSelect cases={data.cases} />
                    <textarea className={textareaClassName} name="body" placeholder="Staff note" />
                    <select className={inputClassName} name="visibility" defaultValue="staff">
                      <option value="staff">Staff</option>
                      <option value="command">Command</option>
                      <option value="administrator">Administrator</option>
                    </select>
                    <Button size="sm" type="submit" variant="outline">Add Note</Button>
                  </form>
                  <form action={addCaseEvidenceAction} className="space-y-3">
                    <CaseSelect cases={data.cases} />
                    <input className={inputClassName} name="label" placeholder="Evidence label" />
                    <input className={inputClassName} name="externalUrl" placeholder="External link or Discord message URL" />
                    <Button size="sm" type="submit" variant="outline">Add Evidence Link</Button>
                  </form>
                  <form action={recordCaseDecisionAction} className="space-y-3">
                    <CaseSelect cases={data.cases} />
                    <select className={inputClassName} name="decisionType">
                      <option value="no_action">No Action</option>
                      <option value="warning_issued">Warning Issued</option>
                      <option value="coaching_required">Coaching Required</option>
                      <option value="case_dismissed">Case Dismissed</option>
                      <option value="administrative_action">Administrative Action</option>
                    </select>
                    <input className={inputClassName} name="summary" placeholder="Decision summary" />
                    <textarea className={textareaClassName} name="reasoning" placeholder="Reasoning" />
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <input name="appealAllowed" type="checkbox" />
                      Appeal allowed
                    </label>
                    <Button size="sm" type="submit" variant="outline">Record Decision</Button>
                  </form>
                  <form action={issueWarningAction} className="space-y-3">
                    <CaseSelect cases={data.cases} />
                    <select className={inputClassName} name="targetUserId">
                      <option value="">No portal notification recipient</option>
                      {data.reference.users.map((user) => (
                        <option key={user.id} value={user.id}>{user.displayName}</option>
                      ))}
                    </select>
                    <input className={inputClassName} name="severity" placeholder="Warning severity" />
                    <textarea className={textareaClassName} name="reason" placeholder="Warning reason" />
                    <Button size="sm" type="submit" variant="outline">Issue Warning</Button>
                  </form>
                  <form action={submitAppealAction} className="space-y-3">
                    <CaseSelect cases={data.cases} name="originalCaseId" />
                    <input className={inputClassName} name="title" placeholder="Appeal title" />
                    <textarea className={textareaClassName} name="appealReason" placeholder="Appeal reason" />
                    <textarea className={textareaClassName} name="requestedRemedy" placeholder="Requested remedy" />
                    <Button size="sm" type="submit" variant="outline">Submit Appeal</Button>
                  </form>
                </>
              ) : (
                <EmptyState description="Create a case before adding notes, evidence, decisions, or appeals." title="No case selected" />
              )}
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Discord Moderation</CardTitle>
              <CardDescription>Kick executes when configured. Ban/timeout are recorded as provider-pending until implemented.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={requestModerationActionAction} className="space-y-3">
                {data.cases.length > 0 ? <CaseSelect cases={data.cases} /> : <input name="caseId" type="hidden" value="" />}
                <select className={inputClassName} name="discordServerId">
                  {data.reference.discordServers.map((server) => (
                    <option key={server.id} value={server.id}>{server.name}</option>
                  ))}
                </select>
                <select className={inputClassName} name="action">
                  <option value="kick">Kick</option>
                  <option value="timeout">Timeout Placeholder</option>
                  <option value="remove_timeout">Remove Timeout Placeholder</option>
                  <option value="ban">Ban Placeholder</option>
                  <option value="unban">Unban Placeholder</option>
                </select>
                <input className={inputClassName} name="targetDiscordUserId" placeholder="Target Discord user ID" />
                <textarea className={textareaClassName} name="reason" placeholder="Required reason" />
                <Button size="sm" type="submit" variant="outline">Record / Execute Action</Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Staff Workload</CardTitle>
              <CardDescription>Assigned active case counts for workload balancing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.staffWorkload.length > 0 ? (
                data.staffWorkload.slice(0, 8).map((staff) => (
                  <div key={staff.userId} className="flex items-center justify-between rounded-xl border border-border/70 bg-background/45 p-3">
                    <span className="text-sm font-semibold text-foreground">{staff.userName}</span>
                    <StatusBadge label={`${staff.assignedCount} active`} tone={staff.assignedCount >= 5 ? "warning" : "info"} />
                  </div>
                ))
              ) : (
                <EmptyState description="Assignments will appear after cases are routed to staff." title="No assigned workload" />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
