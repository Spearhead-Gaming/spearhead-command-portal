export const workflowTriggerCatalog = [
  "form_submitted",
  "qualification_awarded",
  "event_published",
  "attendance_finalized",
  "campaign_published",
  "document_published",
] as const;

export const automationTriggerCatalog = workflowTriggerCatalog;

export const automationActionCatalog = [
  "create_notification",
  "send_discord_message_placeholder",
  "assign_reviewer",
  "mark_task_placeholder",
] as const;

export const dashboardTypeCatalog = [
  "community",
  "member",
  "unit_leadership",
  "s1_personnel",
  "s3_operations",
  "training",
  "admin",
] as const;

export const widgetCatalog = [
  { key: "personnel_count", label: "Personnel Count", category: "Personnel", description: "Total, active, LOA, and inactive member counts." },
  { key: "unit_strength", label: "Unit Strength", category: "Units", description: "Unit roster strength and open billet pressure." },
  { key: "attendance_summary", label: "Attendance Summary", category: "Attendance", description: "Average attendance, missing RSVP, and closeout status." },
  { key: "qualification_readiness", label: "Qualification Readiness", category: "Training", description: "Required qualification coverage across members or units." },
  { key: "missing_qualifications", label: "Missing Qualifications", category: "Training", description: "Top missing required qualification gaps." },
  { key: "upcoming_events", label: "Upcoming Events", category: "Operations", description: "Next operations, trainings, and meetings." },
  { key: "active_campaigns", label: "Active Deployments", category: "Deployments", description: "Active or planning deployment summaries." },
  { key: "campaign_progress", label: "Deployment Progress", category: "Deployments", description: "Deployment operation completion and next operation signal." },
  { key: "pending_forms", label: "Pending Forms", category: "Workflow", description: "Submitted, under-review, and changes-requested form queue." },
  { key: "failed_notifications", label: "Failed Notifications", category: "Notifications", description: "Failed or retrying notification delivery records." },
  { key: "discord_health", label: "Discord Health", category: "Discord", description: "Discord configuration and bot health summary." },
  { key: "audit_activity", label: "Audit Activity", category: "Audit", description: "Recent sensitive activity from the audit log." },
  { key: "recent_documents", label: "Recent Documents", category: "Documents", description: "Placeholder for recently published or reviewed documents." },
] as const;

export type BuilderWidgetKey = (typeof widgetCatalog)[number]["key"];
