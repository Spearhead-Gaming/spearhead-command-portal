import { personnelPermissions } from "@/features/personnel/permissions";
import type { PlaceholderPageConfig } from "@/types/placeholder-page";

export const personnelPageConfigs = {
  membersList: {
    route: "/personnel/members",
    title: "Member List",
    description: "Search and browse member profiles through the shared data-table foundation.",
    breadcrumbs: ["Personnel", "Members"],
    primaryAction: { label: "Create Member", href: "/personnel/members?panel=create" },
    secondaryActions: [{ label: "Export Later", variant: "outline" }],
    requiredPermissions: personnelPermissions.membersList,
    quickActionMenuItems: ["Inspect selected member", "Open roster workspace", "Queue profile review"],
    summary: [
      { label: "Profiles", value: "148", hint: "Placeholder member count", tone: "info", variant: "kpi" },
      { label: "Discord Linked", value: "132", hint: "Auth-ready integration target", tone: "success", variant: "kpi" },
      { label: "Active", value: "119", hint: "Status badge placeholder pattern", tone: "warning", variant: "widget" },
      { label: "Needs Review", value: "06", hint: "Future workflow queue slot", tone: "muted", variant: "kpi" },
    ],
    table: {
      title: "Member directory",
      description: "Table shell for browsing official service records.",
      columns: ["Member / Discord Name", "Unit", "Position", "Status", "Join Date", "Discord Linked", "Actions"],
      filters: ["Unit", "Status", "Qualification", "Discord Linked"],
      searchPlaceholder: "Search members, display names, callsigns, or linked Discord identities",
      actionMenuItems: ["Inspect member", "Open profile", "Queue note"],
      rows: [
        ["Alex Mercer", "MAJ", "Spearhead Command", "CO", "Active", "2024-08-12", "Yes", "Open"],
        ["Harper Vale", "CPT", "Reaper", "XO", "Active", "2025-01-18", "Yes", "Open"],
        ["Jordan Pike", "SSG", "Viking", "JTAC", "LOA", "2025-03-07", "No", "Open"],
      ],
    },
    sections: [
      {
        title: "Profile browsing pattern",
        description: "The first build focuses on shared search, filters, and responsive list behavior.",
        items: [
          "Rows, filters, and empty states are scaffolded but not connected to live data.",
          "Profile drill-down routes already exist for future service integration.",
          "Permission-based row actions can be attached later through the same page shell.",
        ],
      },
    ],
    inspector: {
      title: "Member inspector",
      subtitle: "Right-side drawer placeholder for fast profile inspection without losing list context.",
      triggerLabel: "Inspect Member",
      statusBadge: {
        label: "Active",
        tone: "success",
      },
      tabs: ["Summary", "Qualifications", "History"],
      sections: [
        {
          title: "Summary",
          description: "The profile header, unit, position, and contact summary can live here later.",
          items: [
            "Display unit, position, profile status, and optional rank context at a glance.",
            "Keep one-click transitions to the full member profile route.",
            "Reserve fast actions like add note or award qualification.",
          ],
        },
        {
          title: "Qualifications",
          description: "Qualification chips and readiness snapshots stay visible without leaving the member list.",
          items: [
            "Qualification badges can share the same visual language as the training module.",
            "Expiring or missing qualifications can surface here as operational warnings.",
          ],
        },
        {
          title: "History",
          description: "Service timeline and audit-like context can slide into the drawer later.",
          items: [
            "Recent attendance, status changes, and notes can remain one click away.",
            "This preserves context over navigation for personnel reviews.",
          ],
        },
      ],
      actions: [
        { label: "Open Profile", href: "/personnel/members" },
        { label: "Add Note", variant: "secondary" },
      ],
    },
    activityFeed: {
      title: "Personnel activity",
      description: "People workflows should stay searchable, inspectable, and low-click.",
    },
    showLoadingSkeleton: true,
  },
  memberProfile: {
    route: "/personnel/members/[id]",
    title: "Member Profile",
    description: "Display a member service record using reusable section, badge, and timeline-ready placeholders.",
    breadcrumbs: ["Personnel", "Members", "Profile"],
    primaryAction: { label: "Edit Profile" },
    secondaryActions: [
      { label: "Change Rank", variant: "outline" },
      { label: "Assign Unit", variant: "secondary" },
    ],
    requiredPermissions: personnelPermissions.memberProfile,
    quickActionMenuItems: ["Award qualification", "Add note", "Open service timeline"],
    summary: [
      { label: "Unit", value: "Spearhead Command", hint: "Unit badge slot", tone: "success", variant: "widget" },
      { label: "Status", value: "Active", hint: "Status badge pattern", tone: "warning", variant: "kpi" },
      { label: "Qualifications", value: "12", hint: "Training summary card", tone: "muted", variant: "kpi" },
      { label: "Attendance", value: "88%", hint: "Operational participation", tone: "info", variant: "widget" },
    ],
    sections: [
      {
        title: "Profile sections reserved",
        description: "This page is structured for the service record detail layout from the MVP screen map.",
        items: [
          "Unit, position, status, qualification, and attendance summary area is ready for real profile data.",
          "Optional rank badges and deployment participation can layer in later.",
          "Notes and audit logs remain placeholder-only until permissions and services are implemented.",
        ],
      },
      {
        title: "Action surface",
        description: "Common profile actions stay close to the header to preserve user context.",
        items: [
          "Edit profile, assign unit, and change status have reserved action slots.",
          "Inspector drawers or inline editors can attach without changing the page frame.",
          "The route already supports dynamic member IDs through the App Router detail pattern.",
        ],
      },
    ],
    timeline: {
      title: "Service timeline",
      description: "Profiles should keep service history and readiness changes close to the record.",
    },
  },
  roster: {
    route: "/personnel/roster",
    title: "Roster",
    description: "Provide a fast roster management view with the documented emphasis on low-click editing.",
    breadcrumbs: ["Personnel", "Roster"],
    primaryAction: { label: "Bulk Update" },
    secondaryActions: [{ label: "Change Status", variant: "outline" }],
    requiredPermissions: personnelPermissions.roster,
    quickActionMenuItems: ["Inspect roster slot", "Queue bulk update", "Open missing quals view"],
    summary: [
      { label: "Rostered", value: "97", hint: "Placeholder roster strength", tone: "success", variant: "kpi" },
      { label: "LOA", value: "05", hint: "Quick status visibility", tone: "warning", variant: "kpi" },
      { label: "Missing Quals", value: "14", hint: "Readiness follow-up slot", tone: "danger", variant: "readiness" },
      { label: "Updated Today", value: "08", hint: "Future audit surface", tone: "muted", variant: "widget" },
    ],
    table: {
      title: "Roster management table",
      description: "Built to support inline edits and future bulk actions.",
      columns: ["Member", "Rank", "Unit", "Position", "Status", "Attendance", "Required Qualifications", "Last Updated", "Actions"],
      filters: ["Unit", "Rank", "Position", "Status", "Missing Qualifications", "LOA/Inactive"],
      searchPlaceholder: "Search roster assignments, positions, or readiness issues",
      actionMenuItems: ["Inspect slot", "Change status", "Assign position"],
      rows: [
        ["Harper Vale", "CPT", "Reaper", "XO", "Active", "92%", "1 Missing", "Today", "Edit"],
        ["Jordan Pike", "SSG", "Viking", "JTAC", "LOA", "74%", "Complete", "Yesterday", "Edit"],
        ["Chris Rowan", "SGT", "Misfit", "Rifleman", "Active", "88%", "2 Missing", "Today", "Edit"],
      ],
    },
    sections: [
      {
        title: "Low-navigation editing goal",
        description: "This route is scaffolded to keep common roster changes inside one workspace.",
        items: [
          "The table footprint is wide enough for inline edit affordances later.",
          "Bulk actions are represented in the header without implementing the workflow yet.",
          "Responsive fallback keeps the roster usable before mobile-specific row cards arrive.",
        ],
      },
    ],
    inspector: {
      title: "Roster inspector",
      subtitle: "Drawer placeholder for one-click inspect and one-click act roster workflows.",
      triggerLabel: "Inspect Slot",
      statusBadge: {
        label: "Operational",
        tone: "info",
      },
      tabs: ["Summary", "Readiness", "Actions"],
      sections: [
        {
          title: "Summary",
          description: "Inspect the selected member, billet, and roster status without leaving the workspace.",
          items: [
            "Show rank, unit, position, and last update in a compact drawer view.",
            "Keep full-profile navigation optional rather than required for every change.",
          ],
        },
        {
          title: "Readiness",
          description: "Qualification and attendance readiness remain attached to the same roster context.",
          items: [
            "Highlight missing required qualifications or attendance concerns.",
            "Reserve warning badges and readiness actions for later milestones.",
          ],
        },
        {
          title: "Actions",
          description: "Inspector actions should mirror the low-click roster management goal.",
          items: [
            "Set optional rank, assign unit, assign position, and change status can all attach here later.",
            "The drawer preserves context while keeping common actions close.",
          ],
        },
      ],
      actions: [
        { label: "Change Status" },
        { label: "Assign Position", variant: "secondary" },
      ],
    },
    activityFeed: {
      title: "Roster signals",
      description: "This panel complements roster edits with operational context instead of forcing more navigation.",
    },
    timeline: {
      title: "Roster changes",
      description: "Placeholder timeline for assignment, qualification, and status updates.",
    },
    showLoadingSkeleton: true,
  },
  qualifications: {
    route: "/personnel/qualifications",
    title: "Qualifications Catalog",
    description: "Manage the catalog of qualifications and categories using shared list and empty-state components.",
    breadcrumbs: ["Personnel", "Qualifications"],
    primaryAction: { label: "Create Qualification", href: "/personnel/qualifications?panel=create" },
    secondaryActions: [{ label: "Manage Categories", href: "/personnel/qualifications", variant: "outline" }],
    requiredPermissions: personnelPermissions.qualifications,
    quickActionMenuItems: ["Inspect requirement mapping", "Open matrix", "Queue archive review"],
    summary: [
      { label: "Qualifications", value: "34", hint: "Placeholder catalog total", tone: "info", variant: "kpi" },
      { label: "Categories", value: "08", hint: "Category grouping placeholder", tone: "success", variant: "widget" },
      { label: "Archived", value: "03", hint: "Lifecycle state slot", tone: "warning", variant: "kpi" },
      { label: "Requirements", value: "17", hint: "Mapping summary placeholder", tone: "muted", variant: "readiness" },
    ],
    sections: [
      {
        title: "Catalog structure",
        description: "The screen is laid out for categories, qualification entries, and requirement mapping summary panels.",
        items: [
          "Shared cards provide consistent module framing before CRUD logic arrives.",
          "Archive and edit actions are visible but remain inert in this milestone.",
          "Future matrix and profile views can reuse the same badge language defined here.",
        ],
      },
    ],
    emptyState: {
      title: "No qualifications loaded yet",
      description:
        "Once the qualification module is implemented, the first category and qualification can be created from this route.",
      actionLabel: "Seed Qualification Placeholders",
    },
    activityFeed: {
      title: "Qualification signals",
      description: "Training readiness should stay close to the catalog and the qualification matrix.",
    },
  },
} satisfies Record<string, PlaceholderPageConfig>;
