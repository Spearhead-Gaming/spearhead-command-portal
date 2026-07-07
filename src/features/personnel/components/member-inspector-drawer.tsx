"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ServiceTimeline } from "@/components/activity/service-timeline";
import { InspectorDrawer } from "@/components/inspector/inspector-drawer";
import { Button } from "@/components/ui/button";
import {
  MemberAttendanceSummaryCard,
  MemberAuditLogCard,
  MemberCampaignSummaryCard,
  MemberNotesCard,
  MemberQualificationsSummaryCard,
  MemberRecentActivityCard,
  MemberServiceLogsCard,
  MemberServiceOverviewCard,
} from "@/features/personnel/components/member-service-record-sections";
import { MemberReadinessCard } from "@/features/personnel/components/member-readiness-card";
import type { MemberProfileDashboardData } from "@/server/personnel/types";

type MemberInspectorDrawerProps = {
  closeHref: string;
  member: MemberProfileDashboardData | null;
  open: boolean;
};

function getStatusTone(statusKey: string) {
  switch (statusKey) {
    case "active":
      return "success" as const;
    case "reserve":
      return "info" as const;
    case "loa":
      return "warning" as const;
    case "inactive":
    case "banned":
    case "discharged":
      return "danger" as const;
    default:
      return "muted" as const;
  }
}

export function MemberInspectorDrawer({
  closeHref,
  member,
  open,
}: MemberInspectorDrawerProps) {
  const router = useRouter();

  if (!member) {
    return null;
  }

  return (
    <InspectorDrawer
      onClose={() => router.replace(closeHref)}
      open={open}
      sections={[]}
      statusBadge={{
        label: member.member.status.label,
        tone: getStatusTone(member.member.status.key),
      }}
      subtitle="Service-record inspector keeps overview, readiness, notes, and historical context attached to the list or roster workspace."
      tabPanels={[
        {
          label: "Overview",
          content: (
            <div className="space-y-4">
              <MemberServiceOverviewCard dashboard={member} />
              <MemberReadinessCard readiness={member.readiness} />
              <MemberRecentActivityCard dashboard={member} />
            </div>
          ),
        },
        {
          label: "Qualifications",
          content: <MemberQualificationsSummaryCard dashboard={member} />,
        },
        {
          label: "Attendance",
          content: <MemberAttendanceSummaryCard dashboard={member} />,
        },
        {
          label: "Campaigns",
          content: <MemberCampaignSummaryCard dashboard={member} />,
        },
        {
          label: "Notes",
          content: <MemberNotesCard dashboard={member} />,
        },
        {
          label: "Timeline",
          content: (
            <ServiceTimeline
              description="Recent service-record activity stays visible without breaking page context."
              emptyDescription="Timeline entries will appear here once this member accrues roster, qualification, attendance, or campaign history."
              entries={member.serviceTimeline ?? []}
              order="desc"
              title="Service timeline"
            />
          ),
        },
        {
          label: "Audit",
          content: (
            <div className="space-y-4">
              <MemberServiceLogsCard dashboard={member} />
              <MemberAuditLogCard dashboard={member} />
            </div>
          ),
        },
      ]}
      title={member.member.displayName}
    >
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href={`/personnel/members/${member.member.id}`}>Open full profile</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/personnel/roster?manage=${member.member.id}`}>Manage roster</Link>
        </Button>
        <Button onClick={() => router.replace(closeHref)} variant="ghost">
          Close inspector
        </Button>
      </div>
    </InspectorDrawer>
  );
}
