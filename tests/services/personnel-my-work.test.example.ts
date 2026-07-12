import { buildMyWorkQueue } from "@/server/personas/my-work";
import type { CommandDashboardData } from "@/server/dashboard/types";
import type { WorkspaceProfile } from "@/server/personas/types";

describe("buildMyWorkQueue personnel prompts", () => {
  it("surfaces training signoff and low-attendance work for personnel-adjacent workspaces", () => {
    const dashboard = {
      attendance: {
        lowAttendanceMembers: [{ id: "member-1", label: "Member", meta: "Unit", href: "/personnel/members/member-1" }],
        missingRsvps: 0,
      },
      community: { failedNotifications: 0, pendingForms: 0 },
      member: { missingRequiredQualifications: 0, nextEvent: null },
      personnel: { pendingApplications: 0, unlinkedUsers: 0 },
      s3: { aarQueue: 0, approvedUnpublishedMissions: 0, conopReviewQueue: 0, missionReviewQueue: 0 },
      training: { pendingSignoffs: 2 },
      unitLeadership: { unitReadiness: [] },
    } as CommandDashboardData;
    const workspaceProfile = {
      selectedWorkspace: { id: "unit_leadership" },
    } as WorkspaceProfile;

    const queue = buildMyWorkQueue(dashboard, workspaceProfile);

    expect(queue.map((item) => item.id)).toContain("training-pending-signoffs");
    expect(queue.map((item) => item.id)).toContain("attendance-low-members");
  });
});
