import Link from "next/link";

import { DashboardWidget } from "@/components/dashboard/dashboard-widget";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PageHeader } from "@/components/layout/page-header";
import { CollapsibleSection } from "@/components/layout/progressive-disclosure";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge, type BadgeTone } from "@/components/status/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCurrentUser } from "@/server/auth/current-user";
import {
  assignRoleToUserAction,
  removeRoleFromUserAction,
  setUserActiveStateAction,
} from "@/server/administration/actions";
import {
  getAdministrationReferenceData,
  getAdministrationUserDetail,
  listAdministrationUsers,
} from "@/server/administration/queries";
import { can } from "@/server/permissions/access";
import { AdministrationInspectorDrawer } from "@/features/administration/components/administration-inspector-drawer";

type SearchParamsValue = string | string[] | undefined;
type SearchParamsRecord = Record<string, SearchParamsValue>;

const fieldClassName =
  "flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const textareaClassName =
  "flex min-h-24 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const labelClassName =
  "text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground";

function getSearchParamValue(
  searchParams: SearchParamsRecord,
  key: string,
) {
  const value = searchParams[key];

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function buildHref(
  pathname: string,
  searchParams: SearchParamsRecord,
  updates: Record<string, string | undefined | null>,
) {
  const nextParams = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    const normalized = Array.isArray(value) ? value[0] : value;

    if (normalized) {
      nextParams.set(key, normalized);
    }
  }

  for (const [key, value] of Object.entries(updates)) {
    if (value) {
      nextParams.set(key, value);
    } else {
      nextParams.delete(key);
    }
  }

  const query = nextParams.toString();

  return query ? `${pathname}?${query}` : pathname;
}

function FlashNotice({
  message,
  tone,
}: {
  message: string;
  tone: BadgeTone;
}) {
  return (
    <Card
      className={
        tone === "danger"
          ? "border-danger/30 bg-danger/10"
          : "border-success/30 bg-success/10"
      }
    >
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

function UserFiltersCard({
  filters,
}: {
  filters: {
    q?: string;
    state?: "active" | "inactive" | "";
  };
}) {
  return (
    <Card className="border-border/80 bg-card/82">
      <CardHeader>
        <CardTitle>User filters</CardTitle>
        <CardDescription>
          Search by display name, email, Discord ID, or linked profile.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action="/administration/users" className="grid gap-4 md:grid-cols-[minmax(0,1fr)_14rem_auto]" method="get">
          <Input
            defaultValue={filters.q ?? ""}
            name="q"
            placeholder="Search users, linked profiles, or Discord IDs"
          />
          <select className={fieldClassName} defaultValue={filters.state ?? ""} name="state">
            <option value="">All user states</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <Button type="submit" variant="outline">
            Apply
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export async function AdministrationUsersRealPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const stateFilterRaw = getSearchParamValue(resolvedSearchParams, "state");
  const stateFilter: "active" | "inactive" | "" =
    stateFilterRaw === "active" || stateFilterRaw === "inactive" ? stateFilterRaw : "";
  const filters = {
    q: getSearchParamValue(resolvedSearchParams, "q"),
    state: stateFilter,
  };
  const selectedUserId = getSearchParamValue(resolvedSearchParams, "user");
  const message = getSearchParamValue(resolvedSearchParams, "message");
  const error = getSearchParamValue(resolvedSearchParams, "error");
  const [usersData, referenceData, selectedUser, currentUser] = await Promise.all([
    listAdministrationUsers(filters),
    getAdministrationReferenceData({ includePermissions: false }),
    selectedUserId ? getAdministrationUserDetail(selectedUserId) : Promise.resolve(null),
    getCurrentUser(),
  ]);
  const canManageUsers = currentUser ? can(currentUser, "admin.users.manage") : false;
  const canViewRoles = currentUser ? can(currentUser, "admin.roles.view") : false;
  const closeHref = buildHref("/administration/users", resolvedSearchParams, {
    error: undefined,
    message: undefined,
    user: undefined,
  });
  const activeUsers = usersData.users.filter((user) => user.isActive);
  const inactiveUsers = usersData.users.filter((user) => !user.isActive);
  const linkedProfiles = usersData.users.filter((user) => user.linkedProfileLabel !== null);
  const scopedAssignments = usersData.users.filter((user) => user.unitLabel !== null);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={["Administration", "Users"]}
        description="Review portal users, linked profiles, current role coverage, and effective access without leaving the administration workspace."
        title="Users"
      />
      {message ? <FlashNotice message={message} tone="success" /> : null}
      {error ? <FlashNotice message={error} tone="danger" /> : null}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardWidget
          description="Portal users currently marked active."
          title="Active Users"
          tone="success"
          value={String(activeUsers.length)}
        />
        <KpiCard
          hint="Accounts deactivated but still retained for audit history."
          label="Inactive"
          tone="warning"
          value={String(inactiveUsers.length)}
        />
        <KpiCard
          hint="Users already linked to a member profile."
          label="Linked Profiles"
          tone="info"
          value={String(linkedProfiles.length)}
        />
        <KpiCard
          hint="Users whose profile currently resolves to a unit context."
          label="Unit Context"
          tone="muted"
          value={String(scopedAssignments.length)}
        />
      </section>
      <CollapsibleSection
        defaultOpen={Boolean(filters.q || filters.state)}
        description="Advanced user filters are tucked away until an admin needs to narrow the list."
        title="Advanced filters"
      >
        <UserFiltersCard filters={filters} />
      </CollapsibleSection>
      <Card className="border-border/80 bg-card/88">
        <CardHeader>
          <CardTitle>User administration</CardTitle>
          <CardDescription>
            Inspect effective access, manage assignments, and deactivate users without navigating away from the list.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usersData.users.length === 0 ? (
            <EmptyState
              description="No users matched the current filters."
              title="No users found"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Linked Profile</TableHead>
                  <TableHead className="hidden xl:table-cell">Roles</TableHead>
                  <TableHead>Access</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden xl:table-cell">Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersData.users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">{user.displayName}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.email ?? "No email"}{user.discordId ? ` / Discord ${user.discordId}` : ""}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p>{user.linkedProfileLabel ?? "Not linked"}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.unitLabel ?? "No unit context"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <div className="flex flex-wrap gap-2">
                        {user.roleLabels.length > 0 ? (
                          user.roleLabels.slice(0, 3).map((roleLabel) => (
                            <StatusBadge key={roleLabel} label={roleLabel} tone="info" />
                          ))
                        ) : (
                          <StatusBadge label="No active roles" tone="muted" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-foreground">
                        {user.effectivePermissionCount} permission
                        {user.effectivePermissionCount === 1 ? "" : "s"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        label={user.isActive ? "Active" : "Inactive"}
                        tone={user.isActive ? "success" : "warning"}
                      />
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">{user.createdAtLabel}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link
                          href={buildHref("/administration/users", resolvedSearchParams, {
                            user: user.id,
                          })}
                        >
                          Inspect
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <AdministrationInspectorDrawer
        closeHref={closeHref}
        open={Boolean(selectedUser)}
        sections={[
          {
            title: "Summary",
            description: "Keep identity, linked profile state, and activation status in one compact admin surface.",
            items: selectedUser
              ? [
                  `Linked profile: ${selectedUser.linkedProfileLabel ?? "Not linked"}`,
                  `Current unit: ${selectedUser.currentUnitLabel ?? "Not assigned"}`,
                  `Current position: ${selectedUser.currentPositionLabel ?? "Not assigned"}`,
                ]
              : ["No user selected."],
          },
          {
            title: "Roles",
            description: "Role assignments can be added or ended in place, including optional unit scope.",
            items: selectedUser && selectedUser.assignedRoles.length > 0
              ? selectedUser.assignedRoles.map((assignment) => `${assignment.roleLabel} / ${assignment.scopeLabel}`)
              : ["No role assignments recorded yet."],
          },
          {
            title: "Access",
            description: "Effective permissions are calculated from active assignments instead of role-name shortcuts.",
            items: selectedUser && selectedUser.effectivePermissionKeys.length > 0
              ? [
                  `${selectedUser.effectivePermissionKeys.length} effective permission keys currently resolve.`,
                  `Active assignments: ${selectedUser.auditSummary.activeAssignments}`,
                ]
              : ["No effective permissions are currently granted."],
          },
        ]}
        statusBadge={
          selectedUser
            ? {
                label: selectedUser.isActive ? "Active" : "Inactive",
                tone: selectedUser.isActive ? "success" : "warning",
              }
            : undefined
        }
        subtitle="Inspect user state, assign scoped roles, and review effective permissions without losing list context."
        tabs={["Summary", "Roles", "Access"]}
        title={selectedUser?.displayName ?? "User inspector"}
      >
        {selectedUser ? (
          <div className="space-y-6">
            <Card className="border-border/70 bg-background/55">
              <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
                <div>
                  <p className={labelClassName}>Email</p>
                  <p className="mt-1 text-sm text-foreground">{selectedUser.email ?? "No email recorded"}</p>
                </div>
                <div>
                  <p className={labelClassName}>Discord ID</p>
                  <p className="mt-1 text-sm text-foreground">{selectedUser.discordId ?? "Not linked"}</p>
                </div>
                <div>
                  <p className={labelClassName}>Profile status</p>
                  <p className="mt-1 text-sm text-foreground">{selectedUser.profileStatusLabel ?? "No member profile"}</p>
                </div>
                <div>
                  <p className={labelClassName}>Created</p>
                  <p className="mt-1 text-sm text-foreground">{selectedUser.createdAtLabel}</p>
                </div>
              </CardContent>
            </Card>

            {selectedUser.linkedProfileId ? (
              <div className="flex flex-wrap gap-3">
                <Button asChild variant="outline">
                  <Link href={`/personnel/members/${selectedUser.linkedProfileId}`}>
                    Open linked profile
                  </Link>
                </Button>
              </div>
            ) : null}

            <Card className="border-border/70 bg-card/82">
              <CardHeader>
                <CardTitle>Assigned roles</CardTitle>
                <CardDescription>
                  Unit scope is optional and affects how permissions resolve for that assignment.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedUser.assignedRoles.length === 0 ? (
                  <EmptyState
                    description="This user does not currently have any role assignments."
                    title="No assigned roles"
                  />
                ) : (
                  selectedUser.assignedRoles.map((assignment) => (
                    <div key={assignment.id} className="rounded-2xl border border-border/70 bg-background/45 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-1">
                          <p className="font-semibold text-foreground">{assignment.roleLabel}</p>
                          <p className="text-sm text-muted-foreground">
                            Scope {assignment.scopeLabel}
                            {assignment.startsAtLabel ? ` / Starts ${assignment.startsAtLabel}` : ""}
                            {assignment.endsAtLabel ? ` / Ends ${assignment.endsAtLabel}` : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge
                            label={assignment.isActive ? "Assignment Active" : "Assignment Ended"}
                            tone={assignment.isActive ? "success" : "warning"}
                          />
                          <StatusBadge
                            label={assignment.roleIsActive ? "Role Enabled" : "Role Disabled"}
                            tone={assignment.roleIsActive ? "info" : "danger"}
                          />
                        </div>
                      </div>
                      {canManageUsers ? (
                        <form action={removeRoleFromUserAction} className="mt-4 space-y-3">
                          <input name="returnTo" type="hidden" value={buildHref("/administration/users", resolvedSearchParams, { user: selectedUser.id })} />
                          <input name="userRoleId" type="hidden" value={assignment.id} />
                          <label className="flex items-center gap-2 text-sm text-muted-foreground">
                            <input className="h-4 w-4 rounded border border-border bg-input" name="confirmRemove" type="checkbox" />
                            Confirm role removal
                          </label>
                          <textarea className={textareaClassName} name="reason" placeholder="Optional audit note for removing this role assignment" />
                          <Button size="sm" type="submit" variant="outline">
                            Remove assignment
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/82">
              <CardHeader>
                <CardTitle>Assign role</CardTitle>
                <CardDescription>
                  Assign an active role globally or scope it to a specific unit.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {canManageUsers && canViewRoles ? (
                  <form action={assignRoleToUserAction} className="grid gap-4">
                    <input name="returnTo" type="hidden" value={buildHref("/administration/users", resolvedSearchParams, { user: selectedUser.id })} />
                    <input name="userId" type="hidden" value={selectedUser.id} />
                    <label className="space-y-2">
                      <span className={labelClassName}>Role</span>
                      <select className={fieldClassName} defaultValue="" name="roleId">
                        <option value="">Select role</option>
                        {referenceData.activeRoles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.label}{role.isSystem ? " - System" : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className={labelClassName}>Unit scope</span>
                      <select className={fieldClassName} defaultValue="" name="unitId">
                        <option value="">Global</option>
                        {referenceData.units.map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            {unit.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className={labelClassName}>Reason</span>
                      <textarea className={textareaClassName} name="reason" placeholder="Optional audit note for this assignment" />
                    </label>
                    <Button type="submit">Assign role</Button>
                  </form>
                ) : (
                  <EmptyState
                    description="This user can be inspected, but changing assignments requires `admin.users.manage` and `admin.roles.view`."
                    title="Role assignment unavailable"
                  />
                )}
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/82">
              <CardHeader>
                <CardTitle>Effective permissions</CardTitle>
                <CardDescription>
                  Calculated from active role assignments and shown with scope labels where applicable.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedUser.effectivePermissionGroups.length === 0 ? (
                  <EmptyState
                    description="No active role assignments currently grant permissions."
                    title="No effective permissions"
                  />
                ) : (
                  selectedUser.effectivePermissionGroups.map((group) => (
                    <div key={group.module} className="rounded-2xl border border-border/70 bg-background/45 p-4">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {group.moduleLabel}
                      </h3>
                      <div className="mt-4 grid gap-3">
                        {group.permissions.map((permission) => (
                          <div key={permission.key} className="rounded-xl border border-border/60 bg-card/70 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="font-semibold text-foreground">{permission.label}</p>
                                <p className="text-sm text-muted-foreground">{permission.key}</p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {(permission.scopes ?? []).map((scope) => (
                                  <StatusBadge key={`${permission.key}-${scope}`} label={scope} tone={scope === "Global" ? "success" : "info"} />
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/82">
              <CardHeader>
                <CardTitle>User state</CardTitle>
                <CardDescription>
                  Deactivate users instead of deleting them so access can be revoked without losing audit history.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {canManageUsers ? (
                  <form action={setUserActiveStateAction} className="space-y-4">
                    <input name="returnTo" type="hidden" value={buildHref("/administration/users", resolvedSearchParams, { user: selectedUser.id })} />
                    <input name="userId" type="hidden" value={selectedUser.id} />
                    <input
                      name="nextState"
                      type="hidden"
                      value={selectedUser.isActive ? "inactive" : "active"}
                    />
                    {selectedUser.isActive ? (
                      <label className="flex items-center gap-2 text-sm text-muted-foreground">
                        <input className="h-4 w-4 rounded border border-border bg-input" name="confirmDeactivate" type="checkbox" />
                        Confirm deactivation
                      </label>
                    ) : null}
                    <label className="space-y-2">
                      <span className={labelClassName}>Reason</span>
                      <textarea className={textareaClassName} name="reason" placeholder="Optional audit note for this state change" />
                    </label>
                    <Button type="submit" variant={selectedUser.isActive ? "outline" : "default"}>
                      {selectedUser.isActive ? "Deactivate user" : "Reactivate user"}
                    </Button>
                  </form>
                ) : (
                  <EmptyState
                    description="Activation changes require `admin.users.manage`."
                    title="User state is read only"
                  />
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </AdministrationInspectorDrawer>
    </div>
  );
}
