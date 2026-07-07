import { trainingPermissions } from "@/features/training/permissions";
import type { PlaceholderPageConfig } from "@/types/placeholder-page";

export const trainingPageConfigs = {
  qualificationMatrix: {
    route: "/training/qualification-matrix",
    title: "Qualification Matrix",
    description: "Show qualification readiness across members and units through a matrix-oriented placeholder workspace.",
    breadcrumbs: ["Training", "Qualification Matrix"],
    primaryAction: { label: "Award Qualification" },
    secondaryActions: [{ label: "Manage Requirements", href: "/personnel/qualifications", variant: "outline" }],
    requiredPermissions: trainingPermissions.qualificationMatrix,
    quickActionMenuItems: ["Inspect readiness row", "Review expiring quals", "Open catalog"],
    summary: [
      { label: "Tracked Members", value: "97", hint: "Rows placeholder", tone: "info", variant: "kpi" },
      { label: "Required Quals", value: "14", hint: "Columns placeholder", tone: "success", variant: "widget" },
      { label: "Expiring Soon", value: "09", hint: "Future alert state", tone: "warning", variant: "kpi" },
      { label: "Missing Required", value: "18", hint: "Readiness follow-up", tone: "danger", variant: "readiness" },
    ],
    sections: [
      {
        title: "Matrix interaction space",
        description: "This route keeps room for rows, columns, filters, and status indicators without building the real matrix yet.",
        items: [
          "Unit, position, category, and expiry filters are planned into the page shape.",
          "Award and revoke actions remain header-level placeholders in Milestone 1.",
          "Shared status badges and cards keep the readiness language consistent across modules.",
        ],
      },
    ],
    activityFeed: {
      title: "Training alerts",
      description: "Qualification readiness should stay searchable and action-oriented.",
    },
  },
  trainingEvents: {
    route: "/training/events",
    title: "Training Events",
    description: "Placeholder route for qualification and instructor-led training event management.",
    breadcrumbs: ["Training", "Events"],
    primaryAction: { label: "Schedule Training" },
    requiredPermissions: trainingPermissions.trainingEvents,
    sections: [
      {
        title: "Training calendar reserved",
        description: "This route exists to keep the training information architecture stable early.",
        items: [
          "Future class schedules can reuse the operations list and header patterns.",
          "Qualification links and instructor assignment slots are intentionally deferred.",
          "Milestone 1 only commits the layout, navigation, and route boundary.",
        ],
      },
    ],
    emptyState: {
      title: "No training events scheduled",
      description: "Training event workflows will be added after the portal foundation is stable.",
      actionLabel: "Prepare Event Pattern",
    },
  },
  instructors: {
    route: "/training/instructors",
    title: "Instructors",
    description: "Placeholder route for managing instructor visibility and training ownership.",
    breadcrumbs: ["Training", "Instructors"],
    primaryAction: { label: "Add Instructor" },
    requiredPermissions: trainingPermissions.instructors,
    sections: [
      {
        title: "Instructor management shell",
        description: "The route is ready for future teaching assignments, availability, and qualification ownership.",
        items: [
          "Cards and tables can be introduced here without changing the app frame.",
          "Links to training events and qualifications are already represented in neighboring routes.",
          "No production data model or business logic is attached in this milestone.",
        ],
      },
    ],
    emptyState: {
      title: "No instructor roster yet",
      description: "Instructor workflows remain intentionally out of scope for Milestone 1.",
      actionLabel: "Reserve Instructor Flow",
    },
  },
} satisfies Record<string, PlaceholderPageConfig>;
