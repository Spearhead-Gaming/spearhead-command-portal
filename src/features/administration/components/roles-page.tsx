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
  createAdministrationRoleAction,
  disableAdministrationRoleAction,
  editAdministrationRoleAction,
  updateRolePermissionsAction,
} from "@/server/administration/actions";
import {
  getAdministrationReferenceData,
  getAdministrationRoleDetail,
  getAdministrationCriticalPermissionKeys,
  listAdministrationRoles,
} from "@/server/administration";
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

function RoleFiltersCard({
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
        <CardTitle>Role filters</CardTitle>
        <CardDescription>
          Search by role label, key, description, or disabled state.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action="/administration/roles" className="grid gap-4 md:grid-cols-[minmax(0,1fr)_14rem_auto]" method="get">
          <Input
            defaultValue={filters.q ?? ""}
            name="q"
            placeholder="Search roles or descriptions"
          />
          <select className={fieldClassName} defaultValue={filters.state ?? ""} name="state">
            <option value="">All role states</option>
            <option value="active">Active</option>
            <option value="inactive">Disabled</option>
          </select>
          <Button type="submit" variant="outline">
            Apply
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function CreateRoleForm({
  returnTo,
}: {
  returnTo: string;
}) {
  return (
    <Card className="border-border/80 bg-card/88">
      <CardHeader>
        <CardTitle>Create role</CardTitle>
        <CardDescription>
          Create an admin-defined role, then assign system permissions from the role drawer.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={createAdministrationRoleAction} className="grid gap-4">
          <input name="returnTo" type="hidden" value={returnTo} />
          <label className="space-y-2">
            <span className={labelClassName}>Role label</span>
            <Input name="label" placeholder="Reaper Staff Support" />
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Role key</span>
            <Input name="name" placeholder="reaper-staff-support" />
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Description</span>
            <textarea className={textareaClassName} name="description" placeholder="Explain the purpose of this role and who should receive it." />
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Reason</span>
            <textarea className={textareaClassName} name="reason" placeholder="Optional audit note for creating this role." />
          </label>
          <Button type="submit">Create role</Button>
        </form>
      </CardContent>
    </Card>
  );
}

export async function AdministrationRolesRealPage({
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
  const selectedRoleId = getSearchParamValue(resolvedSearchParams, "role");
  const panel = getSearchParamValue(resolvedSearchParams, "panel");
  const message = getSearchParamValue(resolvedSearchParams, "message");
  const error = getSearchParamValue(resolvedSearchParams, "error");
  const [rolesData, referenceData, selectedRole, currentUser, criticalPermissionKeys] = await Promise.all([
    listAdministrationRoles(filters),
    getAdministrationReferenceData({ includePermissions: true }),
    selectedRoleId ? getAdministrationRoleDetail(selectedRoleId) : Promise.resolve(null),
    getCurrentUser(),
    getAdministrationCriticalPermissionKeys(),
  ]);
  const canCreateRoles = currentUser ? can(currentUser, "admin.roles.create") : false;
  const canEditRoles = currentUser ? can(currentUser, "admin.roles.edit") : false;
  const canDisableRoles = currentUser ? can(currentUser, "admin.roles.delete") : false;
  const canViewPermissions = currentUser ? can(currentUser, "admin.permissions.view") : false;
  const canAssignPermissions = currentUser ? can(currentUser, "admin.permissions.assign") : false;
  const closeHref = buildHref("/administration/roles", resolvedSearchParams, {
    error: undefined,
    message: undefined,
    role: undefined,
  });
  const activeRoles = rolesData.roles.filter((role) => role.isActive);
  const disabledRoles = rolesData.roles.filter((role) => !role.isActive);
  const systemRoles = rolesData.roles.filter((role) => role.isSystem);
  const assignedRoles = rolesData.roles.filter((role) => role.activeAssignmentCount > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={["Administration", "Roles & Permissions"]}
        description="Create roles, assign system-defined permissions, review effective access, and retire roles without deleting audit history."
        title="Roles & Permissions"
      />
      {message ? <FlashNotice message={message} tone="success" /> : null}
      {error ? <FlashNotice message={error} tone="danger" /> : null}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardWidget
          description="Roles currently available for assignment."
          title="Active Roles"
          tone="success"
          value={String(activeRoles.length)}
        />
        <KpiCard
          hint="Roles preserved for history but currently unavailable for new grants."
          label="Disabled Roles"
          tone="warning"
          value={String(disabledRoles.length)}
        />
        <KpiCard
          hint="Seeded baseline roles retained in the access model."
          label="System Roles"
          tone="info"
          value={String(systemRoles.length)}
        />
        <KpiCard
          hint="Roles that currently back at least one active assignment."
          label="Roles In Use"
          tone="muted"
          value={String(assignedRoles.length)}
        />
      </section>
      <Card className="border-border/80 bg-card/72">
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Role builder</p>
            <p className="text-sm text-muted-foreground">
              Permissions remain system-defined. Roles stay admin-controlled, auditable, and scope-aware.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {canCreateRoles ? (
              <Button asChild>
                <Link href={buildHref("/administration/roles", resolvedSearchParams, { panel: "create" })}>
                  Create role
                </Link>
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
      {panel === "create" && canCreateRoles ? (
        <CreateRoleForm
          returnTo={buildHref("/administration/roles", resolvedSearchParams, {
            error: undefined,
            message: undefined,
            panel: "create",
          })}
        />
      ) : null}
      <CollapsibleSection
        defaultOpen={Boolean(filters.q || filters.state)}
        description="Role filters stay available without taking over the role builder workspace."
        title="Advanced filters"
      >
        <RoleFiltersCard filters={filters} />
      </CollapsibleSection>
      <Card className="border-border/80 bg-card/88">
        <CardHeader>
          <CardTitle>Role catalog</CardTitle>
          <CardDescription>
            Open a role to edit metadata, review assignments, and manage permissions by module.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rolesData.roles.length === 0 ? (
            <EmptyState
              description="No roles matched the current filters."
              title="No roles found"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead className="hidden xl:table-cell">Assignments</TableHead>
                  <TableHead className="hidden xl:table-cell">Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rolesData.roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">{role.label}</p>
                        <p className="text-xs text-muted-foreground">{role.name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge
                          label={role.isActive ? "Active" : "Disabled"}
                          tone={role.isActive ? "success" : "warning"}
                        />
                        {role.isSystem ? <StatusBadge label="System" tone="info" /> : <StatusBadge label="Custom" tone="muted" />}
                      </div>
                    </TableCell>
                    <TableCell>{role.permissionCount}</TableCell>
                    <TableCell className="hidden xl:table-cell">{role.activeAssignmentCount}</TableCell>
                    <TableCell className="hidden xl:table-cell">{role.updatedAtLabel}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link
                          href={buildHref("/administration/roles", resolvedSearchParams, {
                            role: role.id,
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
        open={Boolean(selectedRole)}
        sections={[
          {
            title: "Summary",
            description: "Role metadata, state, and usage stay attached to the role list instead of requiring a page transition.",
            items: selectedRole
              ? [
                  `Role key: ${selectedRole.name}`,
                  `Assignments: ${selectedRole.assignedUsers.length}`,
                  `Permissions: ${selectedRole.permissionCount}`,
                ]
              : ["No role selected."],
          },
          {
            title: "Permissions",
            description: "Permissions stay system-defined and grouped by module for easier review.",
            items: selectedRole && selectedRole.permissionGroups.length > 0
              ? selectedRole.permissionGroups.map((group) => `${group.moduleLabel} / ${group.permissions.length} permission(s)`)
              : ["No permissions are assigned to this role yet."],
          },
          {
            title: "Assignments",
            description: "Assignments show who currently receives the role and whether the grant is scoped.",
            items: selectedRole && selectedRole.assignedUsers.length > 0
              ? selectedRole.assignedUsers.map((assignment) => `${assignment.userDisplayName} / ${assignment.scopeLabel}`)
              : ["No user assignments currently exist."],
          },
        ]}
        statusBadge={
          selectedRole
            ? {
                label: selectedRole.isActive ? "Enabled" : "Disabled",
                tone: selectedRole.isActive ? "success" : "warning",
              }
            : undefined
        }
        subtitle="Edit role metadata, manage permission groups, and review current assignments without leaving the role catalog."
        tabs={["Summary", "Permissions", "Assignments"]}
        title={selectedRole?.label ?? "Role inspector"}
      >
        {selectedRole ? (
          <div className="space-y-6">
            <Card className="border-border/70 bg-card/82">
              <CardHeader>
                <CardTitle>Role metadata</CardTitle>
                <CardDescription>
                  System roles keep their stable key, while custom roles can update both label and key.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {canEditRoles ? (
                  <form action={editAdministrationRoleAction} className="grid gap-4">
                    <input name="returnTo" type="hidden" value={buildHref("/administration/roles", resolvedSearchParams, { role: selectedRole.id })} />
                    <input name="roleId" type="hidden" value={selectedRole.id} />
                    <label className="space-y-2">
                      <span className={labelClassName}>Role label</span>
                      <Input defaultValue={selectedRole.label} name="label" />
                    </label>
                    <label className="space-y-2">
                      <span className={labelClassName}>Role key</span>
                      <Input
                        defaultValue={selectedRole.name}
                        disabled={selectedRole.isSystem}
                        name="name"
                        placeholder="role-key"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className={labelClassName}>Description</span>
                      <textarea className={textareaClassName} defaultValue={selectedRole.description ?? ""} name="description" />
                    </label>
                    <label className="space-y-2">
                      <span className={labelClassName}>Reason</span>
                      <textarea className={textareaClassName} name="reason" placeholder="Optional audit note for editing this role." />
                    </label>
                    <Button type="submit">Save role</Button>
                  </form>
                ) : (
                  <EmptyState
                    description="Editing role metadata requires `admin.roles.edit`."
                    title="Role metadata is read only"
                  />
                )}
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/82">
              <CardHeader>
                <CardTitle>Permission matrix</CardTitle>
                <CardDescription>
                  Assign only system-defined permissions. Critical admin permissions are highlighted for visibility.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {canViewPermissions ? (
                  canAssignPermissions ? (
                    <form action={updateRolePermissionsAction} className="space-y-6">
                      <input name="returnTo" type="hidden" value={buildHref("/administration/roles", resolvedSearchParams, { role: selectedRole.id })} />
                      <input name="roleId" type="hidden" value={selectedRole.id} />
                      {referenceData.permissionGroups.map((group) => {
                        const assignedKeys = new Set(
                          selectedRole.permissionGroups
                            .find((selectedGroup) => selectedGroup.module === group.module)
                            ?.permissions.map((permission) => permission.key) ?? [],
                        );

                        return (
                          <div key={group.module} className="rounded-2xl border border-border/70 bg-background/45 p-4">
                            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                              {group.moduleLabel}
                            </h3>
                            <div className="mt-4 grid gap-3">
                              {group.permissions.map((permission) => (
                                <label key={permission.id} className="rounded-xl border border-border/60 bg-card/70 p-3">
                                  <div className="flex items-start gap-3">
                                    <input
                                      className="mt-1 h-4 w-4 rounded border border-border bg-input"
                                      defaultChecked={assignedKeys.has(permission.key)}
                                      name="permissionId"
                                      type="checkbox"
                                      value={permission.id}
                                    />
                                    <div className="space-y-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-semibold text-foreground">{permission.label}</p>
                                        {criticalPermissionKeys.some((permissionKey) => permissionKey === permission.key) ? (
                                          <StatusBadge label="Critical admin path" tone="warning" />
                                        ) : null}
                                      </div>
                                      <p className="text-sm text-muted-foreground">{permission.key}</p>
                                      <p className="text-sm text-muted-foreground">{permission.description ?? "No description."}</p>
                                    </div>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      <label className="space-y-2">
                        <span className={labelClassName}>Reason</span>
                        <textarea className={textareaClassName} name="reason" placeholder="Optional audit note for this permission update." />
                      </label>
                      <Button type="submit">Save permission matrix</Button>
                    </form>
                  ) : (
                    <div className="space-y-4">
                      {selectedRole.permissionGroups.length === 0 ? (
                        <EmptyState
                          description="No permissions are currently assigned to this role."
                          title="No role permissions"
                        />
                      ) : (
                        selectedRole.permissionGroups.map((group) => (
                          <div key={group.module} className="rounded-2xl border border-border/70 bg-background/45 p-4">
                            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                              {group.moduleLabel}
                            </h3>
                            <div className="mt-4 flex flex-wrap gap-2">
                              {group.permissions.map((permission) => (
                                <StatusBadge key={permission.key} label={permission.key} tone="info" />
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )
                ) : (
                  <EmptyState
                    description="Viewing the permission catalog requires `admin.permissions.view`."
                    title="Permission matrix unavailable"
                  />
                )}
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/82">
              <CardHeader>
                <CardTitle>Current assignments</CardTitle>
                <CardDescription>
                  User assignments remain visible here so scope and disabled-state impacts are easy to review.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedRole.assignedUsers.length === 0 ? (
                  <EmptyState
                    description="No users currently hold this role."
                    title="No role assignments"
                  />
                ) : (
                  selectedRole.assignedUsers.map((assignment) => (
                    <div key={assignment.id} className="rounded-2xl border border-border/70 bg-background/45 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-1">
                          <p className="font-semibold text-foreground">{assignment.userDisplayName}</p>
                          <p className="text-sm text-muted-foreground">
                            {assignment.userEmail ?? "No email"} / {assignment.linkedProfileLabel ?? "No linked profile"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Scope {assignment.scopeLabel}
                            {assignment.startsAtLabel ? ` / Starts ${assignment.startsAtLabel}` : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge
                            label={assignment.isActive ? "Assignment Active" : "Assignment Ended"}
                            tone={assignment.isActive ? "success" : "warning"}
                          />
                          <StatusBadge
                            label={assignment.isUserActive ? "User Active" : "User Inactive"}
                            tone={assignment.isUserActive ? "info" : "danger"}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/82">
              <CardHeader>
                <CardTitle>Disable role</CardTitle>
                <CardDescription>
                  Roles are disabled instead of deleted so assignment history and audits stay intact.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {canDisableRoles ? (
                  selectedRole.isActive ? (
                    <form action={disableAdministrationRoleAction} className="space-y-4">
                      <input name="returnTo" type="hidden" value={buildHref("/administration/roles", resolvedSearchParams, { role: selectedRole.id })} />
                      <input name="roleId" type="hidden" value={selectedRole.id} />
                      <label className="flex items-center gap-2 text-sm text-muted-foreground">
                        <input className="h-4 w-4 rounded border border-border bg-input" name="confirmDisable" type="checkbox" />
                        Confirm role disable
                      </label>
                      <label className="space-y-2">
                        <span className={labelClassName}>Reason</span>
                        <textarea className={textareaClassName} name="reason" placeholder="Optional audit note for disabling this role." />
                      </label>
                      <Button type="submit" variant="outline">Disable role</Button>
                    </form>
                  ) : (
                    <EmptyState
                      description="This role is already disabled and no longer appears in new-assignment selectors."
                      title="Role already disabled"
                    />
                  )
                ) : (
                  <EmptyState
                    description="Disabling roles requires `admin.roles.delete`."
                    title="Role disable unavailable"
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
