import type { LucideIcon } from "lucide-react";

export type NavigationItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
  requiredPermissions: readonly string[];
};

export type NavigationGroup = {
  title: string;
  items: NavigationItem[];
};
