import { dashboardPermissions } from "@/features/dashboard/permissions";
import type { PlaceholderPageConfig } from "@/types/placeholder-page";

export const dashboardPageConfig: PlaceholderPageConfig = {
  route: "/dashboard",
  title: "Dashboard",
  description:
    "Give the current user a role-aware overview of what matters now, while Milestone 1 keeps the experience grounded in placeholder content only.",
  breadcrumbs: ["Dashboard"],
  primaryAction: {
    label: "View Next Event",
    href: "/operations/events",
  },
  secondaryActions: [
    { label: "RSVP Placeholder", variant: "outline" },
    { label: "View Profile", href: "/personnel/members", variant: "secondary" },
  ],
  requiredPermissions: dashboardPermissions.home,
  quickActionMenuItems: ["Open next event", "Inspect deployment placeholder", "Jump to roster"],
  summary: [
    { label: "Next Event", value: "Sat 1900", hint: "Task Force rehearsal placeholder", tone: "info", variant: "widget" },
    { label: "Current Deployment", value: "Cold Harbor", hint: "Deployment placeholder track", tone: "warning", variant: "widget" },
    { label: "My Unit", value: "Spearhead Command", hint: "Unit overview route ready", tone: "success", variant: "widget" },
    { label: "My Qualifications", value: "12", hint: "Readiness summary widget", tone: "success", variant: "kpi" },
    { label: "Attendance Summary", value: "89%", hint: "Attendance snapshot placeholder", tone: "info", variant: "readiness" },
    { label: "Recent Announcements", value: "03", hint: "Announcement feed placeholder", tone: "warning", variant: "kpi" },
    { label: "Pending Tasks", value: "04", hint: "Personal action queue widget", tone: "muted", variant: "kpi" },
    { label: "Quick Links", value: "06", hint: "Shortcut launcher placeholder", tone: "muted", variant: "kpi" },
  ],
  sections: [
    {
      title: "Dashboard widgets reserved",
      description: "The shared dashboard card pattern is in place for the MVP widget catalog.",
      items: [
        "Next Event, Current Deployment, My Unit, My Qualifications, and Attendance Summary are represented.",
        "Recent Announcements, Pending Tasks, and Quick Links use the same card language for consistency.",
        "Permission-aware cards can be added later without changing the AppShell.",
      ],
    },
    {
      title: "Foundation choices",
      description: "This first pass locks in the reusable patterns needed before data-heavy modules arrive.",
      items: [
        "Page header actions follow the documented primary and secondary action pattern.",
        "The shell keeps search, notifications, and user context visible.",
        "No production service logic or live API integration is attached yet.",
      ],
    },
  ],
  emptyState: {
    title: "Onboarding card placeholder",
    description:
      "If no profile exists, this dashboard area can prompt the user to connect Discord or request profile setup once authentication is implemented.",
    actionLabel: "Prepare Onboarding Flow",
  },
  activityFeed: {
    title: "Operational updates",
    description: "Dashboard-side activity should answer what matters right now before users dig deeper.",
  },
  timeline: {
    title: "Operational timeline",
    description: "Short-form operational timeline placeholder for campaigns, events, and readiness changes.",
  },
  showLoadingSkeleton: true,
};
