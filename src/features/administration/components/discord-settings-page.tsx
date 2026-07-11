import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { DashboardWidget } from "@/components/dashboard/dashboard-widget";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { FilterBar } from "@/components/data/filter-bar";
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
import { requirePermission } from "@/server/permissions/access";
import {
  disableDiscordChannelMappingAction,
  disableDiscordRoleMappingAction,
  kickDiscordMemberAction,
  mergeDiscordIdentityDuplicateAction,
  previewDiscordRoleSyncAction,
  requestDiscordTestDeliveryAction,
  runDiscordMemberSyncAction,
  runDiscordRoleSyncAction,
  saveDiscordChannelMappingAction,
  saveDiscordRoleMappingAction,
  saveDiscordServerMappingAction,
} from "@/server/discord/actions";
import { getDiscordAdministrationOverview } from "@/server/discord/queries";
import {
  discordChannelMappingCatalog,
  discordRoleMappingTypeCatalog,
} from "@/server/discord/constants";
import {
  discordSlashCommandCatalog,
  getDiscordCommandRegistrationPlan,
} from "@/server/discord/commands/catalog";

function getStatusTone(status: string) {
  switch (status) {
    case "sent":
    case "present":
    case "completed":
    case "succeeded":
      return "success";
    case "failed":
    case "left":
      return "danger";
    case "pending":
    case "running":
    case "requested":
      return "info";
    case "retrying":
      return "warning";
    default:
      return "muted";
  }
}

function getRoleMappingTypeLabel(value: string) {
  switch (value) {
    case "unit":
      return "Unit";
    case "qualification":
      return "Qualification";
    case "portal_role":
      return "Portal Role";
    case "rank":
      return "Rank";
    default:
      return value;
  }
}

function getMemberSyncPolicyLabel(value: string) {
  switch (value) {
    case "primary_create_secondary_link":
      return "Primary creates, secondary links";
    case "create_profiles":
      return "Create profiles";
    case "link_only":
      return "Link only";
    case "disabled":
      return "Disabled";
    default:
      return value;
  }
}

function CheckboxField(props: {
  defaultChecked?: boolean;
  label: string;
  name: string;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      <input
        className="h-4 w-4 rounded border border-border bg-input text-primary"
        defaultChecked={props.defaultChecked}
        name={props.name}
        type="checkbox"
      />
      <span>{props.label}</span>
    </label>
  );
}

export async function DiscordSettingsPage() {
  const user = await requirePermission("discord.view");

  const overview = await getDiscordAdministrationOverview(user);
  const commandPlan = getDiscordCommandRegistrationPlan();

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={["Administration", "Discord Settings"]}
        description="Manage Discord server and channel routing foundations, secure interaction entry points, and placeholder delivery tracking without treating Discord as the source of truth."
        title="Discord Settings"
      />

      <Card className="border-border/70 bg-card/78">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label="Epic 6 Phase 1" tone="info" />
            <StatusBadge
              label={overview.botHealth.statusLabel}
              tone={overview.botHealth.summaryTone}
            />
            <StatusBadge
              label={
                overview.botHealth.commandRegistrationMode === "guild"
                  ? "Guild Registration Preview"
                  : "Global Registration Preview"
              }
              tone="muted"
            />
          </div>
          <div className="space-y-2">
            <CardTitle>Discord integration foundation</CardTitle>
            <CardDescription className="max-w-4xl text-sm leading-7">
              This workspace keeps Discord channel routing, slash-command structure, interaction
              validation, managed role-sync preview, and delivery tracking inside the portal
              boundary. The portal remains authoritative while Discord automation stays explicit,
              auditable, and permission-aware.
            </CardDescription>
          </div>
          <FilterBar
            filters={["Multi-server", "Scoped routing", "Role sync preview", "Slash commands"]}
            supports={[
              "Portal permissions authoritative",
              "Fallback to global mapping",
              "Failed deliveries visible",
            ]}
          />
        </CardHeader>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardWidget
          description="Discord server records mapped to portal units or held globally."
          title="Connected Servers"
          tone="info"
          value={String(overview.servers.length).padStart(2, "0")}
        />
        <KpiCard
          hint="Active channel routing records available for placeholder delivery."
          label="Active Mappings"
          tone="success"
          value={String(overview.channelMappings.filter((mapping) => mapping.isActive).length)}
        />
        <KpiCard
          hint="Latest Discord-channel delivery records that landed in a final failed state."
          label="Failed Deliveries"
          tone={overview.failedDeliveryCount > 0 ? "danger" : "muted"}
          value={String(overview.failedDeliveryCount)}
        />
        <KpiCard
          hint="Guild member states imported or refreshed through Discord sync."
          label="Synced Members"
          tone={overview.guildMembers.length > 0 ? "success" : "muted"}
          value={String(overview.guildMembers.length)}
        />
      </section>

      {overview.gatewayHealth ? (
        <Card className="border-border/70 bg-card/78">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge
                label={`Gateway ${overview.gatewayHealth.status}`}
                tone={
                  overview.gatewayHealth.status === "connected"
                    ? "success"
                    : overview.gatewayHealth.status === "disabled"
                      ? "muted"
                      : overview.gatewayHealth.status === "failed"
                        ? "danger"
                        : "warning"
                }
              />
              <StatusBadge
                label={overview.gatewayHealth.enabled ? "Enabled" : "Disabled"}
                tone={overview.gatewayHealth.enabled ? "info" : "muted"}
              />
              <StatusBadge
                label={`${overview.gatewayHealth.eventHandlers.filter((handler) => handler.enabled).length} handlers`}
                tone="info"
              />
            </div>
            <CardTitle>Gateway health</CardTitle>
            <CardDescription>
              Real-time Gateway events supplement OAuth, REST, and interaction webhooks. The web
              app remains functional when this worker is offline.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                hint="Current Gateway socket latency when connected."
                label="Latency"
                tone={overview.gatewayHealth.latencyMs === null ? "muted" : "success"}
                value={overview.gatewayHealth.latencyMs === null ? "N/A" : `${overview.gatewayHealth.latencyMs}ms`}
              />
              <KpiCard
                hint="Guilds visible to the Gateway worker."
                label="Guild Count"
                tone={overview.gatewayHealth.guildCount > 0 ? "success" : "muted"}
                value={String(overview.gatewayHealth.guildCount)}
              />
              <KpiCard
                hint="Recorded reconnect attempts."
                label="Reconnects"
                tone={overview.gatewayHealth.reconnectCount > 5 ? "warning" : "info"}
                value={String(overview.gatewayHealth.reconnectCount)}
              />
              <KpiCard
                hint="Sanitized Gateway session marker."
                label="Session"
                tone={overview.gatewayHealth.sessionId ? "info" : "muted"}
                value={overview.gatewayHealth.sessionId ?? "None"}
              />
            </div>
            <div className="grid gap-4 xl:grid-cols-3">
              <div className="rounded-2xl border border-border/70 bg-background/35 p-4">
                <h3 className="text-sm font-semibold text-foreground">Runtime separation</h3>
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <p>Web: <code>npm run dev</code></p>
                  <p>Gateway worker: <code>npm run dev:gateway</code></p>
                  <p>Command registration: <code>npm run discord:commands:register</code></p>
                  <p>Health script: <code>npm run discord:health</code></p>
                </div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/35 p-4">
                <h3 className="text-sm font-semibold text-foreground">Enabled intents</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {overview.gatewayHealth.enabledIntents.map((intent) => (
                    <StatusBadge key={intent} label={intent} tone="muted" />
                  ))}
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Message Content is not required for attachment continuation and should remain
                  disabled unless a documented workflow explicitly needs it.
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/35 p-4">
                <h3 className="text-sm font-semibold text-foreground">Recent timestamps</h3>
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <p>Connected: {overview.gatewayHealth.lastConnectedAtLabel ?? "Not recorded"}</p>
                  <p>Disconnected: {overview.gatewayHealth.lastDisconnectedAtLabel ?? "Not recorded"}</p>
                  <p>Last event: {overview.gatewayHealth.lastEventAtLabel ?? "Not recorded"}</p>
                  <p>Bot: {overview.gatewayHealth.botUsername ?? "Unknown"}</p>
                </div>
              </div>
            </div>
            {overview.gatewayHealth.lastErrorSummary ? (
              <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
                {overview.gatewayHealth.lastErrorSummary}
              </div>
            ) : null}
            {overview.gatewayHealth.recommendations.length > 0 ? (
              <div className="rounded-2xl border border-border/70 bg-background/35 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Gateway recommendations
                </h3>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {overview.gatewayHealth.recommendations.map((recommendation) => (
                    <div
                      className="rounded-xl border border-border/70 bg-card/55 p-3"
                      key={recommendation.id}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          {recommendation.title}
                        </p>
                        <StatusBadge label={recommendation.priority} tone="info" />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {recommendation.action}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Gateway event handlers
                </h3>
                {overview.gatewayHealth.eventHandlers.map((handler) => (
                  <div key={handler.handlerId} className="rounded-xl border border-border/70 bg-background/35 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-foreground">{handler.eventName}</p>
                      <StatusBadge label={handler.enabled ? "Enabled" : "Disabled"} tone={handler.enabled ? "success" : "muted"} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{handler.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {handler.owningDomain} / {handler.requiredIntents.join(", ") || "No intent"}
                    </p>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Recent Gateway events
                </h3>
                {overview.gatewayHealth.recentEvents.length === 0 ? (
                  <EmptyState
                    description="Gateway events will appear after the worker connects and receives real-time Discord events."
                    title="No Gateway events yet"
                  />
                ) : (
                  overview.gatewayHealth.recentEvents.map((event) => (
                    <div key={event.id} className="rounded-xl border border-border/70 bg-background/35 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-foreground">{event.eventName}</p>
                        <StatusBadge label={event.status} tone={getStatusTone(event.status)} />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{event.summary}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{event.occurredAtLabel}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.95fr)]">
        <div className="space-y-6">
          {overview.canViewBotHealth ? (
            <Card className="border-border/70 bg-card/78">
              <CardHeader>
                <CardTitle>Bot health placeholder</CardTitle>
                <CardDescription>
                  These checks reflect environment readiness for secure interaction handling and
                  future slash-command registration.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-background/35 p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <StatusBadge
                      label={
                        overview.botHealth.oauthConfigured ? "OAuth Ready" : "OAuth Pending"
                      }
                      tone={overview.botHealth.oauthConfigured ? "success" : "warning"}
                    />
                    <StatusBadge
                      label={
                        overview.botHealth.interactionValidationReady
                          ? "Signature Validation Ready"
                          : "Validation Pending"
                      }
                      tone={
                        overview.botHealth.interactionValidationReady ? "success" : "warning"
                      }
                    />
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Public-key validation is required on the interaction route. The portal will not
                    bypass that check when credentials are missing.
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/35 p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <StatusBadge
                      label={
                        overview.botHealth.commandRegistrationReady
                          ? "Registration Ready"
                          : "Registration Pending"
                      }
                      tone={overview.botHealth.commandRegistrationReady ? "success" : "warning"}
                    />
                    <StatusBadge
                      label={
                        overview.botHealth.commandRegistrationMode === "guild"
                          ? "Guild Scoped"
                          : "Global Scoped"
                      }
                      tone="muted"
                    />
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Registration preview includes {commandPlan.commandCount} slash commands and will
                    target {commandPlan.mode === "guild" ? "a development guild" : "the global application"}
                    {" "}once live bot automation is enabled.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {overview.canViewBotHealth ? (
            <Card className="border-border/70 bg-card/78">
              <CardHeader>
                <CardTitle>Interaction sessions</CardTitle>
                <CardDescription>
                  Multi-step Discord workflows use short-lived portal sessions for modals,
                  confirmations, and future upload continuations.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <KpiCard
                    hint="Currently active command/modal continuations."
                    label="Active"
                    tone={overview.interactionSessions.activeCount > 0 ? "info" : "muted"}
                    value={String(overview.interactionSessions.activeCount)}
                  />
                  <KpiCard
                    hint="Sessions safely expired before completion."
                    label="Expired"
                    tone={overview.interactionSessions.expiredCount > 0 ? "warning" : "muted"}
                    value={String(overview.interactionSessions.expiredCount)}
                  />
                  <KpiCard
                    hint="Sessions marked failed by a handler."
                    label="Failed"
                    tone={overview.interactionSessions.failedCount > 0 ? "danger" : "muted"}
                    value={String(overview.interactionSessions.failedCount)}
                  />
                  <KpiCard
                    hint="Default timeout for new sessions."
                    label="TTL"
                    tone="info"
                    value={`${overview.interactionSessions.ttlMinutes}m`}
                  />
                </div>

                {overview.interactionSessions.recentFailed.length === 0 ? (
                  <EmptyState
                    description="Failed Discord interaction sessions will appear here when a future multi-step workflow cannot continue safely."
                    title="No failed sessions"
                  />
                ) : (
                  <div className="space-y-3">
                    {overview.interactionSessions.recentFailed.map((session) => (
                      <div
                        key={session.id}
                        className="rounded-2xl border border-border/70 bg-background/35 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-foreground">
                              {session.workflowType} / {session.currentStep}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              /{session.commandName} - {session.updatedAtLabel}
                            </p>
                          </div>
                          <StatusBadge label="failed" tone="danger" />
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Discord user: {session.discordUserId}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}

          <Card className="border-border/70 bg-card/78">
            <CardHeader>
              <CardTitle>Connected servers</CardTitle>
              <CardDescription>
                Discord servers can map to a specific unit or remain global for community-wide
                routing. Server records are the parent scope for channel mappings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {overview.servers.length === 0 ? (
                <EmptyState
                  description="Create the first Discord server mapping to establish channel-routing scope."
                  title="No Discord servers mapped yet"
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Server</TableHead>
                      <TableHead className="hidden xl:table-cell">Guild ID</TableHead>
                      <TableHead>Unit Scope</TableHead>
                      <TableHead className="hidden xl:table-cell">Mappings</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden xl:table-cell">Updated</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overview.servers.map((server) => (
                      <TableRow key={server.id}>
                        <TableCell className="font-semibold text-foreground">{server.name}</TableCell>
                        <TableCell className="hidden xl:table-cell">{server.guildId}</TableCell>
                        <TableCell>{server.unitName ?? "Global community"}</TableCell>
                        <TableCell className="hidden xl:table-cell">{server.channelMappingCount}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <StatusBadge
                              label={server.isActive ? "Active" : "Inactive"}
                              tone={server.isActive ? "success" : "warning"}
                            />
                            {server.isPrimary ? (
                              <StatusBadge label="Primary" tone="info" />
                            ) : null}
                            <StatusBadge
                              label={server.gatewayEnabled ? "Gateway" : "Gateway off"}
                              tone={server.gatewayEnabled ? "success" : "muted"}
                            />
                            <StatusBadge
                              label={getMemberSyncPolicyLabel(server.memberSyncPolicy)}
                              tone={server.memberSyncPolicy === "disabled" ? "warning" : "info"}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">{server.updatedAtLabel}</TableCell>
                        <TableCell className="align-top">
                          {overview.canManageServers ? (
                            <details className="group w-[18rem]">
                              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                                Edit Mapping
                              </summary>
                              <form
                                action={saveDiscordServerMappingAction}
                                className="mt-3 space-y-3 rounded-2xl border border-border/70 bg-background/40 p-3"
                              >
                                <input name="id" type="hidden" value={server.id} />
                                <Input defaultValue={server.name} name="name" placeholder="Server name" />
                                <Input defaultValue={server.guildId} name="guildId" placeholder="Guild ID" />
                                <select
                                  className="flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                  defaultValue={server.unitId ?? ""}
                                  name="unitId"
                                >
                                  <option value="">Global community</option>
                                  {overview.units.map((unit) => (
                                    <option key={unit.id} value={unit.id}>
                                      {unit.name}
                                    </option>
                                  ))}
                                </select>
                                <div className="flex flex-wrap gap-4">
                                  <CheckboxField
                                    defaultChecked={server.isActive}
                                    label="Active"
                                    name="isActive"
                                  />
                                  <CheckboxField
                                    defaultChecked={server.isPrimary}
                                    label="Primary"
                                    name="isPrimary"
                                  />
                                  <CheckboxField
                                    defaultChecked={server.gatewayEnabled}
                                    label="Gateway"
                                    name="gatewayEnabled"
                                  />
                                  <CheckboxField
                                    defaultChecked={server.voiceAwarenessEnabled}
                                    label="Voice awareness"
                                    name="voiceAwarenessEnabled"
                                  />
                                </div>
                                <select
                                  className="flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                  defaultValue={server.memberSyncPolicy}
                                  name="memberSyncPolicy"
                                >
                                  <option value="primary_create_secondary_link">
                                    Primary creates, secondary links
                                  </option>
                                  <option value="create_profiles">Create profiles</option>
                                  <option value="link_only">Link only</option>
                                  <option value="disabled">Disabled</option>
                                </select>
                                <select
                                  className="flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                  defaultValue={server.roleSyncPolicy}
                                  name="roleSyncPolicy"
                                >
                                  <option value="manual">Manual role sync</option>
                                  <option value="disabled">Role sync disabled</option>
                                </select>
                                <select
                                  className="flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                  defaultValue={server.nicknameSyncPolicy}
                                  name="nicknameSyncPolicy"
                                >
                                  <option value="disabled">Nickname sync disabled</option>
                                  <option value="preview_only">Nickname preview only</option>
                                </select>
                                <Button size="sm" type="submit">
                                  Save Server
                                </Button>
                              </form>
                            </details>
                          ) : (
                            <StatusBadge label="View only" tone="muted" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {overview.canManageServers ? (
                <div className="rounded-2xl border border-border/70 bg-background/35 p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Add server mapping
                  </h3>
                  <form
                    action={saveDiscordServerMappingAction}
                    className="mt-4 grid gap-3 md:grid-cols-2"
                  >
                    <Input name="name" placeholder="Spearhead Command" />
                    <Input name="guildId" placeholder="Discord guild ID" />
                    <select
                      className="flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      defaultValue=""
                      name="unitId"
                    >
                      <option value="">Global community</option>
                      {overview.units.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.name}
                        </option>
                      ))}
                    </select>
                    <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border/70 bg-card/60 px-3 py-2">
                      <CheckboxField defaultChecked label="Active" name="isActive" />
                      <CheckboxField label="Primary" name="isPrimary" />
                      <CheckboxField defaultChecked label="Gateway" name="gatewayEnabled" />
                      <CheckboxField label="Voice awareness" name="voiceAwarenessEnabled" />
                    </div>
                    <select
                      className="flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      defaultValue="primary_create_secondary_link"
                      name="memberSyncPolicy"
                    >
                      <option value="primary_create_secondary_link">
                        Primary creates, secondary links
                      </option>
                      <option value="create_profiles">Create profiles</option>
                      <option value="link_only">Link only</option>
                      <option value="disabled">Disabled</option>
                    </select>
                    <select
                      className="flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      defaultValue="manual"
                      name="roleSyncPolicy"
                    >
                      <option value="manual">Manual role sync</option>
                      <option value="disabled">Role sync disabled</option>
                    </select>
                    <select
                      className="flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      defaultValue="disabled"
                      name="nicknameSyncPolicy"
                    >
                      <option value="disabled">Nickname sync disabled</option>
                      <option value="preview_only">Nickname preview only</option>
                    </select>
                    <div className="md:col-span-2">
                      <Button type="submit">Save Server Mapping</Button>
                    </div>
                  </form>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/78">
            <CardHeader>
              <CardTitle>Guild member sync</CardTitle>
              <CardDescription>
                Discord can refresh identity and presence fields, but portal-owned roster,
                qualification, attendance, and permission data stays untouched.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-3 md:grid-cols-3">
                <KpiCard
                  hint="Recent guild member state rows visible to this operator."
                  label="Tracked"
                  tone="info"
                  value={String(overview.guildMembers.length)}
                />
                <KpiCard
                  hint="Members detected as no longer present in a connected guild."
                  label="Left Server"
                  tone={
                    overview.guildMembers.filter((member) => member.syncStatus === "left").length > 0
                      ? "warning"
                      : "muted"
                  }
                  value={String(
                    overview.guildMembers.filter((member) => member.syncStatus === "left").length,
                  )}
                />
                <KpiCard
                  hint="Most recent sync log entries retained for operator review."
                  label="Sync Logs"
                  tone="muted"
                  value={String(overview.syncLogs.length)}
                />
              </div>

              {overview.identityDiagnostics ? (
                <Card className="border-border/70 bg-background/35">
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <CardTitle>Identity sync</CardTitle>
                        <CardDescription>
                          Discord user ID is canonical. Exact Discord ID duplicates can be merged;
                          display-name matches are warnings only.
                        </CardDescription>
                      </div>
                      <StatusBadge
                        label={`${overview.identityDiagnostics.duplicateDiscordIdentities.length} exact duplicate${overview.identityDiagnostics.duplicateDiscordIdentities.length === 1 ? "" : "s"}`}
                        tone={
                          overview.identityDiagnostics.duplicateDiscordIdentities.length > 0
                            ? "warning"
                            : "success"
                        }
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid gap-3 md:grid-cols-4">
                      <KpiCard
                        hint="Unique active portal users connected by Discord ID, OAuth, member link, or guild state."
                        label="Linked Users"
                        tone={overview.identitySummary.totalDiscordLinkedUsers > 0 ? "success" : "muted"}
                        value={String(overview.identitySummary.totalDiscordLinkedUsers)}
                      />
                      <KpiCard
                        hint="Discord OAuth accounts linked to portal users."
                        label="OAuth Linked"
                        tone={overview.identitySummary.linkedOAuthUserCount > 0 ? "info" : "muted"}
                        value={String(overview.identitySummary.linkedOAuthUserCount)}
                      />
                      <KpiCard
                        hint="Human guild member states imported from Discord sync."
                        label="Imported Humans"
                        tone={overview.identitySummary.importedMemberCount > 0 ? "info" : "muted"}
                        value={String(overview.identitySummary.importedMemberCount)}
                      />
                      <KpiCard
                        hint={
                          overview.identitySummary.botExclusionEnabled
                            ? "Bot accounts are skipped by member sync and counted in logs."
                            : "Bot synchronization is explicitly enabled by environment."
                        }
                        label="Bots Skipped"
                        tone={overview.identitySummary.botExclusionEnabled ? "success" : "warning"}
                        value={String(overview.identitySummary.skippedBotCount)}
                      />
                    </div>
                    <div className="grid gap-3 rounded-2xl border border-border/70 bg-card/45 p-4 text-sm text-muted-foreground md:grid-cols-3">
                      <div>
                        <p className="font-semibold text-foreground">Last sync</p>
                        <p>
                          {overview.identitySummary.lastSyncAtLabel ?? "No sync log yet"}{" "}
                          {overview.identitySummary.lastSyncStatus
                            ? `(${overview.identitySummary.lastSyncStatus})`
                            : ""}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">Local diagnostics</p>
                        <p>
                          Bot token {overview.identitySummary.botTokenPresent ? "present" : "missing"} /{" "}
                          dev guild {overview.identitySummary.devGuildConfigured ? "set" : "not set"}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">Webhook readiness</p>
                        <p>
                          {overview.identitySummary.interactionWebhookReady
                            ? "Public interaction endpoint is ready."
                            : overview.identitySummary.publicInteractionUrlConfigured
                              ? "Interaction URL is configured but not fully production-reachable."
                              : "Interaction URL is not configured."}
                        </p>
                      </div>
                      {overview.identitySummary.lastSyncError ? (
                        <p className="md:col-span-3">
                          Last sync error: {overview.identitySummary.lastSyncError}
                        </p>
                      ) : null}
                    </div>
                    <div className="grid gap-3 md:grid-cols-4">
                      <KpiCard
                        hint="Multiple portal users tied to one Discord user ID."
                        label="Exact Duplicates"
                        tone={
                          overview.identityDiagnostics.duplicateDiscordIdentities.length > 0
                            ? "warning"
                            : "muted"
                        }
                        value={String(overview.identityDiagnostics.duplicateDiscordIdentities.length)}
                      />
                      <KpiCard
                        hint="Guild member rows missing a user or profile link."
                        label="Unlinked Imports"
                        tone={
                          overview.identityDiagnostics.importedButNotLinked.length > 0
                            ? "info"
                            : "muted"
                        }
                        value={String(overview.identityDiagnostics.importedButNotLinked.length)}
                      />
                      <KpiCard
                        hint="Discord OAuth users that need profile creation or repair."
                        label="Users Missing Profiles"
                        tone={
                          overview.identityDiagnostics.loggedInUsersWithoutProfile.length > 0
                            ? "warning"
                            : "muted"
                        }
                        value={String(overview.identityDiagnostics.loggedInUsersWithoutProfile.length)}
                      />
                      <KpiCard
                        hint="Profiles without any Discord identity link."
                        label="Profiles Missing Discord"
                        tone="muted"
                        value={String(overview.identityDiagnostics.profilesWithoutDiscordIdentity.length)}
                      />
                    </div>

                    {overview.identityDiagnostics.duplicateDiscordIdentities.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Discord ID</TableHead>
                            <TableHead>Portal Records</TableHead>
                            <TableHead>Canonical</TableHead>
                            <TableHead>Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {overview.identityDiagnostics.duplicateDiscordIdentities.map((group) => (
                            <TableRow key={group.discordUserId}>
                              <TableCell className="font-mono text-xs">
                                {group.discordUserId}
                              </TableCell>
                              <TableCell>
                                <div className="space-y-2">
                                  {group.users.map((identityUser) => (
                                    <div key={identityUser.id} className="space-y-1">
                                      <p className="font-semibold text-foreground">
                                        {identityUser.displayName}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {identityUser.memberProfileLabel ?? "No profile"} /{" "}
                                        {identityUser.email ?? "No email"}
                                      </p>
                                      <div className="flex flex-wrap gap-1">
                                        {identityUser.sources.map((source) => (
                                          <StatusBadge key={source} label={source} tone="muted" />
                                        ))}
                                        {!identityUser.isActive ? (
                                          <StatusBadge label="Archived" tone="muted" />
                                        ) : null}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {group.suggestedCanonicalUserId ?? "Needs review"}
                              </TableCell>
                              <TableCell>
                                {overview.canMergeIdentities ? (
                                  <form action={mergeDiscordIdentityDuplicateAction}>
                                    <input
                                      name="discordUserId"
                                      type="hidden"
                                      value={group.discordUserId}
                                    />
                                    <Button size="sm" type="submit">
                                      Merge Exact ID
                                    </Button>
                                  </form>
                                ) : (
                                  <StatusBadge label="No merge permission" tone="muted" />
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <EmptyState
                        description="No exact Discord ID duplicate records were found in linked users, OAuth accounts, member links, or guild state."
                        title="Discord identities are converged"
                      />
                    )}

                    <div className="grid gap-4 lg:grid-cols-3">
                      <div className="rounded-2xl border border-border/70 bg-card/50 p-4">
                        <p className="text-sm font-semibold text-foreground">Unlinked imports</p>
                        <div className="mt-3 space-y-2">
                          {overview.identityDiagnostics.importedButNotLinked.slice(0, 4).map((item) => (
                            <div key={item.id} className="text-sm text-muted-foreground">
                              <span className="text-foreground">{item.displayName}</span> on{" "}
                              {item.serverName}
                            </div>
                          ))}
                          {overview.identityDiagnostics.importedButNotLinked.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No unlinked imports.</p>
                          ) : null}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-border/70 bg-card/50 p-4">
                        <p className="text-sm font-semibold text-foreground">Users without profiles</p>
                        <div className="mt-3 space-y-2">
                          {overview.identityDiagnostics.loggedInUsersWithoutProfile.slice(0, 4).map((item) => (
                            <div key={item.id} className="text-sm text-muted-foreground">
                              <span className="text-foreground">{item.displayName}</span> /{" "}
                              {item.discordUserId}
                            </div>
                          ))}
                          {overview.identityDiagnostics.loggedInUsersWithoutProfile.length === 0 ? (
                            <p className="text-sm text-muted-foreground">All logged-in Discord users have profiles.</p>
                          ) : null}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-border/70 bg-card/50 p-4">
                        <p className="text-sm font-semibold text-foreground">Name match warnings</p>
                        <div className="mt-3 space-y-2">
                          {overview.identityDiagnostics.likelyDisplayNameDuplicates.slice(0, 4).map((item) => (
                            <div key={item.displayName} className="text-sm text-muted-foreground">
                              <span className="text-foreground">{item.displayName}</span> appears on{" "}
                              {item.profiles.length} profiles
                            </div>
                          ))}
                          {overview.identityDiagnostics.likelyDisplayNameDuplicates.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No repeated display names found.</p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {overview.canRunMemberSync ? (
                <form
                  action={runDiscordMemberSyncAction}
                  className="grid gap-3 rounded-2xl border border-border/70 bg-background/35 p-4 md:grid-cols-[minmax(0,1fr)_auto]"
                >
                  <select
                    className="flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    defaultValue={overview.servers.find((server) => server.isPrimary)?.id ?? overview.servers[0]?.id ?? ""}
                    name="discordServerId"
                  >
                    <option value="">Select server</option>
                    {overview.servers.map((server) => (
                      <option key={server.id} value={server.id}>
                        {server.name}
                      </option>
                    ))}
                  </select>
                  <Button type="submit">Run Member Sync Now</Button>
                </form>
              ) : null}

              {overview.canViewMembers ? (
                overview.guildMembers.length === 0 ? (
                  <EmptyState
                    description="Run member sync after the bot has Guild Members intent and token access, or wait for the future Discord worker to report join/update events."
                    title="No guild member states yet"
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Server</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Profile Link</TableHead>
                        <TableHead>Last Sync</TableHead>
                        <TableHead>Moderation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {overview.guildMembers.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-semibold text-foreground">{member.displayName}</p>
                              <p className="text-xs text-muted-foreground">
                                {member.username ?? "No username"} / {member.discordUserId}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{member.serverName}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              <StatusBadge
                                label={member.syncStatus}
                                tone={getStatusTone(member.syncStatus)}
                              />
                              {member.isBot ? <StatusBadge label="Bot" tone="muted" /> : null}
                            </div>
                          </TableCell>
                          <TableCell>{member.profileLabel ?? "Pending profile link"}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p>{member.lastSyncedAtLabel}</p>
                              {member.leftAtLabel ? (
                                <p className="text-xs text-muted-foreground">
                                  Left {member.leftAtLabel}
                                </p>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            {overview.canModerateKick && member.syncStatus !== "left" && !member.isBot ? (
                              <details className="group w-[18rem]">
                                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.16em] text-danger">
                                  Kick Member
                                </summary>
                                <form
                                  action={kickDiscordMemberAction}
                                  className="mt-3 space-y-3 rounded-2xl border border-danger/40 bg-danger/5 p-3"
                                >
                                  <input name="discordServerId" type="hidden" value={member.discordServerId} />
                                  <input name="targetDiscordUserId" type="hidden" value={member.discordUserId} />
                                  <Input
                                    name="reason"
                                    placeholder="Required reason"
                                    required
                                  />
                                  <p className="text-xs leading-5 text-muted-foreground">
                                    Confirm the target server is {member.serverName}. This action is audited and may fail if the bot role is too low.
                                  </p>
                                  <Button size="sm" type="submit" variant="outline">
                                    Confirm Kick
                                  </Button>
                                </form>
                              </details>
                            ) : (
                              <StatusBadge label="No action" tone="muted" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )
              ) : (
                <EmptyState
                  description="Grant discord.members.view to inspect imported member state and profile link status."
                  title="Member sync visibility not granted"
                />
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/78">
            <CardHeader>
              <CardTitle>Channel mappings</CardTitle>
              <CardDescription>
                Mappings route portal notifications to explicit Discord destinations. Unit-scoped
                records are tried first, then global records for the same mapping key.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {overview.channelMappings.length === 0 ? (
                <EmptyState
                  description="Channel mappings are required before Discord placeholder delivery can target a specific destination."
                  title="No channel mappings yet"
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Server</TableHead>
                      <TableHead className="hidden xl:table-cell">Channel ID</TableHead>
                      <TableHead className="hidden xl:table-cell">Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden xl:table-cell">Updated</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overview.channelMappings.map((mapping) => (
                      <TableRow key={mapping.id}>
                        <TableCell className="font-semibold text-foreground">{mapping.key}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p>{mapping.serverName}</p>
                            <p className="text-xs text-muted-foreground">
                              {mapping.serverUnitName ?? "Global community"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">{mapping.channelId}</TableCell>
                        <TableCell className="hidden xl:table-cell">{mapping.description ?? "No description"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <StatusBadge
                              label={mapping.isActive ? "Active" : "Inactive"}
                              tone={mapping.isActive ? "success" : "warning"}
                            />
                            {mapping.latestDeliveryStatus ? (
                              <StatusBadge
                                label={mapping.latestDeliveryStatus}
                                tone={getStatusTone(mapping.latestDeliveryStatus)}
                              />
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">{mapping.updatedAtLabel}</TableCell>
                        <TableCell className="align-top">
                          {(overview.canManageChannels || overview.canSendNotifications) ? (
                            <details className="group w-[20rem]">
                              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                                Manage Mapping
                              </summary>
                              <div className="mt-3 space-y-3 rounded-2xl border border-border/70 bg-background/40 p-3">
                                {overview.canManageChannels ? (
                                  <>
                                    <form action={saveDiscordChannelMappingAction} className="space-y-3">
                                      <input name="id" type="hidden" value={mapping.id} />
                                      <select
                                        className="flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                        defaultValue={mapping.serverId}
                                        name="discordServerId"
                                      >
                                        {overview.servers.map((server) => (
                                          <option key={server.id} value={server.id}>
                                            {server.name}
                                          </option>
                                        ))}
                                      </select>
                                      <select
                                        className="flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                        defaultValue={mapping.key}
                                        name="key"
                                      >
                                        {discordChannelMappingCatalog.map((entry) => (
                                          <option key={entry.key} value={entry.key}>
                                            {entry.label}
                                          </option>
                                        ))}
                                      </select>
                                      <Input
                                        defaultValue={mapping.channelId}
                                        name="channelId"
                                        placeholder="Discord channel ID"
                                      />
                                      <Input
                                        defaultValue={mapping.description ?? ""}
                                        name="description"
                                        placeholder="Description"
                                      />
                                      <CheckboxField
                                        defaultChecked={mapping.isActive}
                                        label="Active"
                                        name="isActive"
                                      />
                                      <Button size="sm" type="submit">
                                        Save Mapping
                                      </Button>
                                    </form>
                                    <form action={disableDiscordChannelMappingAction}>
                                      <input name="mappingId" type="hidden" value={mapping.id} />
                                      <Button size="sm" type="submit" variant="outline">
                                        Disable
                                      </Button>
                                    </form>
                                  </>
                                ) : null}
                                {overview.canSendNotifications ? (
                                  <form action={requestDiscordTestDeliveryAction}>
                                    <input name="mappingId" type="hidden" value={mapping.id} />
                                    <Button size="sm" type="submit" variant="secondary">
                                      Send Test Placeholder
                                    </Button>
                                  </form>
                                ) : null}
                              </div>
                            </details>
                          ) : (
                            <StatusBadge label="View only" tone="muted" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {overview.canManageChannels ? (
                <div className="rounded-2xl border border-border/70 bg-background/35 p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Add channel mapping
                  </h3>
                  <form
                    action={saveDiscordChannelMappingAction}
                    className="mt-4 grid gap-3 md:grid-cols-2"
                  >
                    <select
                      className="flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      defaultValue=""
                      name="discordServerId"
                    >
                      <option value="">Select server</option>
                      {overview.servers.map((server) => (
                        <option key={server.id} value={server.id}>
                          {server.name}
                        </option>
                      ))}
                    </select>
                    <select
                      className="flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      defaultValue={discordChannelMappingCatalog[0]?.key ?? ""}
                      name="key"
                    >
                      {discordChannelMappingCatalog.map((entry) => (
                        <option key={entry.key} value={entry.key}>
                          {entry.label}
                        </option>
                      ))}
                    </select>
                    <Input name="channelId" placeholder="Discord channel ID" />
                    <Input name="description" placeholder="Description" />
                    <div className="md:col-span-2 flex flex-wrap items-center gap-4 rounded-lg border border-border/70 bg-card/60 px-3 py-2">
                      <CheckboxField defaultChecked label="Active" name="isActive" />
                    </div>
                    <div className="md:col-span-2">
                      <Button type="submit">Save Channel Mapping</Button>
                    </div>
                  </form>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/78">
            <CardHeader>
              <CardTitle>Role mappings</CardTitle>
              <CardDescription>
                Manual role sync only manages Discord roles that are explicitly mapped in the
                portal. Preview first, then run sync deliberately when staff are ready.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {overview.roleMappings.length === 0 ? (
                <EmptyState
                  description="Add a Discord role mapping before previewing or running manual sync."
                  title="No role mappings yet"
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead className="hidden xl:table-cell">Server</TableHead>
                      <TableHead>Discord Role</TableHead>
                      <TableHead>Mapped Source</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden xl:table-cell">Updated</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overview.roleMappings.map((mapping) => (
                      <TableRow key={mapping.id}>
                        <TableCell>{getRoleMappingTypeLabel(mapping.mappingType)}</TableCell>
                        <TableCell className="hidden xl:table-cell">{mapping.serverName}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-semibold text-foreground">
                              {mapping.discordRoleName ?? "Unnamed role"}
                            </p>
                            <p className="text-xs text-muted-foreground">{mapping.discordRoleId}</p>
                          </div>
                        </TableCell>
                        <TableCell>{mapping.mappingLabel}</TableCell>
                        <TableCell>
                          <StatusBadge
                            label={mapping.isActive ? "Active" : "Inactive"}
                            tone={mapping.isActive ? "success" : "warning"}
                          />
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">{mapping.updatedAtLabel}</TableCell>
                        <TableCell className="align-top">
                          {overview.canManageRoleMappings ? (
                            <details className="group w-[22rem]">
                              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                                Manage Role Mapping
                              </summary>
                              <div className="mt-3 space-y-3 rounded-2xl border border-border/70 bg-background/40 p-3">
                                <form action={saveDiscordRoleMappingAction} className="space-y-3">
                                  <input name="id" type="hidden" value={mapping.id} />
                                  <select
                                    className="flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                    defaultValue={mapping.serverId}
                                    name="discordServerId"
                                  >
                                    {overview.servers.map((server) => (
                                      <option key={server.id} value={server.id}>
                                        {server.name}
                                      </option>
                                    ))}
                                  </select>
                                  <select
                                    className="flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                    defaultValue={mapping.mappingType}
                                    name="mappingType"
                                  >
                                    {discordRoleMappingTypeCatalog.map((type) => (
                                      <option key={type} value={type}>
                                        {getRoleMappingTypeLabel(type)}
                                      </option>
                                    ))}
                                  </select>
                                  <Input
                                    defaultValue={mapping.discordRoleName ?? ""}
                                    name="discordRoleName"
                                    placeholder="Discord role name"
                                  />
                                  <Input
                                    defaultValue={mapping.discordRoleId}
                                    name="discordRoleId"
                                    placeholder="Discord role ID"
                                  />
                                  <select
                                    className="flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                    defaultValue={mapping.unitId ?? ""}
                                    name="unitId"
                                  >
                                    <option value="">No unit mapping</option>
                                    {overview.units.map((unit) => (
                                      <option key={unit.id} value={unit.id}>
                                        {unit.name}
                                      </option>
                                    ))}
                                  </select>
                                  <select
                                    className="flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                    defaultValue={mapping.qualificationId ?? ""}
                                    name="qualificationId"
                                  >
                                    <option value="">No qualification mapping</option>
                                    {overview.qualifications.map((qualification) => (
                                      <option key={qualification.id} value={qualification.id}>
                                        {qualification.label}
                                      </option>
                                    ))}
                                  </select>
                                  <select
                                    className="flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                    defaultValue={mapping.roleId ?? ""}
                                    name="roleId"
                                  >
                                    <option value="">No portal role mapping</option>
                                    {overview.roles.map((role) => (
                                      <option key={role.id} value={role.id}>
                                        {role.label}
                                      </option>
                                    ))}
                                  </select>
                                  <select
                                    className="flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                    defaultValue={mapping.rankId ?? ""}
                                    name="rankId"
                                  >
                                    <option value="">No rank mapping</option>
                                    {overview.ranks.map((rank) => (
                                      <option key={rank.id} value={rank.id}>
                                        {rank.label}
                                      </option>
                                    ))}
                                  </select>
                                  <Input
                                    defaultValue={mapping.description ?? ""}
                                    name="description"
                                    placeholder="Description"
                                  />
                                  <CheckboxField
                                    defaultChecked={mapping.isActive}
                                    label="Active"
                                    name="isActive"
                                  />
                                  <Button size="sm" type="submit">
                                    Save Role Mapping
                                  </Button>
                                </form>
                                <form action={disableDiscordRoleMappingAction}>
                                  <input name="roleMappingId" type="hidden" value={mapping.id} />
                                  <Button size="sm" type="submit" variant="outline">
                                    Disable
                                  </Button>
                                </form>
                              </div>
                            </details>
                          ) : (
                            <StatusBadge label="View only" tone="muted" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {overview.canManageRoleMappings ? (
                <div className="rounded-2xl border border-border/70 bg-background/35 p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Add role mapping
                  </h3>
                  <form action={saveDiscordRoleMappingAction} className="mt-4 grid gap-3 md:grid-cols-2">
                    <select
                      className="flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      defaultValue=""
                      name="discordServerId"
                    >
                      <option value="">Select server</option>
                      {overview.servers.map((server) => (
                        <option key={server.id} value={server.id}>
                          {server.name}
                        </option>
                      ))}
                    </select>
                    <select
                      className="flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      defaultValue="unit"
                      name="mappingType"
                    >
                      {discordRoleMappingTypeCatalog.map((type) => (
                        <option key={type} value={type}>
                          {getRoleMappingTypeLabel(type)}
                        </option>
                      ))}
                    </select>
                    <Input name="discordRoleName" placeholder="Discord role name" />
                    <Input name="discordRoleId" placeholder="Discord role ID" />
                    <select
                      className="flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      defaultValue=""
                      name="unitId"
                    >
                      <option value="">No unit mapping</option>
                      {overview.units.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.name}
                        </option>
                      ))}
                    </select>
                    <select
                      className="flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      defaultValue=""
                      name="qualificationId"
                    >
                      <option value="">No qualification mapping</option>
                      {overview.qualifications.map((qualification) => (
                        <option key={qualification.id} value={qualification.id}>
                          {qualification.label}
                        </option>
                      ))}
                    </select>
                    <select
                      className="flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      defaultValue=""
                      name="roleId"
                    >
                      <option value="">No portal role mapping</option>
                      {overview.roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                    <select
                      className="flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      defaultValue=""
                      name="rankId"
                    >
                      <option value="">No rank mapping</option>
                      {overview.ranks.map((rank) => (
                        <option key={rank.id} value={rank.id}>
                          {rank.label}
                        </option>
                      ))}
                    </select>
                    <Input className="md:col-span-2" name="description" placeholder="Description" />
                    <div className="md:col-span-2 flex flex-wrap items-center gap-4 rounded-lg border border-border/70 bg-card/60 px-3 py-2">
                      <CheckboxField defaultChecked label="Active" name="isActive" />
                    </div>
                    <div className="md:col-span-2">
                      <Button type="submit">Save Role Mapping</Button>
                    </div>
                  </form>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border/70 bg-card/78">
            <CardHeader>
              <CardTitle>Slash commands</CardTitle>
              <CardDescription>
                Member commands are wired through portal services, while staff commands stay
                read-only or explicitly placeholder-based until the underlying workflow is ready.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {discordSlashCommandCatalog.map((command) => (
                <div
                  key={command.name}
                  className="rounded-2xl border border-border/70 bg-background/35 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">/{command.name}</p>
                      <p className="text-sm leading-6 text-muted-foreground">
                        {command.description}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge
                        label={command.defaultEphemeral ? "Ephemeral First" : "Public"}
                        tone="info"
                      />
                      <StatusBadge
                        label={command.linkedMemberOnly ? "Linked Member" : "Open"}
                        tone={command.linkedMemberOnly ? "warning" : "muted"}
                      />
                      {command.requiredPortalPermission ? (
                        <StatusBadge label={command.requiredPortalPermission} tone="muted" />
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/78">
            <CardHeader>
              <CardTitle>Manual role sync</CardTitle>
              <CardDescription>
                Preview mapped role changes before running a sync. Only explicitly managed Discord
                roles are touched, and Discord failures never change portal data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {overview.roleSyncPreview ? (
                <div className="rounded-2xl border border-border/70 bg-background/35 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{overview.roleSyncPreview.serverName}</p>
                      <p className="text-sm text-muted-foreground">
                        Generated {overview.roleSyncPreview.generatedAtLabel}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge
                        label={`${overview.roleSyncPreview.summary.touchedMembers} members`}
                        tone="info"
                      />
                      <StatusBadge
                        label={`${overview.roleSyncPreview.summary.addOperations} add`}
                        tone="success"
                      />
                      <StatusBadge
                        label={`${overview.roleSyncPreview.summary.removeOperations} remove`}
                        tone="warning"
                      />
                    </div>
                  </div>
                  <div className="mt-4 space-y-3">
                    {overview.roleSyncPreview.changes.slice(0, 5).map((change) => (
                      <div
                        key={change.discordUserId}
                        className="rounded-xl border border-border/70 bg-card/60 p-3"
                      >
                        <p className="font-semibold text-foreground">{change.displayName}</p>
                        <p className="text-sm text-muted-foreground">
                          {change.unitLabel ?? "No unit"} · {change.rankLabel ?? "No rank"}
                        </p>
                        <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
                          <p>Add: {change.addRoleLabels.join(", ") || "None"}</p>
                          <p>Remove: {change.removeRoleLabels.join(", ") || "None"}</p>
                        </div>
                      </div>
                    ))}
                    {overview.roleSyncPreview.changes.length === 0 ? (
                      <EmptyState
                        description="No managed Discord role changes are pending for the selected server."
                        title="Sync preview is clean"
                      />
                    ) : null}
                  </div>
                </div>
              ) : (
                <EmptyState
                  description="Add a server and role mappings, then preview sync to inspect managed role drift."
                  title="No sync preview available"
                />
              )}

              <div className="grid gap-3 md:grid-cols-2">
                {overview.canViewSync ? (
                  <form action={previewDiscordRoleSyncAction} className="space-y-3 rounded-2xl border border-border/70 bg-background/35 p-4">
                    <select
                      className="flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      defaultValue={overview.roleSyncPreview?.serverId ?? overview.servers[0]?.id ?? ""}
                      name="discordServerId"
                    >
                      <option value="">Select server</option>
                      {overview.servers.map((server) => (
                        <option key={server.id} value={server.id}>
                          {server.name}
                        </option>
                      ))}
                    </select>
                    <Button className="w-full" type="submit" variant="outline">
                      Refresh Preview
                    </Button>
                  </form>
                ) : null}
                {overview.canRunSync ? (
                  <form action={runDiscordRoleSyncAction} className="space-y-3 rounded-2xl border border-border/70 bg-background/35 p-4">
                    <select
                      className="flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      defaultValue={overview.roleSyncPreview?.serverId ?? overview.servers[0]?.id ?? ""}
                      name="discordServerId"
                    >
                      <option value="">Select server</option>
                      {overview.servers.map((server) => (
                        <option key={server.id} value={server.id}>
                          {server.name}
                        </option>
                      ))}
                    </select>
                    <Button className="w-full" type="submit">
                      Run Manual Sync
                    </Button>
                  </form>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/78">
            <CardHeader>
              <CardTitle>Member sync log</CardTitle>
              <CardDescription>
                Manual and future scheduled sync runs record scanned, imported, updated, and left-server counts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {overview.canViewSync || overview.canRunMemberSync ? (
                overview.syncLogs.length === 0 ? (
                  <EmptyState
                    description="Run member sync to populate the first Discord sync log entry."
                    title="No member sync logs yet"
                  />
                ) : (
                  <div className="space-y-3">
                    {overview.syncLogs.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-2xl border border-border/70 bg-background/35 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-foreground">
                              {entry.serverName ?? "Unknown server"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {entry.syncType} / {entry.startedAtLabel}
                            </p>
                          </div>
                          <StatusBadge label={entry.status} tone={getStatusTone(entry.status)} />
                        </div>
                        <div className="mt-3 grid gap-1 text-sm text-muted-foreground">
                          <p>
                            Scanned {entry.scannedCount}, imported {entry.importedCount}, updated{" "}
                            {entry.updatedCount}, left {entry.leftCount}, skipped bots{" "}
                            {entry.skippedBotCount}
                          </p>
                          <p>Completed: {entry.completedAtLabel ?? "Still running"}</p>
                          {entry.actorLabel ? <p>Actor: {entry.actorLabel}</p> : null}
                          {entry.errorMessage ? <p>{entry.errorMessage}</p> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <EmptyState
                  description="Grant Discord sync visibility to inspect sync history."
                  title="Sync log visibility not granted"
                />
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/78">
            <CardHeader>
              <CardTitle>Moderation history</CardTitle>
              <CardDescription>
                Kick, ban, and timeout workflows record requested/succeeded/failed outcomes here. Kick is the first live action.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {overview.canViewModerationHistory ? (
                overview.moderationActions.length === 0 ? (
                  <EmptyState
                    description="Moderation actions will appear after an authorized operator uses a portal or Discord command action."
                    title="No Discord moderation history yet"
                  />
                ) : (
                  <div className="space-y-3">
                    {overview.moderationActions.map((action) => (
                      <div
                        key={action.id}
                        className="rounded-2xl border border-border/70 bg-background/35 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-foreground">
                              {action.action.toUpperCase()} / {action.targetLabel}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {action.serverName} / {action.createdAtLabel}
                            </p>
                          </div>
                          <StatusBadge label={action.result} tone={getStatusTone(action.result)} />
                        </div>
                        <div className="mt-3 grid gap-1 text-sm text-muted-foreground">
                          <p>Reason: {action.reason}</p>
                          <p>Moderator: {action.moderatorLabel ?? "System or Discord command"}</p>
                          <p>Discord ID: {action.targetDiscordUserId}</p>
                          {action.errorMessage ? <p>{action.errorMessage}</p> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <EmptyState
                  description="Grant discord.moderation.history.view to review moderation action results."
                  title="Moderation history visibility not granted"
                />
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/78">
            <CardHeader>
              <CardTitle>Delivery status</CardTitle>
              <CardDescription>
                Discord placeholder deliveries should never block portal workflows. Final failures
                stay visible here for follow-up.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {overview.canViewDeliveries ? (
                overview.deliveries.length === 0 ? (
                  <EmptyState
                    description="Send a channel test placeholder or wait for future workflow hooks to start creating Discord delivery records."
                    title="No Discord delivery records yet"
                  />
                ) : (
                  <div className="space-y-3">
                    {overview.deliveries.map((delivery) => (
                      <div
                        key={delivery.id}
                        className="rounded-2xl border border-border/70 bg-background/35 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="space-y-1">
                            <p className="font-semibold text-foreground">
                              {delivery.notificationTitle}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {delivery.serverName ?? "Unmapped"} · {delivery.mappingKey ?? "no mapping"}
                            </p>
                          </div>
                          <StatusBadge
                            label={delivery.status}
                            tone={getStatusTone(delivery.status)}
                          />
                        </div>
                        <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                          <p>Destination: {delivery.destinationKey}</p>
                          <p>Channel type: {delivery.channelType}</p>
                          <p>Updated: {delivery.updatedAtLabel}</p>
                          {delivery.recipientLabel ? <p>Recipient: {delivery.recipientLabel}</p> : null}
                          {delivery.errorMessage ? <p>{delivery.errorMessage}</p> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <EmptyState
                  description="Grant notification delivery visibility to review Discord placeholder results from this workspace."
                  title="Delivery visibility not granted"
                />
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/78">
            <CardHeader>
              <CardTitle>Recent Discord activity</CardTitle>
              <CardDescription>
                Mapping changes, manual sync actions, command usage, and delivery failures stay
                visible through portal audit data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {overview.recentActivity.length === 0 ? (
                <EmptyState
                  description="Discord audit activity will appear here as staff use mappings, sync, and delivery actions."
                  title="No recent activity"
                />
              ) : (
                <div className="space-y-3">
                  {overview.recentActivity.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-2xl border border-border/70 bg-background/35 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-semibold text-foreground">{entry.summary}</p>
                        <StatusBadge label={entry.entityLabel} tone="muted" />
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {entry.action} · {entry.createdAtLabel}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/78">
            <CardHeader>
              <CardTitle>Nickname sync</CardTitle>
              <CardDescription>
                Nickname sync remains configuration-only for now and stays disabled by default until
                staff approve a consistent display format.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-7 text-muted-foreground">
              <StatusBadge label="Disabled by default" tone="warning" />
              <p>Planned formats can include unit tags or rank labels, but no nickname changes are automated in this phase.</p>
              <p>Enable nickname sync later only after Discord role sync is stable and the community agrees on naming conventions.</p>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/78">
            <CardHeader>
              <CardTitle>Safety rules</CardTitle>
              <CardDescription>
                These guardrails come straight from the architecture and integration docs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-7 text-muted-foreground">
              <p>Never guess a Discord channel when no unit-scoped or global mapping exists.</p>
              <p>Never post staff-only details into public mappings such as announcements or events.</p>
              <p>Never authorize by Discord role alone. Portal permissions remain authoritative.</p>
              <p>Never treat Discord as the source of truth for personnel, attendance, or operations.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
