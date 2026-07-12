import {
  Bell,
  BookText,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Flag,
  Gavel,
  LayoutDashboard,
  RadioTower,
  Shield,
  ShieldCheck,
  ShieldEllipsis,
  ShieldPlus,
  ShieldUser,
  Swords,
  Trophy,
  Users,
} from "lucide-react";

import { hasAllPermissions } from "@/server/permissions/access";
import type { WorkspaceId } from "@/server/personas/types";
import type { NavigationGroup } from "@/types/navigation";

const navigationGroups: NavigationGroup[] = [
  {
    title: "Home",
    preferredWorkspaces: ["my_portal", "command"],
    items: [
      {
        title: "Command Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        exact: true,
        requiredPermissions: ["core.dashboard.view"],
      },
      {
        title: "Applications",
        href: "/applications",
        icon: ClipboardList,
        exact: true,
        requiredPermissions: ["forms.view"],
      },
    ],
  },
  {
    title: "Operations",
    preferredWorkspaces: ["operations", "deployment_creator", "patrol_leader", "zeus", "command"],
    items: [
      {
        title: "Operations Center",
        href: "/operations",
        icon: LayoutDashboard,
        exact: true,
        requiredPermissions: ["s3.dashboard.view"],
      },
      {
        title: "Deployments",
        href: "/operations/deployments",
        icon: Swords,
        requiredPermissions: ["campaigns.view"],
      },
      {
        title: "Current Week",
        href: "/operations/this-week",
        icon: Flag,
        requiredPermissions: ["events.view"],
      },
      {
        title: "Patrols",
        href: "/operations/patrols",
        icon: ShieldUser,
        requiredPermissions: ["events.view"],
      },
      {
        title: "Weekly Tasking",
        href: "/operations/weekly-tasking",
        icon: ClipboardList,
        requiredPermissions: ["operations.package.view"],
      },
      {
        title: "AAR Queue",
        href: "/operations/aar-queue",
        icon: BookText,
        requiredPermissions: ["s3.aars.view"],
      },
      {
        title: "Attendance",
        href: "/operations/attendance",
        icon: ClipboardCheck,
        requiredPermissions: ["attendance.rsvp.view"],
      },
    ],
  },
  {
    title: "Personnel",
    preferredWorkspaces: ["personnel", "unit_leadership", "command"],
    items: [
      {
        title: "Personnel Center",
        href: "/personnel",
        icon: ShieldCheck,
        exact: true,
        requiredPermissions: ["personnel.dashboard.view"],
      },
      {
        title: "Members",
        href: "/personnel/members",
        icon: Users,
        requiredPermissions: ["personnel.profile.view"],
      },
      {
        title: "Roster",
        href: "/personnel/roster",
        icon: ClipboardCheck,
        requiredPermissions: ["roster.member.view"],
      },
      {
        title: "Units",
        href: "/units",
        icon: Shield,
        exact: true,
        requiredPermissions: ["units.view"],
      },
    ],
  },
  {
    title: "Training",
    preferredWorkspaces: ["training", "unit_leadership"],
    items: [
      {
        title: "Qualification Matrix",
        href: "/training/qualification-matrix",
        icon: Trophy,
        requiredPermissions: ["qualifications.matrix.view"],
      },
      {
        title: "Qualification Catalog",
        href: "/personnel/qualifications",
        icon: Trophy,
        requiredPermissions: ["qualifications.view"],
      },
      {
        title: "Training Events",
        href: "/training/events",
        icon: Flag,
        requiredPermissions: ["qualifications.view"],
      },
      {
        title: "Instructors",
        href: "/training/instructors",
        icon: Users,
        requiredPermissions: ["qualifications.view"],
      },
    ],
  },
  {
    title: "Communications",
    preferredWorkspaces: ["community", "administration", "command"],
    items: [
      {
        title: "Communications Center",
        href: "/communications",
        icon: Bell,
        requiredPermissions: ["communications.view"],
      },
      {
        title: "Deliveries",
        href: "/administration/notifications",
        icon: ClipboardCheck,
        requiredPermissions: ["notifications.delivery.view"],
      },
      {
        title: "Discord Settings",
        href: "/administration/discord",
        icon: RadioTower,
        requiredPermissions: ["discord.view"],
      },
    ],
  },
  {
    title: "Documents",
    preferredWorkspaces: ["my_portal", "zeus", "operations"],
    items: [
      {
        title: "Documents",
        href: "/documents",
        icon: BookText,
        requiredPermissions: ["documents.view"],
      },
    ],
  },
  {
    title: "Community Management",
    preferredWorkspaces: ["community", "command"],
    items: [
      {
        title: "Community Center",
        href: "/community-management",
        icon: Gavel,
        requiredPermissions: ["community.view"],
      },
    ],
  },
  {
    title: "Administration",
    preferredWorkspaces: ["administration"],
    items: [
      {
        title: "Users",
        href: "/administration/users",
        icon: Users,
        requiredPermissions: ["admin.users.view"],
      },
      {
        title: "Roles & Permissions",
        href: "/administration/roles",
        icon: ShieldEllipsis,
        requiredPermissions: ["admin.roles.view"],
      },
      {
        title: "Forms",
        href: "/administration/forms",
        icon: ClipboardList,
        requiredPermissions: ["forms.edit"],
      },
      {
        title: "Submissions",
        href: "/administration/submissions",
        icon: ClipboardCheck,
        requiredPermissions: ["forms.review"],
      },
      {
        title: "Discord Settings",
        href: "/administration/discord",
        icon: RadioTower,
        requiredPermissions: ["discord.view"],
      },
      {
        title: "Audit Logs",
        href: "/administration/audit-logs",
        icon: ClipboardCheck,
        requiredPermissions: ["audit.view"],
      },
    ],
  },
  {
    title: "Developer Tools",
    preferredWorkspaces: ["developer"],
    items: [
      {
        title: "Platform Builder",
        href: "/administration/builder",
        icon: ShieldPlus,
        requiredPermissions: ["builder.view"],
      },
      {
        title: "Diagnostics",
        href: "/administration/discord",
        icon: RadioTower,
        requiredPermissions: ["discord.diagnostics.view"],
      },
      {
        title: "System Settings",
        href: "/administration/settings",
        icon: FileText,
        requiredPermissions: ["admin.settings.view"],
      },
    ],
  },
];

function workspaceRank(preferredWorkspaces: readonly WorkspaceId[] | undefined, workspaceId?: WorkspaceId) {
  if (!workspaceId) {
    return 1;
  }

  return preferredWorkspaces?.includes(workspaceId) ? 0 : 1;
}

export function filterNavigationGroups(grantedPermissions: readonly string[], workspaceId?: WorkspaceId) {
  return navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        hasAllPermissions(grantedPermissions, item.requiredPermissions),
      ).sort(
        (left, right) =>
          workspaceRank(left.preferredWorkspaces, workspaceId) -
            workspaceRank(right.preferredWorkspaces, workspaceId) ||
          left.title.localeCompare(right.title),
      ),
    }))
    .filter((group) => group.items.length > 0)
    .sort(
      (left, right) =>
        workspaceRank(left.preferredWorkspaces, workspaceId) -
          workspaceRank(right.preferredWorkspaces, workspaceId) ||
        left.title.localeCompare(right.title),
    );
}

export function isNavigationItemActive(
  pathname: string,
  href: string,
  exact = false,
) {
  if (exact) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
