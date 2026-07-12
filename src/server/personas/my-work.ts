import type { CommandDashboardData, DashboardTone } from "@/server/dashboard/types";
import type { WorkspaceId, WorkspaceProfile } from "@/server/personas/types";

export type MyWorkPriority = "critical" | "high" | "normal";

export type MyWorkItem = {
  actionHref: string;
  actionLabel: string;
  category: string;
  id: string;
  priority: MyWorkPriority;
  reason: string;
  relatedEntity?: string;
  title: string;
  tone: DashboardTone;
  workspaceIds: WorkspaceId[];
};

function visibleInWorkspace(item: MyWorkItem, workspaceId: WorkspaceId) {
  return item.workspaceIds.includes(workspaceId) || item.priority === "critical";
}

export function buildMyWorkQueue(
  dashboard: CommandDashboardData,
  workspaceProfile: WorkspaceProfile,
): MyWorkItem[] {
  const items: Array<MyWorkItem | null> = [
    dashboard.member.nextEvent
      ? {
          actionHref: dashboard.member.nextEvent.href ?? "/operations/this-week",
          actionLabel: "Open event",
          category: "Operations",
          id: "member-next-event",
          priority: "normal",
          reason: dashboard.member.nextEvent.meta,
          relatedEntity: dashboard.member.nextEvent.label,
          title: "Upcoming operation is available",
          tone: "info",
          workspaceIds: ["my_portal", "unit_leadership", "zeus"],
        }
      : null,
    dashboard.member.missingRequiredQualifications > 0
      ? {
          actionHref: "/training/qualification-matrix",
          actionLabel: "Review qualifications",
          category: "Training",
          id: "member-missing-quals",
          priority: "high",
          reason: `${dashboard.member.missingRequiredQualifications} required qualification gap(s) are visible.`,
          title: "Required qualifications need attention",
          tone: "warning",
          workspaceIds: ["my_portal", "training", "unit_leadership"],
        }
      : null,
    dashboard.training.pendingSignoffs > 0
      ? {
          actionHref: "/personnel/qualifications",
          actionLabel: "Review signoffs",
          category: "Training",
          id: "training-pending-signoffs",
          priority: "high",
          reason: `${dashboard.training.pendingSignoffs} qualification signoff(s) need instructor or training staff review.`,
          title: "Qualification signoffs need review",
          tone: "warning",
          workspaceIds: ["training", "unit_leadership", "command"],
        }
      : null,
    dashboard.attendance.lowAttendanceMembers.length > 0
      ? {
          actionHref: "/operations/attendance",
          actionLabel: "Review attendance",
          category: "Attendance",
          id: "attendance-low-members",
          priority: "high",
          reason: `${dashboard.attendance.lowAttendanceMembers.length} member(s) are below attendance expectations in the visible scope.`,
          title: "Low attendance needs follow-up",
          tone: "warning",
          workspaceIds: ["unit_leadership", "personnel", "command"],
        }
      : null,
    dashboard.unitLeadership.unitReadiness.length > 0
      ? {
          actionHref: "/units",
          actionLabel: "Open units",
          category: "Readiness",
          id: "unit-readiness-review",
          priority: "normal",
          reason: `${dashboard.unitLeadership.unitReadiness.length} unit readiness signal(s) are visible for review.`,
          title: "Unit readiness review",
          tone: "info",
          workspaceIds: ["unit_leadership", "personnel", "command"],
        }
      : null,
    dashboard.s3.aarQueue > 0
      ? {
          actionHref: "/operations/aar-queue",
          actionLabel: "Review AARs",
          category: "Operations",
          id: "s3-aar-queue",
          priority: "high",
          reason: `${dashboard.s3.aarQueue} AAR item(s) are waiting on review.`,
          title: "Patrol AAR review queue",
          tone: "warning",
          workspaceIds: ["operations", "deployment_creator", "command"],
        }
      : null,
    dashboard.s3.missionReviewQueue > 0
      ? {
          actionHref: "/operations/s3?missionStatus=s3_review",
          actionLabel: "Review packages",
          category: "Operations",
          id: "s3-package-review",
          priority: "high",
          reason: `${dashboard.s3.missionReviewQueue} mission/package item(s) need S3 review before publication.`,
          title: "Operations package review needed",
          tone: "warning",
          workspaceIds: ["operations", "deployment_creator", "command"],
        }
      : null,
    dashboard.s3.approvedUnpublishedMissions > 0
      ? {
          actionHref: "/operations/s3?missionStatus=approved",
          actionLabel: "Publish operations",
          category: "Operations",
          id: "s3-approved-unpublished",
          priority: "high",
          reason: `${dashboard.s3.approvedUnpublishedMissions} approved operation(s) are ready for publishing or release review.`,
          title: "Approved operations are unpublished",
          tone: "info",
          workspaceIds: ["operations", "deployment_creator", "zeus", "command"],
        }
      : null,
    dashboard.s3.conopReviewQueue > 0
      ? {
          actionHref: "/operations/s3",
          actionLabel: "Open S3",
          category: "Operations",
          id: "s3-conop-queue",
          priority: "high",
          reason: `${dashboard.s3.conopReviewQueue} CONOP item(s) need S3 review.`,
          title: "CONOP review needed",
          tone: "warning",
          workspaceIds: ["operations", "zeus", "command"],
        }
      : null,
    (dashboard.personnel.pendingApplications > 0 || dashboard.community.pendingForms > 0)
      ? {
          actionHref: "/administration/submissions",
          actionLabel: "Open queue",
          category: "Personnel",
          id: "pending-forms",
          priority: "high",
          reason: `${Math.max(dashboard.personnel.pendingApplications, dashboard.community.pendingForms)} submission(s) need staff attention.`,
          title: "Pending forms and requests",
          tone: "warning",
          workspaceIds: ["personnel", "community", "administration", "command"],
        }
      : null,
    dashboard.personnel.unlinkedUsers > 0
      ? {
          actionHref: "/administration/discord#identity-sync",
          actionLabel: "Review identity",
          category: "Administration",
          id: "unlinked-users",
          priority: "high",
          reason: `${dashboard.personnel.unlinkedUsers} active user account(s) are missing member profiles.`,
          title: "Identity linking needs review",
          tone: "warning",
          workspaceIds: ["personnel", "administration", "developer"],
        }
      : null,
    dashboard.community.failedNotifications > 0
      ? {
          actionHref: "/administration/notifications",
          actionLabel: "Open deliveries",
          category: "Communications",
          id: "failed-notifications",
          priority: "critical",
          reason: `${dashboard.community.failedNotifications} delivery issue(s) require review.`,
          title: "Failed notifications",
          tone: "danger",
          workspaceIds: ["administration", "community", "command", "developer"],
        }
      : null,
    dashboard.attendance.missingRsvps > 0
      ? {
          actionHref: "/operations/attendance",
          actionLabel: "Open attendance",
          category: "Attendance",
          id: "missing-rsvps",
          priority: "high",
          reason: `${dashboard.attendance.missingRsvps} attendance record(s) need RSVP/final attention.`,
          title: "Missing RSVP or attendance closeout",
          tone: "warning",
          workspaceIds: ["unit_leadership", "operations", "command"],
        }
      : null,
  ];

  const selectedWorkspaceId = workspaceProfile.selectedWorkspace.id;

  return items
    .filter((item): item is MyWorkItem => Boolean(item))
    .filter((item) => visibleInWorkspace(item, selectedWorkspaceId))
    .sort((left, right) => {
      const priorityOrder: Record<MyWorkPriority, number> = {
        critical: 0,
        high: 1,
        normal: 2,
      };

      return priorityOrder[left.priority] - priorityOrder[right.priority] || left.title.localeCompare(right.title);
    })
    .slice(0, 6);
}
