import Link from "next/link";
import { AlertTriangle, ArrowRight, ClipboardList, ShieldCheck, Users } from "lucide-react";

import { DashboardWidget } from "@/components/dashboard/dashboard-widget";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PageHeader } from "@/components/layout/page-header";
import { CollapsibleSection } from "@/components/layout/progressive-disclosure";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge, type BadgeTone } from "@/components/status/status-badge";
import { UnitBadge } from "@/components/status/unit-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCountLabel, formatDate } from "@/lib/formatters";
import {
  createPersonnelActionAction,
  reviewLeaveOfAbsenceAction,
  reviewTransferRequestAction,
  submitLeaveOfAbsenceAction,
  submitTransferRequestAction,
  upsertAttendancePolicyAction,
} from "@/server/personnel/center-actions";
import { getPersonnelReadinessCenterData } from "@/server/personnel/center-service";

type SearchParamsValue = string | string[] | undefined;
type SearchParamsRecord = Record<string, SearchParamsValue>;

function getSearchParamValue(searchParams: SearchParamsRecord, key: string) {
  const value = searchParams[key];

  return Array.isArray(value) ? value[0] : value;
}

function getRuleTone(status: string): BadgeTone {
  switch (status) {
    case "FAIL":
      return "danger";
    case "WARNING":
      return "warning";
    case "PASS":
      return "success";
    default:
      return "muted";
  }
}

function getPriorityTone(priority: string): BadgeTone {
  switch (priority) {
    case "critical":
    case "high":
      return "danger";
    case "medium":
      return "warning";
    case "low":
      return "info";
    default:
      return "muted";
  }
}

function fieldClassName() {
  return "flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
}

function textareaClassName() {
  return "min-h-24 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
}

function FlashNotice({
  message,
  tone,
}: {
  message: string;
  tone: BadgeTone;
}) {
  return (
    <Card className={tone === "danger" ? "border-danger/30 bg-danger/10" : "border-success/30 bg-success/10"}>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {tone === "danger" ? "Action blocked" : "Action completed"}
          </p>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        <StatusBadge label={tone === "danger" ? "Error" : "Saved"} tone={tone} />
      </CardContent>
    </Card>
  );
}

function HiddenReturnTo() {
  return <input name="returnTo" type="hidden" value="/personnel" />;
}

export async function PersonnelCenterPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const message = getSearchParamValue(resolvedSearchParams, "message");
  const error = getSearchParamValue(resolvedSearchParams, "error");
  const data = await getPersonnelReadinessCenterData();

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={["Personnel", "Readiness Center"]}
        description="A calm command view for members, unit assignments, qualifications, attendance, readiness, and personnel actions."
        primaryAction={{
          href: "/personnel/members",
          label: "Open Members",
        }}
        secondaryActions={[
          { href: "/personnel/roster", label: "Roster", variant: "outline" },
          { href: "/training/qualification-matrix", label: "Qualification Matrix", variant: "outline" },
        ]}
        title="Personnel & Readiness Center"
      />
      {message ? <FlashNotice message={message} tone="success" /> : null}
      {error ? <FlashNotice message={error} tone="danger" /> : null}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          hint="Database-backed visible member records"
          label="Total Members"
          tone="info"
          trend="Discord display names"
          value={String(data.metrics.totalMembers)}
        />
        <KpiCard
          hint="Members with active roster status"
          label="Active"
          tone="success"
          trend="Status configured"
          value={String(data.metrics.activeMembers)}
        />
        <DashboardWidget
          description="Approved or active leave records"
          title="LOA"
          tone="warning"
          value={String(data.metrics.loaMembers)}
        />
        <DashboardWidget
          description="Required qualification gaps across visible members"
          title="Missing Quals"
          tone={data.metrics.missingQualifications > 0 ? "warning" : "success"}
          value={String(data.metrics.missingQualifications)}
        />
        <DashboardWidget
          description="Open personnel actions, transfers, and LOA reviews"
          title="Action Queue"
          tone={data.metrics.pendingPersonnelActions > 0 ? "danger" : "success"}
          value={String(data.metrics.pendingPersonnelActions)}
        />
      </section>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
        <Card className="border-border/80 bg-card/88">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Needs attention</CardTitle>
                <CardDescription>
                  Readiness blockers from unit assignment, status, qualifications, attendance, and personnel actions.
                </CardDescription>
              </div>
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
          </CardHeader>
          <CardContent>
            {data.membersNeedingAttention.length === 0 ? (
              <EmptyState
                description="No visible member readiness blockers were found."
                title="No member blockers"
              />
            ) : (
              <div className="space-y-3">
                {data.membersNeedingAttention.map((member) => (
                  <div key={member.id} className="rounded-xl border border-border/70 bg-background/40 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <Link className="font-semibold text-foreground hover:text-primary" href={`/personnel/members/${member.id}`}>
                          {member.displayName}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {member.unitShortName ?? "Unassigned"} / {formatCountLabel(member.reasons.length, "issue")}
                        </p>
                      </div>
                      {member.unitShortName ? <UnitBadge label={member.unitShortName} /> : null}
                    </div>
                    <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                      {member.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-border/80 bg-card/88">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Rule engine findings</CardTitle>
                <CardDescription>
                  Explainable member and unit readiness rule results. Scores stay secondary to the reasons.
                </CardDescription>
              </div>
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            {data.readinessRules.length === 0 ? (
              <EmptyState
                description="The rule providers did not return visible warnings or failures."
                title="No readiness rule findings"
              />
            ) : (
              <div className="space-y-3">
                {data.readinessRules.map((rule) => (
                  <div key={`${rule.providerId}:${rule.id}:${rule.relatedEntityId ?? "global"}`} className="rounded-xl border border-border/70 bg-background/40 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-foreground">{rule.title}</p>
                      <StatusBadge label={rule.status} tone={getRuleTone(rule.status)} />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{rule.message}</p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {rule.recommendedAction}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border/80 bg-card/88">
          <CardHeader>
            <CardTitle>Unit readiness</CardTitle>
            <CardDescription>
              Unit strength, missing required qualifications, and vacant leadership positions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.unitReadiness.length === 0 ? (
              <EmptyState description="No active units are visible." title="No unit data" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Unit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Missing Quals</TableHead>
                    <TableHead>Vacant Lead</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.unitReadiness.map((unit) => (
                    <TableRow key={unit.id}>
                      <TableCell>
                        <Link className="font-semibold text-foreground hover:text-primary" href={`/units/${unit.id}`}>
                          {unit.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{unit.shortName}</p>
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          label={unit.readinessLabel}
                          tone={unit.readinessLabel === "Ready" ? "success" : "warning"}
                        />
                      </TableCell>
                      <TableCell>{unit.activeMembers}</TableCell>
                      <TableCell>{unit.missingRequiredQualifications}</TableCell>
                      <TableCell>{unit.vacantLeadershipPositions}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <Card className="border-border/80 bg-card/88">
          <CardHeader>
            <CardTitle>Attendance concerns</CardTitle>
            <CardDescription>
              Members below the current attendance concern threshold. LOA policy refinement stays unit-scoped.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.attendanceConcerns.length === 0 ? (
              <EmptyState
                description="No low-attendance concerns are visible with current permissions."
                title="No attendance concerns"
              />
            ) : (
              <div className="space-y-3">
                {data.attendanceConcerns.map((member) => (
                  <div key={member.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/40 p-4">
                    <div>
                      <Link className="font-semibold text-foreground hover:text-primary" href={`/personnel/members/${member.id}`}>
                        {member.displayName}
                      </Link>
                      <p className="text-sm text-muted-foreground">{member.unitShortName ?? "Unassigned"}</p>
                    </div>
                    <StatusBadge label={`${member.attendanceRate ?? 0}%`} tone="warning" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border/80 bg-card/88">
          <CardHeader>
            <CardTitle>Personnel actions</CardTitle>
            <CardDescription>
              S1-oriented queue for follow-up items, profile corrections, assignment reviews, and readiness work.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.actions.length === 0 ? (
              <EmptyState
                description="No open personnel actions are visible."
                title="No open actions"
              />
            ) : (
              data.actions.map((action) => (
                <div key={action.id} className="rounded-xl border border-border/70 bg-background/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-semibold text-foreground">{action.title}</p>
                    <StatusBadge label={action.priority} tone={getPriorityTone(action.priority)} />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{action.summary}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {action.actionType} / {action.status} / Due {formatDate(action.dueAt)}
                  </p>
                </div>
              ))
            )}
            {data.capabilities.canManageActions ? (
              <CollapsibleSection
                description="Create a lightweight personnel action without opening a separate approval system."
                title="Create personnel action"
              >
                <form action={createPersonnelActionAction} className="grid gap-3">
                  <HiddenReturnTo />
                  <input className={fieldClassName()} name="title" placeholder="Action title" required />
                  <select className={fieldClassName()} defaultValue="profile_correction" name="actionType">
                    <option value="assignment_change">Assignment change</option>
                    <option value="status_change">Status change</option>
                    <option value="qualification_exception">Qualification exception</option>
                    <option value="profile_correction">Profile correction</option>
                    <option value="loa_return">LOA return</option>
                  </select>
                  <select className={fieldClassName()} defaultValue="" name="memberProfileId">
                    <option value="">No specific member</option>
                    {data.reference.members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.displayName}
                      </option>
                    ))}
                  </select>
                  <select className={fieldClassName()} defaultValue="medium" name="priority">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                  <input className={fieldClassName()} name="dueAt" type="date" />
                  <textarea className={textareaClassName()} name="summary" placeholder="Summary and context" required />
                  <Button type="submit">Create action</Button>
                </form>
              </CollapsibleSection>
            ) : null}
          </CardContent>
        </Card>
        <Card className="border-border/80 bg-card/88">
          <CardHeader>
            <CardTitle>Transfers and LOA</CardTitle>
            <CardDescription>
              Review-based personnel movement uses case-backed records, preserves assignment history, and notifies through the communication pipeline.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {data.pendingTransfers.length === 0 ? (
                <EmptyState description="No pending transfer requests are visible." title="No pending transfers" />
              ) : (
                data.pendingTransfers.map((transfer) => (
                  <div key={transfer.id} className="rounded-xl border border-border/70 bg-background/40 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-semibold text-foreground">{transfer.memberDisplayName}</p>
                      <StatusBadge label={transfer.status} tone="warning" />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {transfer.currentUnitShortName ?? "Unassigned"} to {transfer.requestedUnitShortName} / {formatDate(transfer.createdAt)}
                    </p>
                    {data.capabilities.canReviewTransfers ? (
                      <form action={reviewTransferRequestAction} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                        <HiddenReturnTo />
                        <input name="transferRequestId" type="hidden" value={transfer.id} />
                        <input className={fieldClassName()} name="reviewNotes" placeholder="Review note" />
                        <Button name="status" size="sm" type="submit" value="approved">Approve</Button>
                        <Button name="status" size="sm" type="submit" value="denied" variant="outline">Deny</Button>
                      </form>
                    ) : null}
                  </div>
                ))
              )}
            </div>
            <div className="space-y-3">
              {data.loaReturns.length === 0 ? null : (
                data.loaReturns.map((leave) => (
                  <div key={leave.id} className="rounded-xl border border-border/70 bg-background/40 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-semibold text-foreground">{leave.memberDisplayName}</p>
                      <StatusBadge label={leave.status} tone="warning" />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Expected return {formatDate(leave.expectedReturnAt)}
                    </p>
                    {data.capabilities.canReviewLeave ? (
                      <form action={reviewLeaveOfAbsenceAction} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
                        <HiddenReturnTo />
                        <input name="leaveId" type="hidden" value={leave.id} />
                        <input className={fieldClassName()} name="reviewNotes" placeholder="Review note" />
                        <Button name="status" size="sm" type="submit" value="approved">Approve</Button>
                        <Button name="status" size="sm" type="submit" value="returned" variant="secondary">Returned</Button>
                        <Button name="status" size="sm" type="submit" value="denied" variant="outline">Deny</Button>
                      </form>
                    ) : null}
                  </div>
                ))
              )}
            </div>
            {(data.capabilities.canSubmitTransfers || data.capabilities.canSubmitLeave) ? (
              <CollapsibleSection
                description="Member-facing requests stay lightweight, then move into case-backed staff review."
                title="Submit request"
              >
                <div className="grid gap-4 lg:grid-cols-2">
                  {data.capabilities.canSubmitTransfers ? (
                    <form action={submitTransferRequestAction} className="grid gap-3 rounded-xl border border-border/70 bg-background/35 p-4">
                      <HiddenReturnTo />
                      <p className="text-sm font-semibold text-foreground">Transfer request</p>
                      <select className={fieldClassName()} name="memberProfileId" required>
                        <option value="">Select member</option>
                        {data.reference.members.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.displayName}
                          </option>
                        ))}
                      </select>
                      <select className={fieldClassName()} name="requestedUnitId" required>
                        <option value="">Requested unit</option>
                        {data.reference.units.map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            {unit.label}
                          </option>
                        ))}
                      </select>
                      <textarea className={textareaClassName()} name="reason" placeholder="Reason" required />
                      <Button type="submit">Submit transfer</Button>
                    </form>
                  ) : null}
                  {data.capabilities.canSubmitLeave ? (
                    <form action={submitLeaveOfAbsenceAction} className="grid gap-3 rounded-xl border border-border/70 bg-background/35 p-4">
                      <HiddenReturnTo />
                      <p className="text-sm font-semibold text-foreground">LOA request</p>
                      <select className={fieldClassName()} name="memberProfileId" required>
                        <option value="">Select member</option>
                        {data.reference.members.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.displayName}
                          </option>
                        ))}
                      </select>
                      <input className={fieldClassName()} name="startsAt" required type="date" />
                      <input className={fieldClassName()} name="expectedReturnAt" type="date" />
                      <textarea className={textareaClassName()} name="reason" placeholder="Reason, visibility policy applies" />
                      <Button type="submit">Submit LOA</Button>
                    </form>
                  ) : null}
                </div>
              </CollapsibleSection>
            ) : null}
          </CardContent>
        </Card>
      </section>
      {data.capabilities.canManageAttendancePolicies ? (
        <CollapsibleSection
          description="Attendance interpretation is unit-scoped. This foundation stores the policy without hard-coding one community-wide threshold."
          title="Unit attendance policy"
        >
          <form action={upsertAttendancePolicyAction} className="grid gap-3 rounded-2xl border border-border/70 bg-card/82 p-4 md:grid-cols-4">
            <HiddenReturnTo />
            <select className={fieldClassName()} name="unitId" required>
              <option value="">Select unit</option>
              {data.reference.units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.label}
                </option>
              ))}
            </select>
            <input className={fieldClassName()} defaultValue="90" min="1" name="lookbackDays" type="number" />
            <input className={fieldClassName()} defaultValue="70" max="100" min="0" name="minimumAttendancePercent" type="number" />
            <Button type="submit">Save policy</Button>
            <textarea className={`${textareaClassName()} md:col-span-4`} name="notes" placeholder="Policy notes, LOA exclusions, and review guidance" />
          </form>
        </CollapsibleSection>
      ) : null}
      <Card className="border-border/80 bg-card/82">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Need deeper context?</p>
              <p className="text-sm text-muted-foreground">
                Drill into members, roster, units, and qualification matrix without losing the center overview.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/units">
                Units
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/personnel/qualifications">
                Qualifications
                <ClipboardList className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
