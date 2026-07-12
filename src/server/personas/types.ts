export type PersonaId =
  | "community_member"
  | "patrol_leader"
  | "unit_leadership"
  | "s1_personnel"
  | "s3_operations"
  | "deployment_creator"
  | "zeus"
  | "training_staff"
  | "command_staff"
  | "community_manager"
  | "administrator"
  | "developer";

export type WorkspaceId =
  | "my_portal"
  | "patrol_leader"
  | "unit_leadership"
  | "personnel"
  | "operations"
  | "deployment_creator"
  | "zeus"
  | "training"
  | "command"
  | "community"
  | "administration"
  | "developer";

export type PersonaProfile = {
  defaultRoute: string;
  description: string;
  id: PersonaId;
  label: string;
  priority: number;
  reason: string;
  workspaceId: WorkspaceId;
};

export type WorkspaceOption = {
  defaultRoute: string;
  description: string;
  id: WorkspaceId;
  isCurrent: boolean;
  label: string;
  personaIds: PersonaId[];
};

export type PersonaQuickAction = {
  href: string;
  id: string;
  label: string;
  reason: string;
  workspaceIds: WorkspaceId[];
};

export type PersonaDashboardProfile = {
  collapsedWidgetIds: string[];
  defaultVisibleWidgetIds: string[];
  description: string;
  emphasis: string[];
  id: WorkspaceId;
  label: string;
  primaryActionLabel: string;
};

export type WorkspaceProfile = {
  applicablePersonas: PersonaProfile[];
  criticalAlertPolicy: string;
  dashboardProfile: PersonaDashboardProfile;
  defaultRoute: string;
  isAutomatic: boolean;
  primaryPersona: PersonaProfile;
  quickActions: PersonaQuickAction[];
  selectedWorkspace: WorkspaceOption;
  workspaceOptions: WorkspaceOption[];
};
