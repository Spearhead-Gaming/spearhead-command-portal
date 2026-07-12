import { operationsPermissions } from "@/features/operations/permissions";
import type { PlaceholderPageConfig } from "@/types/placeholder-page";

export const operationsPageConfigs = {
  eventsList: {
    route: "/operations/events",
    title: "Events",
    description: "Display upcoming and past events through a reusable list-first operations view.",
    breadcrumbs: ["Operations", "Events"],
    primaryAction: { label: "Create Event", href: "/operations/events?panel=create" },
    secondaryActions: [{ label: "Publish Placeholder", variant: "outline" }],
    requiredPermissions: operationsPermissions.eventsList,
    quickActionMenuItems: ["Inspect event", "Open attendance", "Queue Discord reminder"],
    summary: [
      { label: "Upcoming", value: "05", hint: "Next operations placeholder", tone: "info", variant: "widget" },
      { label: "Draft", value: "02", hint: "Publishing workflow slot", tone: "warning", variant: "kpi" },
      { label: "RSVP Open", value: "03", hint: "Discord RSVP integration target", tone: "success", variant: "kpi" },
      { label: "Past Events", value: "12", hint: "History list placeholder", tone: "muted", variant: "kpi" },
    ],
    table: {
      title: "Operations event schedule",
      description: "List-first MVP event management with future calendar expansion.",
      columns: ["Title", "Type", "Date/Time", "Host Unit", "Deployment", "RSVP Status", "Attendance", "Published"],
      filters: ["Unit", "Deployment", "RSVP", "Attendance", "Published"],
      searchPlaceholder: "Search events, deployments, host units, or publication state",
      actionMenuItems: ["Inspect operation", "Open attendance", "View deployment"],
      rows: [
        ["Operation Nightfall", "Weekend Operation", "Sat 1900", "Reaper", "Cold Harbor", "Open", "Pending", "Yes"],
        ["Leadership Sync", "Staff", "Tue 2000", "Spearhead Command", "N/A", "N/A", "N/A", "Draft"],
        ["Qualification Lane", "Training", "Thu 1930", "Viking", "N/A", "Open", "Pending", "Yes"],
      ],
    },
    inspector: {
      title: "Event inspector",
      subtitle: "Quick event context should be inspectable without leaving the event schedule.",
      triggerLabel: "Inspect Event",
      statusBadge: {
        label: "Published",
        tone: "success",
      },
      tabs: ["Summary", "Attendance", "Links"],
      sections: [
        {
          title: "Summary",
          description: "Event summary, date, host unit, and publication state can stay in a side drawer.",
          items: [
            "Keep event context visible while comparing several scheduled events.",
            "Route to the full event detail page only when needed.",
          ],
        },
        {
          title: "Attendance",
          description: "Attendance and RSVP highlights can appear in a compact, inspectable format.",
          items: [
            "Surface pending attendance closeout and RSVP counts.",
            "Reserve quick links to record attendance or send reminders.",
          ],
        },
        {
          title: "Links",
          description: "Related deployments, documents, and Discord delivery status can be summarized here later.",
          items: [
            "Deployment and CONOP links remain one click away.",
            "Discord stays complementary to the portal, not the source of truth.",
          ],
        },
      ],
      actions: [
        { label: "View Attendance", href: "/operations/attendance" },
        { label: "Open Deployment", href: "/operations/deployments", variant: "secondary" },
      ],
    },
  },
  eventDetail: {
    route: "/operations/events/[id]",
    title: "Event Detail",
    description: "Reserve space for event summary, attendance, related documents, and Discord delivery status.",
    breadcrumbs: ["Operations", "Events", "Detail"],
    primaryAction: { label: "Record Attendance", href: "/operations/attendance" },
    secondaryActions: [
      { label: "RSVP", variant: "secondary" },
      { label: "Send Reminder", variant: "outline" },
    ],
    requiredPermissions: operationsPermissions.eventDetail,
    summary: [
      { label: "Date / Time", value: "Sat 1900", hint: "Weekend operation schedule placeholder", tone: "info" },
      { label: "Unit Tasking", value: "All", hint: "Every active unit participates", tone: "success" },
      { label: "RSVP Responses", value: "21", hint: "Discord-first integration target", tone: "warning" },
      { label: "Attendance Lock", value: "Open", hint: "Future closeout state", tone: "muted" },
    ],
    sections: [
      {
        title: "Detail layout reserved",
        description: "The page skeleton follows the event summary, RSVP, attendance, and related-documents flow from the spec.",
        items: [
          "A future attendance table can slot in beneath the summary without reworking the route.",
          "Related deployment, CONOP, and Discord post status each have a reserved section.",
          "Header actions mirror the intended operational workflow but remain placeholder-only.",
        ],
      },
    ],
  },
  attendance: {
    route: "/operations/attendance",
    title: "Attendance",
    description: "Central placeholder view for RSVP and attendance tracking workflows.",
    breadcrumbs: ["Operations", "Attendance"],
    primaryAction: { label: "Open Latest Event" },
    requiredPermissions: operationsPermissions.attendance,
    summary: [
      { label: "Recorded", value: "89%", hint: "Attendance completeness placeholder", tone: "success" },
      { label: "Pending Closeout", value: "02", hint: "Unclosed attendance records", tone: "warning" },
      { label: "No RSVP", value: "11", hint: "Follow-up queue placeholder", tone: "danger" },
      { label: "Trend", value: "+4%", hint: "Future analytics surface", tone: "muted" },
    ],
    sections: [
      {
        title: "Attendance command surface",
        description: "This workspace is intentionally light until the attendance module is implemented.",
        items: [
          "It reserves room for status filters, no-show follow-up, and lock actions.",
          "Future event-detail pages can link back here for broader operational context.",
          "Discord RSVP sync remains deferred beyond Milestone 1.",
        ],
      },
    ],
  },
  campaignsList: {
    route: "/operations/deployments",
    title: "Deployments",
    description: "Show planning, preparing, active, completed, and archived deployments with reusable card and badge patterns.",
    breadcrumbs: ["Operations", "Deployments"],
    primaryAction: { label: "Create Deployment", href: "/operations/deployments?panel=create" },
    secondaryActions: [{ label: "Archive Placeholder", variant: "outline" }],
    requiredPermissions: operationsPermissions.campaignsList,
    quickActionMenuItems: ["Inspect deployment", "Open timeline", "Queue publish update"],
    summary: [
      { label: "Active", value: "02", hint: "Deployment cards placeholder", tone: "success", variant: "widget" },
      { label: "Planned", value: "03", hint: "Pipeline route scaffold", tone: "info", variant: "kpi" },
      { label: "Completed", value: "06", hint: "Archive-ready categories", tone: "warning", variant: "kpi" },
      { label: "Archived", value: "04", hint: "Future filtering surface", tone: "muted", variant: "kpi" },
    ],
    sections: [
      {
        title: "Deployment card pattern",
        description: "Deployment metadata is summarized now so richer stories and timelines can arrive later.",
        items: [
          "Status, phase, progress, and next-event fields have a consistent placeholder language.",
          "Opening a deployment uses the standard detail route scaffold under /operations/deployments/[id].",
          "No deployment management services or publication flows are active yet.",
        ],
      },
    ],
    activityFeed: {
      title: "Deployment signals",
      description: "Deployment pages should answer operational questions before deeper navigation is needed.",
    },
  },
  campaignDetail: {
    route: "/operations/deployments/[id]",
    title: "Deployment Detail",
    description: "Present deployment overview, operational weeks, related operations, and media placeholders in a readable web layout.",
    breadcrumbs: ["Operations", "Deployments", "Detail"],
    primaryAction: { label: "Add Event" },
    secondaryActions: [
      { label: "Edit Deployment", variant: "secondary" },
      { label: "Manage Timeline", variant: "outline" },
    ],
    requiredPermissions: operationsPermissions.campaignDetail,
    summary: [
      { label: "Status", value: "Active", hint: "Status badge placeholder", tone: "success" },
      { label: "Phase", value: "Act II", hint: "Narrative progress slot", tone: "info" },
      { label: "Next Operation", value: "Sat 1900", hint: "Operations link surface", tone: "warning" },
      { label: "Unit Tasking", value: "All", hint: "Every active unit participates", tone: "muted" },
    ],
    sections: [
      {
        title: "Deployment narrative layout",
        description: "Overview, story, timeline, documents, and attendance stats each have a reserved panel.",
        items: [
          "Media and document areas remain placeholders per the screen map.",
          "Timeline management and publication actions are exposed only as shell-level affordances.",
          "Deployment detail intentionally reads more like an operations briefing than a raw table.",
        ],
      },
    ],
  },
  conops: {
    route: "/operations/conops",
    title: "CONOPs",
    description: "Placeholder route for future concept-of-operations document management.",
    breadcrumbs: ["Operations", "CONOPs"],
    primaryAction: { label: "Create CONOP", href: "/operations/conops?panel=create" },
    requiredPermissions: operationsPermissions.conops,
    sections: [
      {
        title: "Document workspace reserved",
        description: "CONOP authoring lives outside Milestone 1, but its route and page shell are ready now.",
        items: [
          "This area can evolve into structured operation planning without changing navigation.",
          "Deployment and operation detail pages can deep-link here once documents are real.",
          "The placeholder keeps the operations information architecture stable from day one.",
        ],
      },
    ],
    emptyState: {
      title: "No CONOPs drafted yet",
      description: "Operation planning documents will be added in a later milestone.",
      actionLabel: "Reserve Draft Pattern",
    },
  },
  aars: {
    route: "/operations/aar-queue",
    title: "AARs",
    description: "Placeholder route for future after-action review capture and follow-up.",
    breadcrumbs: ["Operations", "AARs"],
    primaryAction: { label: "Create AAR", href: "/operations/aar-queue?panel=create" },
    requiredPermissions: operationsPermissions.aars,
    sections: [
      {
        title: "Review workflow placeholder",
        description: "The AAR module arrives later, but the route is established for operations continuity.",
        items: [
          "Deployments and operations can link here once debrief content is implemented.",
          "Shared cards and tables already provide the interaction baseline.",
          "Audit and notification hooks remain unimplemented by design in this milestone.",
        ],
      },
    ],
    emptyState: {
      title: "No after-action reviews yet",
      description: "Use this placeholder to preserve the future route and navigation footprint.",
      actionLabel: "Prepare Review Workspace",
    },
  },
  s3: {
    route: "/operations/s3",
    title: "Operations Center",
    description: "Provide S3 with deployment and operation oversight through placeholder widgets and route scaffolding.",
    breadcrumbs: ["Operations", "S3"],
    primaryAction: { label: "Create Deployment", href: "/operations/deployments?panel=create" },
    secondaryActions: [{ label: "Review Queue", href: "/operations/s3", variant: "outline" }],
    requiredPermissions: operationsPermissions.s3,
    quickActionMenuItems: ["Inspect operation queue", "Open CONOP review", "Check patrol AAR backlog"],
    summary: [
      { label: "Active Deployments", value: "02", hint: "Deployment linkage placeholder", tone: "success", variant: "widget" },
      { label: "Draft Operations", value: "03", hint: "Operation planning queue slot", tone: "warning", variant: "kpi" },
      { label: "Awaiting Review", value: "04", hint: "S3 oversight placeholder", tone: "info", variant: "kpi" },
      { label: "Missing AARs", value: "02", hint: "Post-op follow-up signal", tone: "muted", variant: "readiness" },
    ],
    sections: [
      {
        title: "S3 workspace shape",
        description: "The page is prepared for widgets spanning operation planning, review, and document follow-up.",
        items: [
          "CONOP review, patrol AAR queue, and Zeus assignment cards can use the shared grid.",
          "This route intentionally stops short of real planning logic in Milestone 1.",
          "Future services can populate each card independently thanks to the modular shell.",
        ],
      },
    ],
    timeline: {
      title: "Planning cadence",
      description: "Placeholder planning timeline for drafts, reviews, and post-op follow-up.",
    },
    showLoadingSkeleton: true,
  },
} satisfies Record<string, PlaceholderPageConfig>;
