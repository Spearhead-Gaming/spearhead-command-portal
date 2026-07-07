import { unitPermissions } from "@/features/units/permissions";
import type { PlaceholderPageConfig } from "@/types/placeholder-page";

export const unitPageConfigs = {
  unitsIndex: {
    route: "/units",
    title: "Units",
    description: "Browse the current unit structure and jump into each unit dashboard placeholder.",
    breadcrumbs: ["Units"],
    primaryAction: { label: "Open Spearhead Command", href: "/units/spearhead-command" },
    secondaryActions: [{ label: "View Reaper", href: "/units/reaper", variant: "outline" }],
    requiredPermissions: unitPermissions.unitsIndex,
    quickActionMenuItems: ["Inspect unit placeholder", "Open readiness dashboard", "Queue billet review"],
    summary: [
      { label: "Tracked Units", value: "05", hint: "Spearhead Command, Reaper, Misfit, Gambler, Viking", tone: "info", variant: "widget" },
      { label: "Leadership Slots", value: "17", hint: "Placeholder structure count", tone: "success", variant: "kpi" },
      { label: "Open Billets", value: "06", hint: "Future slot management signal", tone: "warning", variant: "readiness" },
      { label: "Readiness View", value: "Ready", hint: "Unit dashboard route scaffolded", tone: "muted", variant: "widget" },
    ],
    sections: [
      {
        title: "Unit navigation hub",
        description: "This index route acts as the top-level doorway into per-unit dashboards.",
        items: [
          "Individual unit detail routes already exist under /units/[unitId].",
          "Unit cards can evolve into richer readiness summaries without changing the shell.",
          "Discord links, announcements, and roster snippets are reserved for later milestones.",
        ],
      },
    ],
    showLoadingSkeleton: true,
  },
  unitDetail: {
    route: "/units/[unitId]",
    title: "Unit Dashboard",
    description: "Provide leadership and members a clear view of strength, readiness, events, and announcements for a unit.",
    breadcrumbs: ["Units", "Dashboard"],
    primaryAction: { label: "Manage Positions" },
    secondaryActions: [
      { label: "Manage Slots", variant: "outline" },
      { label: "View Roster", href: "/personnel/roster", variant: "secondary" },
    ],
    requiredPermissions: unitPermissions.unitDetail,
    quickActionMenuItems: ["Inspect billet status", "Open event context", "Queue announcement"],
    summary: [
      { label: "Strength", value: "38 / 44", hint: "Personnel readiness placeholder", tone: "info", variant: "widget" },
      { label: "Leadership", value: "03", hint: "Header slot for unit leadership", tone: "success", variant: "kpi" },
      { label: "Open Billets", value: "06", hint: "Future slot manager source", tone: "warning", variant: "readiness" },
      { label: "Upcoming Events", value: "02", hint: "Operations linkage placeholder", tone: "muted", variant: "kpi" },
    ],
    sections: [
      {
        title: "Unit overview sections",
        description: "The screen map calls for a unit header plus roster, readiness, and announcement context.",
        items: [
          "Roster, open billets, qualification readiness, and Discord links each have dedicated placeholders.",
          "Leadership actions remain header-based to preserve context.",
          "The right-side context panel can be introduced later without altering route structure.",
        ],
      },
    ],
    timeline: {
      title: "Unit activity",
      description: "Leadership, roster, and readiness shifts should stay close to the unit dashboard.",
    },
  },
} satisfies Record<string, PlaceholderPageConfig>;
