import { buildMyWorkQueue } from "@/server/personas/my-work";
import type { CommandDashboardData } from "@/server/dashboard/types";
import type { WorkspaceProfile } from "@/server/personas/types";

describe("buildMyWorkQueue operations prompts", () => {
  it("surfaces operations package review and publication prompts for S3 workspaces", () => {
    const dashboard = {
      attendance: { missingRsvps: 0 },
      community: { failedNotifications: 0, pendingForms: 0 },
      member: { missingRequiredQualifications: 0, nextEvent: null },
      personnel: { unlinkedUsers: 0 },
      s3: {
        aarQueue: 0,
        approvedUnpublishedMissions: 1,
        conopReviewQueue: 0,
        missionReviewQueue: 2,
      },
    } as CommandDashboardData;
    const workspaceProfile = {
      selectedWorkspace: { id: "operations" },
    } as WorkspaceProfile;

    const queue = buildMyWorkQueue(dashboard, workspaceProfile);

    expect(queue.map((item) => item.id)).toEqual([
      "s3-approved-unpublished",
      "s3-package-review",
    ]);
  });
});
