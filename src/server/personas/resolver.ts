import type { PortalUser } from "@/features/auth/types";
import { can } from "@/server/permissions/access";
import { personaDashboardProfiles, personaProfiles } from "@/server/personas/profiles";
import type {
  PersonaId,
  PersonaProfile,
  PersonaQuickAction,
  WorkspaceId,
  WorkspaceOption,
  WorkspaceProfile,
} from "@/server/personas/types";

const workspaceOrder: WorkspaceId[] = [
  "my_portal",
  "patrol_leader",
  "unit_leadership",
  "personnel",
  "operations",
  "deployment_creator",
  "zeus",
  "training",
  "command",
  "community",
  "administration",
  "developer",
];

function canAny(user: PortalUser, permissionKeys: string[]) {
  return permissionKeys.some((permissionKey) => can(user, permissionKey));
}

function hasMultipleCommandDomains(user: PortalUser) {
  const commandSignals = [
    canAny(user, ["s3.dashboard.view", "operations.health.view", "operations.readiness.view"]),
    canAny(user, ["personnel.dashboard.view", "units.dashboard.view"]),
    canAny(user, ["community.view", "communications.view"]),
    canAny(user, ["notifications.delivery.view", "audit.view"]),
  ];

  return commandSignals.filter(Boolean).length >= 2;
}

function isPersonaApplicable(user: PortalUser, personaId: PersonaId) {
  switch (personaId) {
    case "community_member":
      return true;
    case "patrol_leader":
      return canAny(user, ["patrols.lead", "patrols.create", "patrols.complete", "patrols.aar.submit", "aars.submit"]);
    case "unit_leadership":
      return canAny(user, ["units.dashboard.view", "roster.member.edit", "roster.unit.assign", "roster.position.assign"]);
    case "s1_personnel":
      return canAny(user, [
        "personnel.dashboard.view",
        "personnel.profile.create",
        "personnel.profile.edit",
        "roster.member.edit",
        "roster.status.change",
        "discord.identity.merge",
      ]);
    case "s3_operations":
      return canAny(user, [
        "s3.dashboard.view",
        "operations.package.view",
        "operations.package.edit",
        "operations.package.publish",
        "events.create",
        "events.publish",
        "s3.aars.review",
      ]);
    case "deployment_creator":
      return canAny(user, [
        "campaigns.create",
        "campaigns.edit",
        "deployments.progression.view",
        "deployments.progression.manage",
      ]);
    case "zeus":
      return canAny(user, ["operations.zeus.assign", "s3.zeus.assign", "operations.package.view"]);
    case "training_staff":
      return canAny(user, [
        "qualifications.record.award",
        "qualifications.record.edit",
        "qualifications.requirements.manage",
        "qualifications.signoff.manage",
        "qualifications.matrix.view",
      ]);
    case "command_staff":
      return hasMultipleCommandDomains(user) || canAny(user, ["recommendations.view", "operations.recommendations.view", "audit.view"]);
    case "community_manager":
      return canAny(user, ["community.view", "community.cases.manage", "communications.view", "communications.send"]);
    case "administrator":
      return canAny(user, [
        "admin.users.view",
        "admin.roles.view",
        "admin.permissions.view",
        "discord.view",
        "notifications.delivery.view",
        "audit.view",
      ]);
    case "developer":
      return canAny(user, ["builder.view", "admin.settings.view", "discord.diagnostics.view"]);
  }
}

export function resolveApplicablePersonas(user: PortalUser): PersonaProfile[] {
  return (Object.keys(personaProfiles) as PersonaId[])
    .filter((personaId) => isPersonaApplicable(user, personaId))
    .map((personaId) => personaProfiles[personaId])
    .sort((left, right) => right.priority - left.priority);
}

function getPrimaryPersona(personas: PersonaProfile[]) {
  return personas[0] ?? personaProfiles.community_member;
}

function groupWorkspaces(personas: PersonaProfile[], selectedWorkspaceId: WorkspaceId) {
  const byWorkspace = new Map<WorkspaceId, PersonaProfile[]>();

  for (const persona of personas) {
    const current = byWorkspace.get(persona.workspaceId) ?? [];
    current.push(persona);
    byWorkspace.set(persona.workspaceId, current);
  }

  return Array.from(byWorkspace.entries())
    .sort(([left], [right]) => workspaceOrder.indexOf(left) - workspaceOrder.indexOf(right))
    .map(([workspaceId, workspacePersonas]): WorkspaceOption => {
      const representative = workspacePersonas[0];

      return {
        defaultRoute: representative.defaultRoute,
        description: personaDashboardProfiles[workspaceId].description,
        id: workspaceId,
        isCurrent: workspaceId === selectedWorkspaceId,
        label: personaDashboardProfiles[workspaceId].label,
        personaIds: workspacePersonas.map((persona) => persona.id),
      };
    });
}

function validateSelectedWorkspace(personas: PersonaProfile[], requestedWorkspaceId?: string | null): WorkspaceId {
  const requested = requestedWorkspaceId as WorkspaceId | undefined;

  if (requested && requestedWorkspaceId !== "automatic" && personas.some((persona) => persona.workspaceId === requested)) {
    return requested;
  }

  return getPrimaryPersona(personas).workspaceId;
}

export function getWorkspaceDefaultRoute(profile: WorkspaceProfile, workspaceId: WorkspaceId) {
  return profile.workspaceOptions.find((workspace) => workspace.id === workspaceId)?.defaultRoute ?? profile.defaultRoute;
}

function buildQuickActions(user: PortalUser, workspaceId: WorkspaceId): PersonaQuickAction[] {
  const actions: PersonaQuickAction[] = [
    {
      href: "/operations/this-week",
      id: "open-current-operation",
      label: "Open Current Operation",
      reason: "Member-facing operation, tasking, RSVP, and resources.",
      workspaceIds: ["my_portal", "zeus", "unit_leadership"],
    },
    {
      href: "/operations/patrols?panel=start",
      id: "start-patrol",
      label: "Start Patrol",
      reason: "Launch a lightweight patrol with inherited context.",
      workspaceIds: ["patrol_leader", "operations"],
    },
    {
      href: "/operations/patrols#awaiting-aar",
      id: "submit-aar",
      label: "Submit Patrol AAR",
      reason: "Complete required Patrol AAR follow-up.",
      workspaceIds: ["patrol_leader", "operations"],
    },
    {
      href: "/operations",
      id: "open-operations-center",
      label: "Open Operations Center",
      reason: "Review current package, readiness, publication, and AAR queues.",
      workspaceIds: ["operations", "command"],
    },
    {
      href: "/operations/deployments",
      id: "open-deployments",
      label: "Open Deployments",
      reason: "Manage deployment setup, resources, releases, and progression.",
      workspaceIds: ["deployment_creator", "operations"],
    },
    {
      href: "/personnel",
      id: "open-personnel-readiness",
      label: "Open Personnel Readiness",
      reason: "Review personnel actions, identity issues, status, and roster health.",
      workspaceIds: ["personnel", "command"],
    },
    {
      href: "/training/qualification-matrix",
      id: "open-qualification-matrix",
      label: "Open Qualification Matrix",
      reason: "Review qualification requirements, signoffs, and training gaps.",
      workspaceIds: ["training", "unit_leadership"],
    },
    {
      href: "/community-management",
      id: "open-community-cases",
      label: "Review Critical Cases",
      reason: "Open casework, appeals, incidents, and moderation queue.",
      workspaceIds: ["community", "command"],
    },
    {
      href: "/administration/discord#identity-sync",
      id: "review-identity-sync",
      label: "Review Identity Sync",
      reason: "Inspect Discord identity linking, duplicates, and sync health.",
      workspaceIds: ["administration", "developer"],
    },
    {
      href: "/administration/builder",
      id: "open-builder",
      label: "Open Builder",
      reason: "Review platform builder foundations and registries.",
      workspaceIds: ["developer"],
    },
  ];

  return actions.filter((action) => {
    if (!action.workspaceIds.includes(workspaceId)) {
      return false;
    }

    switch (action.id) {
      case "start-patrol":
        return canAny(user, ["patrols.create", "patrols.lead"]);
      case "submit-aar":
        return canAny(user, ["aars.submit", "patrols.aar.submit", "s3.aars.submit"]);
      case "open-operations-center":
        return canAny(user, ["s3.dashboard.view", "operations.center.view"]);
      case "open-deployments":
        return can(user, "campaigns.view");
      case "open-personnel-readiness":
        return canAny(user, ["personnel.dashboard.view", "personnel.profile.view"]);
      case "open-qualification-matrix":
        return can(user, "qualifications.matrix.view");
      case "open-community-cases":
        return can(user, "community.view");
      case "review-identity-sync":
        return canAny(user, ["discord.view", "discord.identity.view", "admin.users.view"]);
      case "open-builder":
        return can(user, "builder.view");
      default:
        return true;
    }
  });
}

export function resolveWorkspaceProfile(user: PortalUser, requestedWorkspaceId?: string | null): WorkspaceProfile {
  const applicablePersonas = resolveApplicablePersonas(user);
  const primaryPersona = getPrimaryPersona(applicablePersonas);
  const selectedWorkspaceId = validateSelectedWorkspace(applicablePersonas, requestedWorkspaceId);
  const workspaceOptions = groupWorkspaces(applicablePersonas, selectedWorkspaceId);
  const isAutomatic = !requestedWorkspaceId || requestedWorkspaceId === "automatic";

  return {
    applicablePersonas,
    criticalAlertPolicy: "Critical cross-domain alerts remain visible when the user owns or may act on them.",
    dashboardProfile: personaDashboardProfiles[selectedWorkspaceId],
    defaultRoute: personaProfiles[primaryPersona.id].defaultRoute,
    isAutomatic,
    primaryPersona,
    quickActions: buildQuickActions(user, selectedWorkspaceId),
    selectedWorkspace: workspaceOptions.find((workspace) => workspace.id === selectedWorkspaceId) ?? workspaceOptions[0],
    workspaceOptions,
  };
}

export function isWorkspaceAllowed(user: PortalUser, workspaceId: string) {
  return resolveApplicablePersonas(user).some((persona) => persona.workspaceId === workspaceId);
}
