"use client";

import { useMemo, useState } from "react";

import { InspectorDrawer } from "@/components/inspector/inspector-drawer";
import { CollapsibleSection } from "@/components/layout/progressive-disclosure";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { KpiCard } from "@/components/dashboard/kpi-card";
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
import {
  bootstrapPrimaryCommunityGuildAction,
  discoverDiscordGuildsAction,
  importDiscordGuildInventoryAction,
  previewDiscordRoleSyncAction,
  runDiscordMemberSyncAction,
  runDiscordDiscoveryDryRunAction,
  runDiscordTargetedDiscoveryAction,
} from "@/server/discord/actions";
import {
  approveDiscordAutomationExecutionAction,
  rejectDiscordAutomationExecutionAction,
  retryDiscordAutomationExecutionAction,
  syncDiscordAutomationDefinitionsAction,
} from "@/server/discord/automation/actions";
import type {
  DiscordAdministrationOverview,
  DiscordServerAdminItem,
} from "@/server/discord/types";

type DiscordOperationsCenterProps = {
  overview: DiscordAdministrationOverview;
};

type AutomationDefinitionItem = DiscordAdministrationOverview["automation"]["definitions"][number];
type AutomationFailedActionItem = DiscordAdministrationOverview["automation"]["failedActions"][number];
type AutomationPendingApprovalItem = DiscordAdministrationOverview["automation"]["pendingApprovals"][number];
type AutomationRecentExecutionItem = DiscordAdministrationOverview["automation"]["recentExecutions"][number];

const topLevelSections = [
  "Overview",
  "Guilds",
  "Readiness",
  "Resources",
  "Reconciliation",
  "Events",
  "Communications",
  "Gateway",
  "Automation",
  "Applications",
  "Deliveries",
  "Moderation",
  "Diagnostics",
  "Audit",
  "Settings",
];

function getStatusTone(status: string): "success" | "warning" | "danger" | "muted" | "info" {
  switch (status) {
    case "active":
    case "ok":
    case "connected":
    case "present":
    case "completed":
    case "sent":
      return "success";
    case "failed":
    case "error":
    case "left":
    case "blocked":
    case "not_ready":
    case "not configured":
    case "not_configured":
      return "danger";
    case "warning":
    case "running":
    case "retrying":
    case "warn":
    case "healthy_with_warnings":
    case "degraded":
    case "ready_with_warnings":
    case "expired":
      return "warning";
    case "unknown":
    case "never_connected":
    case "disabled":
    case "skip":
    case "not_evaluated":
      return "muted";
    default:
      return "info";
  }
}

function getHealthTone(score: number): "success" | "warning" | "danger" | "muted" {
  if (score >= 85) {
    return "success";
  }

  if (score >= 65) {
    return "warning";
  }

  if (score > 0) {
    return "danger";
  }

  return "muted";
}

function getRecommendationTone(severity: string) {
  return severity === "danger" ? "danger" : severity === "warning" ? "warning" : "info";
}

export function DiscordOperationsCenter({ overview }: DiscordOperationsCenterProps) {
  const [search, setSearch] = useState("");
  const [selectedGuildId, setSelectedGuildId] = useState<string | null>(
    overview.servers[0]?.id ?? null,
  );
  const selectedGuild =
    overview.servers.find((server) => server.id === selectedGuildId) ?? overview.servers[0] ?? null;
  const filteredGuilds = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return overview.servers;
    }

    return overview.servers.filter((server) =>
      [
        server.name,
        server.guildId,
        server.guildType,
        server.status,
        server.unitName ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [overview.servers, search]);
  const selectedChannels = selectedGuild
    ? overview.guildChannels.filter((channel) => channel.serverId === selectedGuild.id)
    : [];
  const selectedEvents = selectedGuild
    ? overview.guildEvents.filter((event) => event.serverId === selectedGuild.id)
    : [];
  const selectedEmojis = selectedGuild
    ? overview.guildEmojis.filter((emoji) => emoji.serverId === selectedGuild.id)
    : [];
  const selectedStickers = selectedGuild
    ? overview.guildStickers.filter((sticker) => sticker.serverId === selectedGuild.id)
    : [];
  const selectedRoles = selectedGuild
    ? overview.guildRoles.filter((role) => role.serverId === selectedGuild.id)
    : [];
  const selectedMappings = selectedGuild
    ? overview.channelMappings.filter((mapping) => mapping.serverId === selectedGuild.id)
    : [];
  const selectedRoleMappings = selectedGuild
    ? overview.roleMappings.filter((mapping) => mapping.serverId === selectedGuild.id)
    : [];
  const allRecommendations = overview.servers.flatMap((server) =>
    server.recommendations.map((recommendation) => ({
      ...recommendation,
      guildName: server.name,
    })),
  );
  const openReconciliationCount = overview.discovery.reconciliationItems.filter(
    (item) => item.status === "open",
  ).length;

  return (
    <Card className="border-border/70 bg-card/82" id="discord-operations-center">
      <CardHeader className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label="Operations Center" tone="info" />
          <StatusBadge
            label={`${overview.platform.activeGuildCount} active guilds`}
            tone={overview.platform.activeGuildCount > 0 ? "success" : "warning"}
          />
          <StatusBadge
            label={
              overview.gatewayHealth?.status
                ? `Gateway ${overview.gatewayHealth.status}`
                : "Gateway not visible"
            }
            tone={overview.gatewayHealth?.status ? getStatusTone(overview.gatewayHealth.status) : "muted"}
          />
        </div>
        <div className="space-y-2">
          <CardTitle>Discord Operations Center</CardTitle>
          <CardDescription className="max-w-4xl leading-7">
            Centralized workspace for managing every connected Discord guild, channel inventory,
            role inventory, routing, Gateway health, diagnostics, synchronization, and audit
            context. Discord stays a managed platform; the Portal remains authoritative.
          </CardDescription>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {topLevelSections.map((section) => (
            <a
              className="shrink-0 rounded-full border border-border/70 bg-background/45 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
              href={`#discord-${section.toLowerCase().replaceAll(" ", "-")}`}
              key={section}
            >
              {section}
            </a>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6" id="discord-overview">
          <KpiCard
            hint="Managed Discord guild records."
            label="Guilds"
            tone="info"
            value={String(overview.platform.totalGuildCount)}
          />
          <KpiCard
            hint="Latest inventory and diagnostic warnings."
            label="Health Issues"
            tone={overview.platform.healthIssueCount > 0 ? "warning" : "muted"}
            value={String(overview.platform.healthIssueCount)}
          />
          <KpiCard
            hint="Failed Discord notification deliveries."
            label="Failed Deliveries"
            tone={overview.failedDeliveryCount > 0 ? "danger" : "muted"}
            value={String(overview.failedDeliveryCount)}
          />
          <KpiCard
            hint="Open Discord resource drift or mapping impact items."
            label="Reconciliation"
            tone={openReconciliationCount > 0 ? "warning" : "muted"}
            value={String(openReconciliationCount)}
          />
          <KpiCard
            hint="Recent guild member sync failures or active sync state."
            label="Last Sync"
            tone={overview.identitySummary.lastSyncStatus === "failed" ? "danger" : "info"}
            value={overview.identitySummary.lastSyncStatus ?? "None"}
          />
          <KpiCard
            hint="Safe command registration and interaction readiness."
            label="Interactions"
            tone={overview.identitySummary.interactionWebhookReady ? "success" : "warning"}
            value={overview.identitySummary.interactionWebhookReady ? "Ready" : "Review"}
          />
        </section>

        <CollapsibleSection
          badgeLabel={overview.readiness.overall.status.replaceAll("_", " ")}
          description={overview.readiness.overall.summary}
          title="Platform Readiness"
        >
          <div className="space-y-5" id="discord-readiness">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                hint="Explainable aggregate across OAuth, REST, interactions, Gateway, mappings, and workflows."
                label="Platform Status"
                tone={getStatusTone(overview.readiness.overall.status)}
                value={overview.readiness.overall.status.replaceAll("_", " ")}
              />
              <KpiCard
                hint="Critical or high findings that should block Phase 4 rollout."
                label="Release Blockers"
                tone={overview.readiness.releaseBlockers.length > 0 ? "danger" : "success"}
                value={String(overview.readiness.releaseBlockers.length)}
              />
              <KpiCard
                hint="Read-only checks for configuration, guilds, interactions, mappings, and workflows."
                label="Preflight Checks"
                tone="info"
                value={String(overview.readiness.preflightChecks.length)}
              />
              <KpiCard
                hint="Active managed guilds evaluated for technical capabilities."
                label="Guild Certifications"
                tone={overview.readiness.guildCertifications.some((guild) => guild.state === "not_ready") ? "warning" : "info"}
                value={String(overview.readiness.guildCertifications.length)}
              />
            </div>

            {overview.readiness.releaseBlockers.length > 0 ? (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/8 p-4">
                <h3 className="text-base font-semibold text-foreground">Release Blockers</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {overview.readiness.releaseBlockers.map((blocker) => (
                    <a
                      className="rounded-xl border border-border/70 bg-card/60 p-3 transition-colors hover:bg-card"
                      href={blocker.actionHref}
                      key={blocker.title}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-semibold text-foreground">{blocker.title}</p>
                        <StatusBadge label={blocker.severity} tone="danger" />
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{blocker.summary}</p>
                    </a>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 xl:grid-cols-2">
              <InventoryTable
                emptyDescription="No component statuses are visible with your current permissions."
                emptyTitle="No readiness components"
                rows={overview.readiness.componentStatuses.map((component) => ({
                  id: component.component,
                  meta: component.optional ? "Optional" : "Required",
                  status: component.status.replaceAll("_", " "),
                  subtitle: `${component.summary} ${component.details.join(" ")}`,
                  title: component.component,
                }))}
              />
              <InventoryTable
                emptyDescription="No preflight checks are visible with your current permissions."
                emptyTitle="No preflight checks"
                rows={overview.readiness.preflightChecks.map((check) => ({
                  id: check.id,
                  meta: check.category,
                  status: check.status,
                  subtitle: `${check.summary} ${check.recommendation}`,
                  title: check.id,
                }))}
              />
            </div>

            <CollapsibleSection
              badgeLabel="Certification"
              description="Certification is technical readiness only. It does not grant Portal permissions."
              title="Guild and Feature Certification"
            >
              <div className="grid gap-4 xl:grid-cols-2">
                <InventoryTable
                  emptyDescription="Configure and discover a guild before certification can be evaluated."
                  emptyTitle="No guild certifications"
                  rows={overview.readiness.guildCertifications.map((guild) => ({
                    id: guild.serverId,
                    meta: guild.guildId,
                    status: guild.state.replaceAll("_", " "),
                    subtitle: guild.summary,
                    title: guild.guildName,
                  }))}
                />
                <InventoryTable
                  emptyDescription="No feature certification profiles are visible."
                  emptyTitle="No feature certifications"
                  rows={overview.readiness.featureCertifications.map((feature) => ({
                    id: feature.key,
                    meta: feature.dependencies.join(", "),
                    status: feature.state.replaceAll("_", " "),
                    subtitle: feature.summary,
                    title: feature.label,
                  }))}
                />
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              badgeLabel={`${overview.readiness.dependencyProfiles.length} profiles`}
              description="Dependencies clarify which features need OAuth, REST, interactions, Gateway, mappings, storage, or Portal services."
              title="Dependency Graph"
            >
              <InventoryTable
                emptyDescription="No dependency profiles are configured."
                emptyTitle="No dependency profiles"
                rows={overview.readiness.dependencyProfiles.map((profile) => ({
                  id: profile.feature,
                  meta: `Required: ${profile.required.join(", ")}`,
                  status: profile.optional.length ? "optional deps" : "required only",
                  subtitle: profile.optional.length ? `Optional: ${profile.optional.join(", ")}` : "No optional dependencies.",
                  title: profile.feature,
                }))}
              />
            </CollapsibleSection>
          </div>
        </CollapsibleSection>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(22rem,0.85fr)]" id="discord-guilds">
          <div className="rounded-2xl border border-border/70 bg-background/35 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground">Guild Directory</h3>
                <p className="text-sm text-muted-foreground">
                  Search, filter, and inspect each managed Discord guild without leaving context.
                </p>
              </div>
              <Input
                aria-label="Search Discord guilds"
                className="md:max-w-xs"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search guilds, IDs, status"
                value={search}
              />
            </div>
            <div className="mt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guild</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Health</TableHead>
                    <TableHead className="hidden lg:table-cell">REST / Gateway</TableHead>
                    <TableHead className="hidden xl:table-cell">Inventory</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGuilds.map((server) => (
                    <TableRow key={server.id}>
                      <TableCell>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-foreground">{server.name}</p>
                            {server.isPrimary ? <StatusBadge label="Primary" tone="success" /> : null}
                          </div>
                          <p className="text-xs text-muted-foreground">{server.guildId}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge label={server.guildType} tone="muted" />
                          <StatusBadge label={server.status} tone={getStatusTone(server.status)} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          label={`${server.healthScore}%`}
                          tone={getHealthTone(server.healthScore)}
                        />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge label={`REST ${server.restStatus}`} tone={getStatusTone(server.restStatus)} />
                          <StatusBadge label={`GW ${server.gatewayStatus}`} tone={getStatusTone(server.gatewayStatus)} />
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground xl:table-cell">
                        {server.discoveredChannelCount} channels / {server.discoveredRoleCount} roles
                      </TableCell>
                      <TableCell>
                        <Button onClick={() => setSelectedGuildId(server.id)} size="sm" type="button" variant="outline">
                          Inspect
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {filteredGuilds.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  description="Try a different search, or discover/import a configured guild."
                  title="No guilds match the current search"
                />
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border/70 bg-background/35 p-4" id="discord-recommendations">
              <h3 className="text-base font-semibold text-foreground">Recommendations</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Corrective actions are safe links or explicit admin forms.
              </p>
              <div className="mt-4 space-y-3">
                {allRecommendations.slice(0, 5).map((recommendation) => (
                  <a
                    className="block rounded-xl border border-border/70 bg-card/60 p-3 transition-colors hover:bg-card"
                    href={recommendation.actionHref}
                    key={recommendation.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">{recommendation.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{recommendation.guildName}</p>
                      </div>
                      <StatusBadge
                        label={recommendation.severity}
                        tone={getRecommendationTone(recommendation.severity)}
                      />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{recommendation.description}</p>
                  </a>
                ))}
                {allRecommendations.length === 0 ? (
                  <EmptyState
                    description="Guild health, routing, and inventory signals are currently quiet."
                    title="No recommendations"
                  />
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/35 p-4" id="guild-discovery">
              <h3 className="text-base font-semibold text-foreground">Guild Discovery Wizard</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Connect, fetch, select, preview, import, review, and finish. Current phase imports
                configured guild inventory idempotently.
              </p>
              <div className="mt-4 space-y-3">
                <form action={bootstrapPrimaryCommunityGuildAction} className="space-y-3">
                  <Input name="guildId" placeholder="Optional primary guild ID override" />
                  <Button className="w-full" type="submit" variant="outline">
                    Connect / Bootstrap Primary Guild
                  </Button>
                </form>
                <form action={discoverDiscordGuildsAction}>
                  <Button className="w-full" type="submit" variant="outline">
                    Fetch Configured Guilds
                  </Button>
                </form>
                <form action={importDiscordGuildInventoryAction} className="space-y-3">
                  <select
                    className="flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    defaultValue={selectedGuild?.id ?? ""}
                    name="discordServerId"
                  >
                    <option value="">Select guild</option>
                    {overview.servers.map((server) => (
                      <option key={server.id} value={server.id}>
                        {server.name}
                      </option>
                    ))}
                  </select>
                  <Button className="w-full" type="submit">
                    Full Discovery / Refresh Inventory
                  </Button>
                </form>
                <form action={runDiscordDiscoveryDryRunAction} className="space-y-3">
                  <input name="discordServerId" type="hidden" value={selectedGuild?.id ?? ""} />
                  <Button className="w-full" disabled={!selectedGuild || !overview.canRunDiscovery} type="submit" variant="outline">
                    Dry Run Discovery
                  </Button>
                </form>
                <form action={runDiscordTargetedDiscoveryAction} className="space-y-3 rounded-xl border border-border/60 bg-card/45 p-3">
                  <input name="discordServerId" type="hidden" value={selectedGuild?.id ?? ""} />
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Targeted resources
                  </p>
                  <div className="grid gap-2 text-sm text-muted-foreground">
                    {["channels", "roles", "events", "emojis", "stickers"].map((resourceType) => (
                      <label className="flex items-center gap-2" key={resourceType}>
                        <input defaultChecked name="resourceTypes" type="checkbox" value={resourceType} />
                        <span className="capitalize">{resourceType}</span>
                      </label>
                    ))}
                  </div>
                  <Button className="w-full" disabled={!selectedGuild || !overview.canRunDiscovery} type="submit" variant="outline">
                    Run Targeted Discovery
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </section>

        <div id="discord-resources">
          <CollapsibleSection
            badgeLabel={`${openReconciliationCount} open`}
            description="Review Discord resource drift without allowing Discord names to rewrite portal mappings. Resource IDs remain canonical."
            title="Resource Reconciliation Center"
          >
          <div className="space-y-4" id="discord-reconciliation">
            <div className="grid gap-3 md:grid-cols-3">
              <KpiCard
                hint="Recent discovery sessions retained for auditability."
                label="Discovery Sessions"
                tone="info"
                value={String(overview.discovery.sessions.length)}
              />
              <KpiCard
                hint="Open or historical drift items from discovery scans."
                label="Drift Items"
                tone={overview.discovery.reconciliationItems.length ? "warning" : "muted"}
                value={String(overview.discovery.reconciliationItems.length)}
              />
              <KpiCard
                hint="Configured periodic discovery policies."
                label="Sync Schedules"
                tone={overview.discovery.schedules.length ? "info" : "muted"}
                value={String(overview.discovery.schedules.length)}
              />
            </div>
            {overview.discovery.reconciliationItems.length > 0 ? (
              <InventoryTable
                emptyDescription="No Discord resource drift has been detected."
                emptyTitle="No reconciliation items"
                rows={overview.discovery.reconciliationItems.slice(0, 10).map((item) => ({
                  id: item.id,
                  meta: `${item.serverName} / ${item.resourceType}:${item.resourceId}`,
                  status: item.status === "open" ? item.severity : item.status,
                  subtitle: `${item.changeStatus} / ${item.recommendedAction}`,
                  title: item.title,
                }))}
              />
            ) : (
              <EmptyState
                description="Run discovery to compare Discord resources against portal inventory and mappings."
                title="No reconciliation items"
              />
            )}
            <CollapsibleSection
              badgeLabel="History"
              description="Discovery session results are retained so staff can see what changed, what was dry-run only, and what needs a follow-up action."
              title="Recent Discovery Sessions"
            >
              <InventoryTable
                emptyDescription="Run full, targeted, or dry-run discovery to populate this history."
                emptyTitle="No discovery sessions"
                rows={overview.discovery.sessions.map((session) => ({
                  id: session.id,
                  meta: `${session.serverName} / ${session.createdAtLabel}`,
                  status: session.status,
                  subtitle: `${session.discoveryType}${session.dryRun ? " dry run" : ""} / ${session.resourcesFetched} fetched / ${session.resourcesUpdated} updated / ${session.resourcesMissing} missing`,
                  title: session.completedAtLabel ?? "Discovery in progress",
                }))}
              />
            </CollapsibleSection>
          </div>
          </CollapsibleSection>
        </div>

        <CollapsibleSection
          badgeLabel={`${overview.communications.health.failedDeliveries} failed`}
          description="Domain-driven communication routing. Portal workflows decide who needs the message; guild configuration decides where it lands."
          title="Communication Platform"
        >
          <div className="space-y-4" id="discord-communications">
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              <KpiCard
                hint="Registered communication domains such as patrols, releases, training, moderation, and health."
                label="Domains"
                tone={overview.communications.health.totalDomains ? "info" : "muted"}
                value={String(overview.communications.health.totalDomains)}
              />
              <KpiCard
                hint="Domain-to-guild channel mapping gaps detected from active guilds."
                label="Mapping Gaps"
                tone={overview.communications.health.missingDomainMappings ? "warning" : "success"}
                value={String(overview.communications.health.missingDomainMappings)}
              />
              <KpiCard
                hint="Deliveries waiting, sending, or retrying."
                label="Queue"
                tone={overview.communications.health.queueDepth ? "warning" : "muted"}
                value={String(overview.communications.health.queueDepth)}
              />
              <KpiCard
                hint="Recent failed delivery records."
                label="Failures"
                tone={overview.communications.health.failedDeliveries ? "danger" : "muted"}
                value={String(overview.communications.health.failedDeliveries)}
              />
              <KpiCard
                hint="Deliveries currently in retry state."
                label="Retry Backlog"
                tone={overview.communications.health.retryBacklog ? "warning" : "muted"}
                value={String(overview.communications.health.retryBacklog)}
              />
              <KpiCard
                hint="Pending delivery records across the communication queue."
                label="Pending"
                tone={overview.communications.health.pendingDeliveries ? "warning" : "muted"}
                value={String(overview.communications.health.pendingDeliveries)}
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
              <div className="rounded-2xl border border-border/70 bg-background/35 p-4">
                <h3 className="text-base font-semibold text-foreground">Domain Routing Coverage</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Channels are selected by communication domain and active guild mapping, not by hardcoded feature code.
                </p>
                <div className="mt-4">
                  <InventoryTable
                    emptyDescription="Communication domains will appear here when the user can view communication routing."
                    emptyTitle="No communication domains visible"
                    rows={overview.communications.domains.map((domain) => ({
                      id: domain.domain,
                      meta: `${domain.mappedGuildCount} mapped / ${domain.missingGuildCount} missing`,
                      status: domain.missingGuildCount ? "warning" : "mapped",
                      subtitle: `${domain.defaultMappingKey} / ${domain.description}`,
                      title: domain.label,
                    }))}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-background/35 p-4" id="discord-deliveries">
                <h3 className="text-base font-semibold text-foreground">Delivery Inspector</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Recent queue items, provider outcomes, destinations, and failure details.
                </p>
                <div className="mt-4 space-y-3">
                  {overview.communications.recentDeliveries.slice(0, 6).map((delivery) => (
                    <div className="rounded-xl border border-border/70 bg-card/60 p-3" key={delivery.id}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-foreground">{delivery.communicationTitle}</p>
                          <p className="text-xs text-muted-foreground">
                            {delivery.channelType} / {delivery.destinationKey} / {delivery.updatedAtLabel}
                          </p>
                        </div>
                        <StatusBadge label={delivery.status} tone={getStatusTone(delivery.status)} />
                      </div>
                      {delivery.errorMessage ? (
                        <p className="mt-2 text-sm text-muted-foreground">{delivery.errorMessage}</p>
                      ) : null}
                    </div>
                  ))}
                  {overview.communications.recentDeliveries.length === 0 ? (
                    <EmptyState
                      description="Deliveries created by the unified communication pipeline will appear here."
                      title="No recent deliveries"
                    />
                  ) : null}
                </div>
              </div>
            </div>

            <CollapsibleSection
              badgeLabel="History"
              description="Searchable history is backed by Communication and CommunicationDelivery records."
              title="Recent Communication History"
            >
              <InventoryTable
                emptyDescription="Communications routed through the unified pipeline will appear here."
                emptyTitle="No communication history"
                rows={overview.communications.recentHistory.map((communication) => ({
                  id: communication.id,
                  meta: `${communication.category} / ${communication.createdAtLabel}`,
                  status: communication.status,
                  subtitle: `${communication.type} / ${communication.deliveryCount} deliver${communication.deliveryCount === 1 ? "y" : "ies"}`,
                  title: communication.title,
                }))}
              />
            </CollapsibleSection>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          badgeLabel={`${overview.eventManagement.summary.linkedEventCount} linked`}
          description="Portal-managed Discord Scheduled Events. Plans and links are Portal-owned; Discord interest remains a non-authoritative participation signal."
          title="Event Management"
        >
          <div className="space-y-4" id="discord-events">
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
              <KpiCard
                hint="Per-guild policies with integration enabled."
                label="Active Policies"
                tone={overview.eventManagement.summary.activePolicyCount ? "success" : "muted"}
                value={String(overview.eventManagement.summary.activePolicyCount)}
              />
              <KpiCard
                hint="Portal events linked to Discord Scheduled Events."
                label="Linked Events"
                tone={overview.eventManagement.summary.linkedEventCount ? "info" : "muted"}
                value={String(overview.eventManagement.summary.linkedEventCount)}
              />
              <KpiCard
                hint="Open Discord-side drift detected by Gateway or reconciliation."
                label="Drift"
                tone={overview.eventManagement.summary.driftCount ? "warning" : "muted"}
                value={String(overview.eventManagement.summary.driftCount)}
              />
              <KpiCard
                hint="Plans waiting for manual approval."
                label="Approvals"
                tone={overview.eventManagement.summary.pendingApprovalCount ? "warning" : "muted"}
                value={String(overview.eventManagement.summary.pendingApprovalCount)}
              />
              <KpiCard
                hint="Multi-guild executions with at least one failed guild target."
                label="Partial Failures"
                tone={overview.eventManagement.summary.partialFailureCount ? "danger" : "muted"}
                value={String(overview.eventManagement.summary.partialFailureCount)}
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <CollapsibleSection
                badgeLabel="Policies"
                description="New policies default to preview/manual approval and do not create live Discord events automatically."
                title="Guild Event Policies"
              >
                <InventoryTable
                  emptyDescription="Policies are created lazily when an event plan targets a guild."
                  emptyTitle="No event policies yet"
                  rows={overview.eventManagement.policies.slice(0, 20).map((policy) => ({
                    id: policy.id,
                    meta: `${policy.guildId} / ${policy.eventType}`,
                    status: policy.integrationEnabled ? "enabled" : "disabled",
                    subtitle: `${policy.defaultEntityType} / ${policy.previewRequired ? "preview required" : "preview optional"} / ${policy.manualApprovalRequired ? "manual approval" : "automatic allowed"}`,
                    title: policy.eventType,
                  }))}
                />
              </CollapsibleSection>

              <CollapsibleSection
                badgeLabel="Links"
                description="A Portal event can link to zero, one, or many Discord Scheduled Events across managed guilds."
                title="Scheduled Event Links"
              >
                <InventoryTable
                  emptyDescription="Created Discord Scheduled Events and adopted external links will appear here."
                  emptyTitle="No linked scheduled events"
                  rows={overview.eventManagement.links.slice(0, 20).map((link) => ({
                    id: link.id,
                    meta: `${link.portalEventType} / ${link.portalEventId}`,
                    status: link.driftState !== "none" ? link.driftState : link.synchronizationState,
                    subtitle: `${link.guildId} / Discord event ${link.discordScheduledEventId ?? "pending"} / ${link.ownershipMode}`,
                    title: link.currentDiscordStatus ?? "Discord event link",
                  }))}
                />
              </CollapsibleSection>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <CollapsibleSection
                badgeLabel="Drift"
                description="Gateway observations can flag Discord-side changes, but they do not overwrite Portal-owned event state."
                title="Event Drift"
              >
                <InventoryTable
                  emptyDescription="No linked Discord Scheduled Event drift is open."
                  emptyTitle="No event drift"
                  rows={overview.eventManagement.drifts.slice(0, 20).map((drift) => ({
                    id: drift.id,
                    meta: drift.detectedAtLabel,
                    status: drift.status,
                    subtitle: drift.summary,
                    title: drift.severity,
                  }))}
                />
              </CollapsibleSection>

              <CollapsibleSection
                badgeLabel="Executions"
                description="Multi-guild Scheduled Event actions keep independent per-guild results."
                title="Recent Event Executions"
              >
                <InventoryTable
                  emptyDescription="No Discord Scheduled Event plan executions have been run."
                  emptyTitle="No event executions"
                  rows={overview.eventManagement.executions.slice(0, 20).map((execution) => ({
                    id: execution.id,
                    meta: execution.createdAtLabel,
                    status: execution.status,
                    subtitle: `${execution.actionCount} action${execution.actionCount === 1 ? "" : "s"} / ${execution.failedActionCount} failed`,
                    title: execution.executionType,
                  }))}
                />
              </CollapsibleSection>
            </div>

            <CollapsibleSection
              badgeLabel="Participation"
              description="Discord Scheduled Event interest is recorded separately from Portal RSVP, confirmed participation, and finalized attendance."
              title="Participation Observations"
            >
              <InventoryTable
                emptyDescription="Gateway interest observations will appear here when enabled and linked to a managed event."
                emptyTitle="No participation observations"
                rows={overview.eventManagement.observations.slice(0, 20).map((observation) => ({
                  id: observation.id,
                  meta: observation.observedAtLabel,
                  status: observation.participationStatus,
                  subtitle: `Discord event ${observation.discordScheduledEventId} / Portal event ${observation.portalEventId ?? "unlinked"}`,
                  title: observation.discordUserId,
                }))}
              />
            </CollapsibleSection>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          badgeLabel={`${overview.automation.summary.pendingApprovalCount} pending`}
          description="Controlled Discord actions generated from portal events. Roles are automation targets only; they never grant portal permissions."
          title="Automation & Role Actions"
        >
          <div className="space-y-4" id="discord-automation">
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              <KpiCard
                hint="Definitions generated from explicit Discord role mappings."
                label="Definitions"
                tone={overview.automation.summary.definitionCount ? "info" : "muted"}
                value={String(overview.automation.summary.definitionCount)}
              />
              <KpiCard
                hint="Preview-only is the safe default for role-changing automation."
                label="Preview Only"
                tone="info"
                value={String(overview.automation.summary.previewOnlyDefinitionCount)}
              />
              <KpiCard
                hint="Executions waiting for staff review."
                label="Approvals"
                tone={overview.automation.summary.pendingApprovalCount ? "warning" : "muted"}
                value={String(overview.automation.summary.pendingApprovalCount)}
              />
              <KpiCard
                hint="Failed action records that can be retried after correction."
                label="Failures"
                tone={overview.automation.summary.failedActionCount ? "danger" : "muted"}
                value={String(overview.automation.summary.failedActionCount)}
              />
              <KpiCard
                hint="Current roles assigned and tracked as Portal-managed."
                label="Managed Roles"
                tone={overview.automation.summary.managedRoleCount ? "success" : "muted"}
                value={String(overview.automation.summary.managedRoleCount)}
              />
              <KpiCard
                hint="Open drift/conflict items from desired-state checks."
                label="Drift / Conflicts"
                tone={overview.automation.summary.openDriftCount + overview.automation.summary.openConflictCount ? "warning" : "muted"}
                value={String(overview.automation.summary.openDriftCount + overview.automation.summary.openConflictCount)}
              />
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/35 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Mapping-backed definitions</h3>
                  <p className="text-sm text-muted-foreground">
                    Existing role mappings migrate into Preview Only automations. No role changes happen from this action.
                  </p>
                </div>
                <form action={syncDiscordAutomationDefinitionsAction}>
                  <Button disabled={!overview.canManageAutomation} type="submit" variant="outline">
                    Sync Definitions
                  </Button>
                </form>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-background/35 p-4">
                <h3 className="text-base font-semibold text-foreground">Approval Queue</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Manual approval executions must be approved before staff can run them.
                </p>
                <div className="mt-4 space-y-3">
                  {overview.automation.pendingApprovals.slice(0, 6).map((execution: AutomationPendingApprovalItem) => (
                    <div className="rounded-xl border border-border/70 bg-card/60 p-3" key={execution.id}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-foreground">{execution.triggerType}</p>
                          <p className="text-sm text-muted-foreground">
                            {execution.memberName} / {execution.actionCount} planned action{execution.actionCount === 1 ? "" : "s"}
                          </p>
                          <p className="text-xs text-muted-foreground">{execution.createdAtLabel}</p>
                        </div>
                        <StatusBadge label={execution.status} tone={getStatusTone(execution.status)} />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <form action={approveDiscordAutomationExecutionAction}>
                          <input name="executionId" type="hidden" value={execution.id} />
                          <Button disabled={!overview.canApproveAutomation} size="sm" type="submit" variant="outline">
                            Approve
                          </Button>
                        </form>
                        <form action={rejectDiscordAutomationExecutionAction}>
                          <input name="executionId" type="hidden" value={execution.id} />
                          <Button disabled={!overview.canApproveAutomation} size="sm" type="submit" variant="ghost">
                            Reject
                          </Button>
                        </form>
                      </div>
                    </div>
                  ))}
                  {overview.automation.pendingApprovals.length === 0 ? (
                    <EmptyState
                      description="Preview-only executions do not require approval until a definition is moved to Manual Approval mode."
                      title="No approval items"
                    />
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-background/35 p-4">
                <h3 className="text-base font-semibold text-foreground">Failed Actions</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Failures remain isolated from the source portal action and can be retried after correction.
                </p>
                <div className="mt-4 space-y-3">
                  {overview.automation.failedActions.slice(0, 6).map((action: AutomationFailedActionItem) => (
                    <div className="rounded-xl border border-border/70 bg-card/60 p-3" key={action.id}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-foreground">{action.roleLabel}</p>
                          <p className="text-sm text-muted-foreground">{action.memberName} / {action.actionType}</p>
                          {action.errorMessage ? (
                            <p className="mt-1 text-xs text-muted-foreground">{action.errorMessage}</p>
                          ) : null}
                        </div>
                        <StatusBadge label={action.retryable ? "Retryable" : "Review"} tone={action.retryable ? "warning" : "danger"} />
                      </div>
                      <form action={retryDiscordAutomationExecutionAction} className="mt-3">
                        <input name="executionId" type="hidden" value={action.executionId} />
                        <Button disabled={!overview.canExecuteAutomation || !action.retryable} size="sm" type="submit" variant="outline">
                          Retry Execution
                        </Button>
                      </form>
                    </div>
                  ))}
                  {overview.automation.failedActions.length === 0 ? (
                    <EmptyState description="No failed Discord role actions are waiting for repair." title="No failed actions" />
                  ) : null}
                </div>
              </div>
            </div>

            <CollapsibleSection
              badgeLabel="Definitions"
              description="Definitions are explainable automation rules generated from existing role mappings. New destructive behavior should stay Preview Only or Manual Approval until validated."
              title="Automation Definitions"
            >
              <InventoryTable
                emptyDescription="Sync definitions from role mappings to populate the automation catalog."
                emptyTitle="No automation definitions"
                rows={overview.automation.definitions.slice(0, 20).map((definition: AutomationDefinitionItem) => ({
                  id: definition.id,
                  meta: `${definition.serverName ?? "No guild"} / ${definition.triggerType}`,
                  status: definition.enabled ? definition.executionMode : "disabled",
                  subtitle: definition.mappingLabel ?? definition.key,
                  title: definition.name,
                }))}
              />
            </CollapsibleSection>

            <CollapsibleSection
              badgeLabel="History"
              description="Execution history preserves preview, approval, no-change, partial success, failure, and retry context."
              title="Recent Automation Executions"
            >
              <InventoryTable
                emptyDescription="Qualification awards, revocations, manual runs, and future unit/status events will appear here when they produce automation plans."
                emptyTitle="No automation history"
                rows={overview.automation.recentExecutions.slice(0, 20).map((execution: AutomationRecentExecutionItem) => ({
                  id: execution.id,
                  meta: `${execution.memberName} / ${execution.createdAtLabel}`,
                  status: execution.status,
                  subtitle: `${execution.executionMode} / ${execution.actionCount} action${execution.actionCount === 1 ? "" : "s"} / ${execution.sourceLabel}`,
                  title: execution.triggerType,
                }))}
              />
            </CollapsibleSection>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          badgeLabel={`${overview.applicationIntegration.summary.pendingReviews} pending`}
          description="Portal-owned applications exposed safely through Discord commands, continuation links, and review routing."
          title="Application Integration"
        >
          <div className="space-y-4" id="discord-applications">
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              <KpiCard
                hint="Application catalog entries currently enabled for Discord exposure."
                label="Catalog"
                tone={overview.applicationIntegration.summary.activeCatalogEntries ? "success" : "muted"}
                value={String(overview.applicationIntegration.summary.activeCatalogEntries)}
              />
              <KpiCard
                hint="Guild-level application policies configured."
                label="Policies"
                tone={overview.applicationIntegration.summary.policyCount ? "info" : "muted"}
                value={String(overview.applicationIntegration.summary.policyCount)}
              />
              <KpiCard
                hint="Active Discord application continuation sessions."
                label="Sessions"
                tone={overview.applicationIntegration.summary.activeSessions ? "warning" : "muted"}
                value={String(overview.applicationIntegration.summary.activeSessions)}
              />
              <KpiCard
                hint="Expired application continuation tokens needing cleanup."
                label="Expired Links"
                tone={overview.applicationIntegration.summary.expiredTokens ? "warning" : "muted"}
                value={String(overview.applicationIntegration.summary.expiredTokens)}
              />
              <KpiCard
                hint="Current Recruit, RASP, and transfer submissions awaiting terminal decision."
                label="Pending Reviews"
                tone={overview.applicationIntegration.summary.pendingReviews ? "warning" : "muted"}
                value={String(overview.applicationIntegration.summary.pendingReviews)}
              />
              <KpiCard
                hint="Review messages requested through the communication platform."
                label="Review Messages"
                tone={overview.applicationIntegration.summary.reviewMessageCount ? "info" : "muted"}
                value={String(overview.applicationIntegration.summary.reviewMessageCount)}
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <CollapsibleSection
                badgeLabel="Catalog"
                description="/apply exposes these Portal-backed entry points. Phase 5-only entries stay unavailable."
                title="Application Catalog"
              >
                <InventoryTable
                  emptyDescription="Run the Discord admin overview after Prisma sync to seed default catalog entries."
                  emptyTitle="No application catalog"
                  rows={overview.applicationIntegration.catalog.map((entry) => ({
                    id: entry.id,
                    meta: entry.applicationTypeKey,
                    status: entry.enabled && !entry.maintenanceMode ? entry.availability : "disabled",
                    subtitle: entry.reviewDestination ?? "No review destination",
                    title: entry.displayName,
                  }))}
                />
              </CollapsibleSection>

              <CollapsibleSection
                badgeLabel="Policies"
                description="Guild policy controls command availability, panels, reviewer quick actions, and testing mode."
                title="Guild Application Policies"
              >
                <InventoryTable
                  emptyDescription="Policies are created when a guild first uses application integration diagnostics or commands."
                  emptyTitle="No guild application policies"
                  rows={overview.applicationIntegration.policies.map((policy) => ({
                    id: policy.id,
                    meta: policy.guildId,
                    status: policy.enabled ? policy.commandAvailability : "disabled",
                    subtitle: `${policy.panelEnabled ? "panel enabled" : "panel disabled"} / ${policy.reviewerQuickActionsEnabled ? "quick actions" : "portal-only actions"} / ${policy.testingMode ? "test mode" : "live mode"}`,
                    title: policy.portalOnlyReviewMode ? "Portal-only review" : "Discord review routing",
                  }))}
                />
              </CollapsibleSection>

              <CollapsibleSection
                badgeLabel="Review"
                description="Review messages are communication records. Sensitive answers remain in the Portal."
                title="Review Messages"
              >
                <InventoryTable
                  emptyDescription="Submitted application review messages will appear after routing through the communication platform."
                  emptyTitle="No review messages"
                  rows={overview.applicationIntegration.reviewMessages.map((message) => ({
                    id: message.id,
                    meta: message.lastPublishedAtLabel ?? "Not published",
                    status: message.status,
                    subtitle: message.submissionId,
                    title: message.applicationType,
                  }))}
                />
              </CollapsibleSection>
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          badgeLabel={`${overview.moderationPlatform.summary.pendingApprovalCount} approvals`}
          description="Case-backed Discord moderation. The Portal owns moderation history; Discord is only the enforcement surface."
          title="Moderation Dashboard"
        >
          <div className="space-y-4" id="discord-moderation">
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-7">
              <KpiCard
                hint="Open incident and appeal cases related to moderation."
                label="Open Cases"
                tone={overview.moderationPlatform.summary.openCaseCount ? "warning" : "muted"}
                value={String(overview.moderationPlatform.summary.openCaseCount)}
              />
              <KpiCard
                hint="Policy-gated actions waiting for staff approval."
                label="Approvals"
                tone={overview.moderationPlatform.summary.pendingApprovalCount ? "warning" : "muted"}
                value={String(overview.moderationPlatform.summary.pendingApprovalCount)}
              />
              <KpiCard
                hint="Warnings are Portal-owned case decisions, not Discord API records."
                label="Warnings"
                tone={overview.moderationPlatform.summary.warningCount ? "info" : "muted"}
                value={String(overview.moderationPlatform.summary.warningCount)}
              />
              <KpiCard
                hint="Timeout actions recorded through case-backed Discord REST execution."
                label="Timeouts"
                tone={overview.moderationPlatform.summary.activeTimeoutCount ? "warning" : "muted"}
                value={String(overview.moderationPlatform.summary.activeTimeoutCount)}
              />
              <KpiCard
                hint="Active ban actions that have not been reversed in Portal history."
                label="Bans"
                tone={overview.moderationPlatform.summary.activeBanCount ? "danger" : "muted"}
                value={String(overview.moderationPlatform.summary.activeBanCount)}
              />
              <KpiCard
                hint="Appeals attached to original cases."
                label="Appeals"
                tone={overview.moderationPlatform.summary.pendingAppealCount ? "warning" : "muted"}
                value={String(overview.moderationPlatform.summary.pendingAppealCount)}
              />
              <KpiCard
                hint="Failed or provider-pending moderation executions."
                label="Failures"
                tone={overview.moderationPlatform.summary.failedActionCount ? "danger" : "muted"}
                value={String(overview.moderationPlatform.summary.failedActionCount)}
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <CollapsibleSection
                badgeLabel="Policies"
                description="Guild moderation policies are independent. Cross-guild enforcement remains manual unless policy explicitly allows it."
                title="Moderation Policies"
              >
                <InventoryTable
                  emptyDescription="Moderation policies are created when staff preview or execute case-backed moderation."
                  emptyTitle="No moderation policies"
                  rows={overview.moderationPlatform.policies.slice(0, 20).map((policy) => ({
                    id: policy.id,
                    meta: policy.guildId,
                    status: policy.isEnabled ? "enabled" : "disabled",
                    subtitle: `Timeout max ${policy.timeoutMaxSeconds}s / kick ${policy.kickApprovalMode} / ban ${policy.banApprovalMode} / ${policy.crossGuildPolicy}`,
                    title: "Guild moderation policy",
                  }))}
                />
              </CollapsibleSection>

              <CollapsibleSection
                badgeLabel="Actions"
                description="Every Discord moderation action must be attached to a Case before execution."
                title="Recent Moderation Actions"
              >
                <InventoryTable
                  emptyDescription="Case-backed warnings, timeouts, kicks, bans, and reversals will appear here."
                  emptyTitle="No moderation actions"
                  rows={overview.moderationPlatform.actions.slice(0, 20).map((action) => ({
                    id: action.id,
                    meta: `${action.guildName} / ${action.caseNumber ?? "No case"}`,
                    status: action.result,
                    subtitle: `${action.targetLabel} / ${action.createdAtLabel}`,
                    title: action.action,
                  }))}
                />
              </CollapsibleSection>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <CollapsibleSection
                badgeLabel="Approvals"
                description="Approval records preserve who requested and decided high-impact moderation."
                title="Moderation Approvals"
              >
                <InventoryTable
                  emptyDescription="Policy-gated moderation approvals will appear here."
                  emptyTitle="No moderation approvals"
                  rows={overview.moderationPlatform.approvals.slice(0, 20).map((approval) => ({
                    id: approval.id,
                    meta: approval.requestedAtLabel,
                    status: approval.status,
                    subtitle: `Case ${approval.caseId}`,
                    title: approval.approvalMode,
                  }))}
                />
              </CollapsibleSection>

              <CollapsibleSection
                badgeLabel="Gateway"
                description="Gateway observations verify Discord-side state, but never execute punishments."
                title="Moderation Observations"
              >
                <InventoryTable
                  emptyDescription="Gateway moderation observations will appear as members leave, bans change, or timeouts are observed."
                  emptyTitle="No moderation observations"
                  rows={overview.moderationPlatform.observations.slice(0, 20).map((observation) => ({
                    id: observation.id,
                    meta: `${observation.targetDiscordUserId} / ${observation.observedAtLabel}`,
                    status: observation.status,
                    subtitle: observation.summary,
                    title: observation.observationType,
                  }))}
                />
              </CollapsibleSection>
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          badgeLabel={overview.gatewayHealth ? `${overview.gatewayHealth.metrics.failedEventCount} failed` : "Not visible"}
          description="Persistent Gateway worker diagnostics. Slash commands, buttons, modals, and REST publishing remain independent from Gateway availability."
          title="Gateway Event Platform"
        >
          <div className="space-y-4" id="discord-gateway">
            {overview.gatewayHealth ? (
              <>
                <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                  <KpiCard
                    hint="Dedicated worker connection state."
                    label="Status"
                    tone={getStatusTone(overview.gatewayHealth.status)}
                    value={overview.gatewayHealth.status}
                  />
                  <KpiCard
                    hint="Reconnects recorded by the worker."
                    label="Reconnects"
                    tone={overview.gatewayHealth.reconnectCount > 5 ? "warning" : "muted"}
                    value={String(overview.gatewayHealth.reconnectCount)}
                  />
                  <KpiCard
                    hint="Failed event queue items with safe summaries."
                    label="Failed Events"
                    tone={overview.gatewayHealth.metrics.failedEventCount ? "danger" : "muted"}
                    value={String(overview.gatewayHealth.metrics.failedEventCount)}
                  />
                  <KpiCard
                    hint="Events skipped by policy, idempotency, or scoped workflow checks."
                    label="Skipped"
                    tone="info"
                    value={String(overview.gatewayHealth.metrics.skippedEventCount)}
                  />
                  <KpiCard
                    hint="Queued or processing events older than expected."
                    label="Stale Queue"
                    tone={overview.gatewayHealth.metrics.staleEventCount ? "warning" : "muted"}
                    value={String(overview.gatewayHealth.metrics.staleEventCount)}
                  />
                  <KpiCard
                    hint="Gateway heartbeat latency when connected."
                    label="Latency"
                    tone={overview.gatewayHealth.latencyMs && overview.gatewayHealth.latencyMs > 1500 ? "warning" : "info"}
                    value={overview.gatewayHealth.latencyMs === null ? "N/A" : `${overview.gatewayHealth.latencyMs}ms`}
                  />
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="rounded-2xl border border-border/70 bg-background/35 p-4">
                    <h3 className="text-base font-semibold text-foreground">Failed Event Queue</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Failed Gateway events are isolated from Portal availability and show sanitized summaries only.
                    </p>
                    <div className="mt-4 space-y-3">
                      {overview.gatewayHealth.failedEvents.map((event) => (
                        <div className="rounded-xl border border-border/70 bg-card/60 p-3" key={event.id}>
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-foreground">{event.eventName}</p>
                              <p className="text-xs text-muted-foreground">
                                {event.handlerId ?? "No handler"} / {event.occurredAtLabel}
                              </p>
                            </div>
                            <StatusBadge label={event.retryable ? "Retryable" : "Review"} tone={event.retryable ? "warning" : "danger"} />
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">{event.errorMessage ?? event.summary}</p>
                        </div>
                      ))}
                      {overview.gatewayHealth.failedEvents.length === 0 ? (
                        <EmptyState description="No failed Gateway events are currently queued." title="Failed queue is clear" />
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-background/35 p-4">
                    <h3 className="text-base font-semibold text-foreground">Handler Registry</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Registry-driven handlers keep transport separate from Portal domain services.
                    </p>
                    <div className="mt-4">
                      <InventoryTable
                        emptyDescription="Gateway handlers are hidden or unavailable."
                        emptyTitle="No handlers visible"
                        rows={overview.gatewayHealth.eventHandlers.map((handler) => ({
                          id: handler.handlerId,
                          meta: `${handler.eventName} / v${handler.version}`,
                          status: handler.enabled ? "enabled" : "disabled",
                          subtitle: `${handler.owningDomain} / ${handler.requiredIntents.join(", ")}`,
                          title: handler.handlerId,
                        }))}
                      />
                    </div>
                  </div>
                </div>

                <CollapsibleSection
                  badgeLabel="Recent"
                  description="Recent Gateway events are operational summaries, not raw payload dumps."
                  title="Recent Gateway Events"
                >
                  <InventoryTable
                    emptyDescription="Gateway event summaries will appear here after the worker observes Discord events."
                    emptyTitle="No recent Gateway events"
                    rows={overview.gatewayHealth.recentEvents.map((event) => ({
                      id: event.id,
                      meta: event.occurredAtLabel,
                      status: event.status,
                      subtitle: event.summary,
                      title: event.eventName,
                    }))}
                  />
                </CollapsibleSection>
              </>
            ) : (
              <EmptyState
                description="Gateway visibility requires Gateway health permissions or a configured worker state."
                title="Gateway health is not visible"
              />
            )}
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          badgeLabel="Diagnostics"
          description="Operational diagnostics are grouped by subsystem so administrators can find what needs attention without scanning the full settings page."
          title="Diagnostics Dashboard"
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" id="discord-diagnostics">
            {[
              {
                description: overview.botHealth.oauthConfigured
                  ? "Discord OAuth configuration is present."
                  : "Discord OAuth credentials need review.",
                label: "OAuth",
                status: overview.botHealth.oauthConfigured ? "ok" : "warning",
              },
              {
                description: "REST health is tracked per guild and updated during discovery/import checks.",
                label: "REST",
                status: overview.platform.healthIssueCount > 0 ? "warning" : "unknown",
              },
              {
                description: overview.gatewayHealth
                  ? `Gateway status is ${overview.gatewayHealth.status}.`
                  : "Gateway health visibility is not granted or worker is not configured.",
                label: "Gateway",
                status: overview.gatewayHealth?.status ?? "unknown",
              },
              {
                description: overview.botHealth.interactionValidationReady
                  ? "Interaction signatures can be validated."
                  : "Discord public key or public endpoint needs review.",
                label: "Interactions",
                status: overview.botHealth.interactionValidationReady ? "ok" : "warning",
              },
              {
                description: overview.botHealth.commandRegistrationReady
                  ? "Slash command registration has required credentials."
                  : "Slash command registration is not fully configured.",
                label: "Commands",
                status: overview.botHealth.commandRegistrationReady ? "ok" : "warning",
              },
              {
                description: `${overview.identitySummary.skippedBotCount} bot accounts skipped from sync history.`,
                label: "Synchronization",
                status: overview.identitySummary.lastSyncStatus ?? "unknown",
              },
            ].map((diagnostic) => (
              <div className="rounded-xl border border-border/70 bg-background/35 p-4" key={diagnostic.label}>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-foreground">{diagnostic.label}</p>
                  <StatusBadge label={diagnostic.status} tone={getStatusTone(diagnostic.status)} />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{diagnostic.description}</p>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          badgeLabel={`${overview.recentActivity.length} recent`}
          description="Meaningful Discord administration, sync, delivery, and automation history. Routine read-only checks should not create noisy audit records."
          title="Audit Trail"
        >
          <div id="discord-audit">
            <InventoryTable
              emptyDescription="Discord audit activity will appear after administrators configure, synchronize, or execute Discord workflows."
              emptyTitle="No recent Discord audit activity"
              rows={overview.recentActivity.map((entry) => ({
                id: entry.id,
                meta: entry.createdAtLabel,
                status: entry.action,
                subtitle: entry.entityLabel,
                title: entry.summary,
              }))}
            />
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          badgeLabel="Safe defaults"
          description="Settings are split across environment variables, guild policies, mappings, and feature-specific sections. This summary keeps the operational defaults visible."
          title="Settings Summary"
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" id="discord-settings">
            <KpiCard
              hint="Use guild mode for development and global mode for production rollout."
              label="Command Mode"
              tone="info"
              value={overview.botHealth.commandRegistrationMode}
            />
            <KpiCard
              hint="Gateway should remain optional for webhook commands."
              label="Gateway"
              tone={overview.gatewayHealth?.enabled ? "info" : "muted"}
              value={overview.gatewayHealth?.enabled ? "Enabled" : "Disabled"}
            />
            <KpiCard
              hint="Bot accounts are excluded unless explicitly enabled by SYNC_DISCORD_BOTS."
              label="Bot Sync"
              tone={overview.identitySummary.botExclusionEnabled ? "success" : "warning"}
              value={overview.identitySummary.botExclusionEnabled ? "Excluded" : "Included"}
            />
            <KpiCard
              hint="Application panels are intentionally not auto-published during Phase 4."
              label="Application Panels"
              tone="muted"
              value="Manual"
            />
          </div>
        </CollapsibleSection>

        {selectedGuild ? (
          <GuildInspector
            channels={selectedChannels}
            emojis={selectedEmojis}
            events={selectedEvents}
            guild={selectedGuild}
            mappings={selectedMappings}
            overview={overview}
            roleMappingCount={selectedRoleMappings.length}
            roles={selectedRoles}
            stickers={selectedStickers}
            onClose={() => setSelectedGuildId(null)}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function GuildInspector({
  channels,
  emojis,
  events,
  guild,
  mappings,
  onClose,
  overview,
  roleMappingCount,
  roles,
  stickers,
}: {
  channels: DiscordAdministrationOverview["guildChannels"];
  emojis: DiscordAdministrationOverview["guildEmojis"];
  events: DiscordAdministrationOverview["guildEvents"];
  guild: DiscordServerAdminItem;
  mappings: DiscordAdministrationOverview["channelMappings"];
  onClose: () => void;
  overview: DiscordAdministrationOverview;
  roleMappingCount: number;
  roles: DiscordAdministrationOverview["guildRoles"];
  stickers: DiscordAdministrationOverview["guildStickers"];
}) {
  const guildReconciliationItems = overview.discovery.reconciliationItems.filter(
    (item) => item.serverId === guild.id,
  );
  const guildDiscoverySessions = overview.discovery.sessions.filter(
    (session) => session.serverId === guild.id,
  );

  return (
    <InspectorDrawer
      open
      onClose={onClose}
      size="extra-wide"
      statusBadge={{ label: `${guild.healthScore}% health`, tone: getHealthTone(guild.healthScore) }}
      subtitle={`${guild.guildType} guild / ${guild.guildId}`}
      title={guild.name}
      tabPanels={[
        {
          label: "Overview",
          content: (
            <div className="grid gap-4 md:grid-cols-2">
              <KpiCard label="Channels" value={String(channels.length)} tone="info" hint="Imported channel inventory." />
              <KpiCard label="Roles" value={String(roles.length)} tone="info" hint="Imported role inventory." />
              <KpiCard label="Events" value={String(events.length)} tone="info" hint="Scheduled Discord events discovered." />
              <KpiCard label="Emoji" value={String(emojis.length)} tone="info" hint="Emoji inventory discovered." />
              <KpiCard label="Mappings" value={String(mappings.length)} tone="success" hint="Explicit channel mappings." />
              <KpiCard label="Role Maps" value={String(roleMappingCount)} tone="info" hint="Explicit role automation targets." />
              <KpiCard label="Reconcile" value={String(guildReconciliationItems.length)} tone={guildReconciliationItems.length ? "warning" : "muted"} hint="Open and recent drift items." />
              <KpiCard label="Recommendations" value={String(guild.recommendations.length)} tone={guild.recommendations.length ? "warning" : "muted"} hint="Actionable guild recommendations." />
            </div>
          ),
        },
        {
          label: "General",
          content: (
            <div className="rounded-2xl border border-border/70 bg-background/35 p-4 text-sm text-muted-foreground">
              <p>Display name: {guild.name}</p>
              <p>Guild type: {guild.guildType}</p>
              <p>Status: {guild.status}</p>
              <p>Primary community guild: {guild.isPrimary ? "yes" : "no"}</p>
              <p>Unit: {guild.unitName ?? "Global / not unit-scoped"}</p>
              <p>Last discovery: {guild.lastDiscoveryAtLabel ?? "Never"}</p>
              <p>Last sync: {guild.lastSyncAtLabel ?? "Never"}</p>
            </div>
          ),
        },
        {
          label: "Channels",
          content: (
            <InventoryTable
              emptyDescription="Run inventory import to populate Discord channels."
              emptyTitle="No imported channels"
              rows={channels.map((channel) => ({
                id: channel.id,
                meta: channel.channelId,
                status: channel.isArchived || channel.isMissing ? "missing" : channel.mappedKey ? "mapped" : "unmapped",
                subtitle: `${channel.channelType} / last seen ${channel.lastSeenAtLabel}`,
                title: channel.name,
              }))}
            />
          ),
        },
        {
          label: "Roles",
          content: (
            <InventoryTable
              emptyDescription="Run inventory import to populate Discord roles."
              emptyTitle="No imported roles"
              rows={roles.map((role) => ({
                id: role.id,
                meta: role.roleId,
                status: role.isArchived || role.isMissing ? "missing" : role.mappedType ? "mapped" : "unmapped",
                subtitle: `${role.managed ? "Managed" : "Manual"} / last seen ${role.lastSeenAtLabel}`,
                title: role.name,
              }))}
            />
          ),
        },
        {
          label: "Events",
          content: (
            <InventoryTable
              emptyDescription="Run discovery to populate Discord scheduled events."
              emptyTitle="No discovered scheduled events"
              rows={events.map((event) => ({
                id: event.id,
                meta: event.eventId,
                status: event.isMissing ? "missing" : event.status,
                subtitle: event.scheduledStartAtLabel ?? "No scheduled start",
                title: event.name,
              }))}
            />
          ),
        },
        {
          label: "Emoji",
          content: (
            <InventoryTable
              emptyDescription="Run discovery to populate custom emoji and sticker inventory."
              emptyTitle="No discovered emoji or stickers"
              rows={[
                ...emojis.map((emoji) => ({
                  id: emoji.id,
                  meta: emoji.emojiId,
                  status: emoji.isMissing ? "missing" : emoji.available ? "available" : "unavailable",
                  subtitle: emoji.animated ? "Animated emoji" : "Static emoji",
                  title: emoji.name,
                })),
                ...stickers.map((sticker) => ({
                  id: sticker.id,
                  meta: sticker.stickerId,
                  status: sticker.isMissing ? "missing" : sticker.available ? "available" : "unavailable",
                  subtitle: `Sticker / ${sticker.formatType}`,
                  title: sticker.name,
                })),
              ]}
            />
          ),
        },
        {
          label: "Communications",
          content: (
            <InventoryTable
              emptyDescription="Map announcement, event, operational release, application, moderation, and system destinations explicitly."
              emptyTitle="No channel mappings"
              rows={mappings.map((mapping) => ({
                id: mapping.id,
                meta: mapping.channelId,
                status: mapping.isActive ? "active" : "disabled",
                subtitle: mapping.description ?? "No description",
                title: mapping.key,
              }))}
            />
          ),
        },
        {
          label: "Synchronization",
          content: (
            <div className="space-y-4">
              <form action={runDiscordMemberSyncAction} className="rounded-2xl border border-border/70 bg-background/35 p-4">
                <input name="discordServerId" type="hidden" value={guild.id} />
                <Button disabled={!overview.canRunMemberSync} type="submit" variant="outline">
                  Refresh Members Now
                </Button>
              </form>
              <form action={previewDiscordRoleSyncAction} className="rounded-2xl border border-border/70 bg-background/35 p-4">
                <input name="discordServerId" type="hidden" value={guild.id} />
                <Button disabled={!overview.canViewSync} type="submit" variant="outline">
                  Preview Role Synchronization
                </Button>
              </form>
            </div>
          ),
        },
        {
          label: "Gateway",
          content: (
            <div className="rounded-2xl border border-border/70 bg-background/35 p-4 text-sm text-muted-foreground">
              <p>Enabled: {guild.gatewayEnabled ? "yes" : "no"}</p>
              <p>Guild gateway state: {guild.gatewayStatus}</p>
              <p>Worker status: {overview.gatewayHealth?.status ?? "not visible"}</p>
              <p>Latency: {overview.gatewayHealth?.latencyMs ?? "unavailable"}</p>
              <p>Reconnect count: {overview.gatewayHealth?.reconnectCount ?? "unavailable"}</p>
            </div>
          ),
        },
        {
          label: "Diagnostics",
          content: (
            <div className="space-y-3">
              {guild.recommendations.map((recommendation) => (
                <div className="rounded-xl border border-border/70 bg-background/35 p-4" key={recommendation.id}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-foreground">{recommendation.title}</p>
                    <StatusBadge label={recommendation.severity} tone={getRecommendationTone(recommendation.severity)} />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{recommendation.description}</p>
                </div>
              ))}
              {guild.recommendations.length === 0 ? (
                <EmptyState description="No actionable recommendations for this guild." title="Diagnostics are clear" />
              ) : null}
            </div>
          ),
        },
        {
          label: "Discovery",
          content: (
            <div className="space-y-4">
              <InventoryTable
                emptyDescription="Run discovery to compare current Discord resources against portal inventory."
                emptyTitle="No discovery sessions"
                rows={guildDiscoverySessions.map((session) => ({
                  id: session.id,
                  meta: session.createdAtLabel,
                  status: session.status,
                  subtitle: `${session.discoveryType} / ${session.resourcesFetched} fetched / ${session.resourcesMissing} missing`,
                  title: session.completedAtLabel ?? "In progress",
                }))}
              />
              <InventoryTable
                emptyDescription="No resource drift or mapping impact has been detected for this guild."
                emptyTitle="No reconciliation items"
                rows={guildReconciliationItems.map((item) => ({
                  id: item.id,
                  meta: `${item.resourceType}:${item.resourceId}`,
                  status: item.status === "open" ? item.severity : item.status,
                  subtitle: item.recommendedAction,
                  title: item.title,
                }))}
              />
            </div>
          ),
        },
        {
          label: "Audit",
          content: (
            <InventoryTable
              emptyDescription="Discord audit activity will appear as administrators configure and synchronize guilds."
              emptyTitle="No recent guild audit activity"
              rows={overview.recentActivity.slice(0, 8).map((entry) => ({
                id: entry.id,
                meta: entry.createdAtLabel,
                status: entry.action,
                subtitle: entry.entityLabel,
                title: entry.summary,
              }))}
            />
          ),
        },
      ]}
    />
  );
}

function InventoryTable({
  emptyDescription,
  emptyTitle,
  rows,
}: {
  emptyDescription: string;
  emptyTitle: string;
  rows: Array<{
    id: string;
    meta: string;
    status: string;
    subtitle: string;
    title: string;
  }>;
}) {
  if (rows.length === 0) {
    return <EmptyState description={emptyDescription} title={emptyTitle} />;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border/70">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden md:table-cell">Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <div>
                  <p className="font-semibold text-foreground">{row.title}</p>
                  <p className="text-xs text-muted-foreground">{row.meta}</p>
                </div>
              </TableCell>
              <TableCell>
                <StatusBadge label={row.status} tone={getStatusTone(row.status)} />
              </TableCell>
              <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                {row.subtitle}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
