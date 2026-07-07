import { administrationPermissions } from "@/features/administration/permissions";
import type { PlaceholderPageConfig } from "@/types/placeholder-page";

export const administrationPageConfigs = {
  overview: {
    route: "/administration",
    title: "Administration",
    description: "Top-level administration workspace placeholder spanning users, roles, Discord settings, and system controls.",
    breadcrumbs: ["Administration"],
    primaryAction: { label: "Open Users", href: "/administration/users" },
    secondaryActions: [{ label: "Review Audit Logs", href: "/administration/audit-logs", variant: "outline" }],
    requiredPermissions: administrationPermissions.overview,
    quickActionMenuItems: ["Inspect user link placeholder", "Open roles", "Open Discord settings"],
    summary: [
      { label: "Active Users", value: "42", hint: "Portal user management placeholder", tone: "info", variant: "widget" },
      { label: "Roles", value: "09", hint: "System-defined role shell", tone: "success", variant: "kpi" },
      { label: "Discord Mappings", value: "12", hint: "Integration placeholder count", tone: "warning", variant: "kpi" },
      { label: "Audit Events", value: "128", hint: "Future review queue", tone: "muted", variant: "kpi" },
    ],
    sections: [
      {
        title: "Administration hub",
        description: "This route acts as the overview page for the admin module during foundation work.",
        items: [
          "Sub-routes already exist for users, roles, Discord settings, audit logs, and system settings.",
          "The same page shell can support permission-aware widgets later without layout churn.",
          "No real administration logic or mutations are enabled yet.",
        ],
      },
    ],
    showLoadingSkeleton: true,
  },
  users: {
    route: "/administration/users",
    title: "Users",
    description: "Manage portal users and profile linking through a placeholder admin table.",
    breadcrumbs: ["Administration", "Users"],
    primaryAction: { label: "Link Profile" },
    secondaryActions: [{ label: "Assign Role", variant: "outline" }],
    requiredPermissions: administrationPermissions.users,
    quickActionMenuItems: ["Inspect user placeholder", "Open role assignment", "Queue deactivate review"],
    table: {
      title: "Portal users",
      description: "User management shell with role and profile-linking placeholders.",
      columns: ["Name", "Discord ID", "Linked Profile", "Active", "Roles", "Last Login", "Actions"],
      filters: ["Active", "Linked Profile", "Role"],
      searchPlaceholder: "Search users, Discord IDs, linked profiles, or roles",
      actionMenuItems: ["Inspect user", "Assign role", "Link profile"],
      rows: [
        ["Alex Mercer", "4211...", "Yes", "Yes", "Portal Admin", "Today", "Manage"],
        ["Harper Vale", "5520...", "Yes", "Yes", "Operations Lead", "Yesterday", "Manage"],
        ["Jordan Pike", "7812...", "No", "No", "Member", "Never", "Manage"],
      ],
    },
    inspector: {
      title: "User inspector",
      subtitle: "Portal user details, linked profile state, and admin actions can stay in a drawer instead of another page.",
      triggerLabel: "Inspect User",
      statusBadge: {
        label: "Admin Ready",
        tone: "info",
      },
      tabs: ["Summary", "Roles", "Access"],
      sections: [
        {
          title: "Summary",
          description: "Show the linked profile, Discord identity, and active state in one compact surface.",
          items: [
            "Keep user linking and activation workflows one click away.",
            "Avoid sending admins through unnecessary page transitions.",
          ],
        },
        {
          title: "Roles",
          description: "Role assignments and scoped access can be summarized before opening the full roles UI.",
          items: [
            "System-defined roles and scoped grants stay visible here.",
            "Reserve direct links into roles and permissions management.",
          ],
        },
        {
          title: "Access",
          description: "This drawer can hold last-login and permission snapshots later.",
          items: [
            "Highlight inactive, unlinked, or stale accounts.",
            "Keep administration context close to the user list.",
          ],
        },
      ],
      actions: [
        { label: "Assign Role" },
        { label: "Link Profile", variant: "secondary" },
      ],
    },
  },
  roles: {
    route: "/administration/roles",
    title: "Roles & Permissions",
    description: "Allow admins to create roles and assign system-defined permissions using placeholder management panels.",
    breadcrumbs: ["Administration", "Roles & Permissions"],
    primaryAction: { label: "Create Role", href: "/administration/roles?panel=create" },
    secondaryActions: [{ label: "View Effective Permissions", variant: "outline" }],
    requiredPermissions: administrationPermissions.roles,
    quickActionMenuItems: ["Inspect role", "Open permission group", "Queue role review"],
    sections: [
      {
        title: "Permission management frame",
        description: "Role list, role detail, permission groups, and user assignments are all represented in the shell.",
        items: [
          "Permissions remain system-defined per the docs, with no role-name authorization shortcuts.",
          "Unit-scoped assignment support is preserved through the Prisma foundation schema.",
          "Effective-permission analysis can attach later without changing route structure.",
        ],
      },
    ],
    timeline: {
      title: "Permission activity",
      description: "Roles and permission changes should be auditable and easy to review.",
    },
  },
  discord: {
    route: "/administration/discord",
    title: "Discord Settings",
    description: "Configure Discord servers, channel mappings, role mappings, and bot status through placeholder-only admin panels.",
    breadcrumbs: ["Administration", "Discord Settings"],
    primaryAction: { label: "Add Server Mapping", href: "/administration/discord", variant: "default" },
    secondaryActions: [{ label: "Test Notification", href: "/administration/discord", variant: "outline" }],
    requiredPermissions: administrationPermissions.discord,
    quickActionMenuItems: ["Inspect server mapping", "Open channel routing", "Queue health check"],
    summary: [
      { label: "Connected Servers", value: "01", hint: "Discord server placeholder", tone: "info", variant: "widget" },
      { label: "Channel Mappings", value: "12", hint: "Routing structure placeholder", tone: "success", variant: "kpi" },
      { label: "Role Mappings", value: "09", hint: "Permission sync target", tone: "warning", variant: "kpi" },
      { label: "Bot Health", value: "Pending", hint: "Integration intentionally deferred", tone: "muted", variant: "readiness" },
    ],
    sections: [
      {
        title: "Discord integration boundary",
        description: "The route exists now, but live Discord configuration is intentionally out of scope for Milestone 1.",
        items: [
          "Server, channel, and role mapping tables can be added without reworking navigation.",
          "Delivery failures and bot health each have reserved admin surface area.",
          "This foundation does not perform any Discord API calls or sync operations.",
        ],
      },
    ],
    activityFeed: {
      title: "Discord admin signals",
      description: "Discord should complement the portal, and this page reserves the routing surface for that relationship.",
    },
  },
  auditLogs: {
    route: "/administration/audit-logs",
    title: "Audit Logs",
    description: "Review important administrative actions through a placeholder search and filter view.",
    breadcrumbs: ["Administration", "Audit Logs"],
    primaryAction: { label: "View Details" },
    secondaryActions: [{ label: "Export Later", variant: "outline" }],
    requiredPermissions: administrationPermissions.auditLogs,
    quickActionMenuItems: ["Inspect audit event", "Filter by actor", "Prepare export"],
    table: {
      title: "Audit log stream",
      description: "Foundation table for future actor, action, entity, and date filters.",
      columns: ["Actor", "Action", "Entity Type", "Entity ID", "Summary", "Timestamp"],
      filters: ["Actor", "Action", "Entity Type", "Date Range", "Search"],
      searchPlaceholder: "Search actors, actions, entities, or event summaries",
      actionMenuItems: ["Inspect event", "Open actor", "Prepare export"],
      rows: [
        ["Alex Mercer", "role.assign", "User", "user_01", "Assigned Portal Admin", "Today 09:10"],
        ["Harper Vale", "campaign.edit", "Campaign", "cmp_03", "Updated phase label", "Yesterday 21:04"],
        ["System", "discord.mapping.test", "DiscordServer", "srv_01", "Queued placeholder test", "Yesterday 18:22"],
      ],
    },
    timeline: {
      title: "Audit cadence",
      description: "Audit review should stay contextual and searchable from the log surface itself.",
    },
  },
  settings: {
    route: "/administration/settings",
    title: "System Settings",
    description: "Placeholder workspace for future environment, feature, and platform-level settings.",
    breadcrumbs: ["Administration", "System Settings"],
    primaryAction: { label: "Edit Setting" },
    requiredPermissions: administrationPermissions.settings,
    sections: [
      {
        title: "Settings surface reserved",
        description: "Global settings are represented in the Prisma schema and route map, but remain inert here.",
        items: [
          "Feature flags, notification defaults, and integration settings can land here later.",
          "The page shell is intentionally conservative and reusable.",
          "No mutable settings or persistence logic are implemented in Milestone 1.",
        ],
      },
    ],
    emptyState: {
      title: "No system settings exposed yet",
      description: "Setting management will be added alongside the relevant production modules.",
      actionLabel: "Reserve Settings Panels",
    },
  },
} satisfies Record<string, PlaceholderPageConfig>;
