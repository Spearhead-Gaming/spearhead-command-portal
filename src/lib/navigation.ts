import {
  Bell,
  BookText,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Flag,
  LayoutDashboard,
  RadioTower,
  Shield,
  ShieldEllipsis,
  ShieldPlus,
  ShieldUser,
  Swords,
  Trophy,
  Users,
} from "lucide-react";

import { hasAllPermissions } from "@/server/permissions/access";
import type { NavigationGroup } from "@/types/navigation";

const navigationGroups: NavigationGroup[] = [
  {
    title: "Dashboard",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        exact: true,
        requiredPermissions: ["core.dashboard.view"],
      },
    ],
  },
  {
    title: "Personnel",
    items: [
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
        title: "Qualifications",
        href: "/personnel/qualifications",
        icon: Trophy,
        requiredPermissions: ["qualifications.view"],
      },
    ],
  },
  {
    title: "Units",
    items: [
      {
        title: "All Units",
        href: "/units",
        icon: Shield,
        exact: true,
        requiredPermissions: ["units.view"],
      },
      {
        title: "Spearhead Command",
        href: "/units/spearhead-command",
        icon: Shield,
        requiredPermissions: ["units.dashboard.view"],
      },
      {
        title: "Reaper",
        href: "/units/reaper",
        icon: ShieldEllipsis,
        requiredPermissions: ["units.dashboard.view"],
      },
      {
        title: "Misfit",
        href: "/units/misfit",
        icon: ShieldUser,
        requiredPermissions: ["units.dashboard.view"],
      },
      {
        title: "Gambler",
        href: "/units/gambler",
        icon: ShieldPlus,
        requiredPermissions: ["units.dashboard.view"],
      },
      {
        title: "Viking",
        href: "/units/viking",
        icon: Shield,
        requiredPermissions: ["units.dashboard.view"],
      },
    ],
  },
  {
    title: "Operations",
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
        href: "/operations/campaigns",
        icon: Swords,
        requiredPermissions: ["campaigns.view"],
      },
      {
        title: "This Week",
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
        title: "Planning Packages",
        href: "/operations/campaigns",
        icon: ClipboardList,
        requiredPermissions: ["operations.package.view"],
      },
      {
        title: "Zeus",
        href: "/operations/zeus",
        icon: RadioTower,
        requiredPermissions: ["s3.zeus.assign"],
      },
      {
        title: "CONOPs",
        href: "/operations/conops",
        icon: FileText,
        requiredPermissions: ["s3.conops.view"],
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
    title: "Training",
    items: [
      {
        title: "Qualification Matrix",
        href: "/training/qualification-matrix",
        icon: Trophy,
        requiredPermissions: ["qualifications.matrix.view"],
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
    title: "Documents",
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
    title: "Applications",
    items: [
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
    title: "Administration",
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
        title: "Builder",
        href: "/administration/builder",
        icon: ShieldPlus,
        requiredPermissions: ["builder.view"],
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
        title: "Notifications",
        href: "/administration/notifications",
        icon: Bell,
        requiredPermissions: ["notifications.delivery.view"],
      },
      {
        title: "Audit Logs",
        href: "/administration/audit-logs",
        icon: ClipboardCheck,
        requiredPermissions: ["audit.view"],
      },
      {
        title: "System Settings",
        href: "/administration/settings",
        icon: FileText,
        requiredPermissions: ["admin.users.view"],
      },
    ],
  },
];

export function filterNavigationGroups(grantedPermissions: readonly string[]) {
  return navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        hasAllPermissions(grantedPermissions, item.requiredPermissions),
      ),
    }))
    .filter((group) => group.items.length > 0);
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
