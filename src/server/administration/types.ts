export type AdministrationPermissionEntry = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  module: string;
  category: string;
  assigned?: boolean;
  scopes?: string[];
};

export type AdministrationPermissionGroup = {
  module: string;
  moduleLabel: string;
  permissions: AdministrationPermissionEntry[];
};

export type AdministrationRoleAssignmentItem = {
  id: string;
  isActive: boolean;
  roleId: string;
  roleIsActive: boolean;
  roleIsSystem: boolean;
  roleLabel: string;
  roleName: string;
  scopeLabel: string;
  startsAtLabel: string | null;
  endsAtLabel: string | null;
  unitId: string | null;
  unitName: string | null;
};

export type AdministrationUserListItem = {
  activeRoleCount: number;
  createdAtLabel: string;
  discordId: string | null;
  displayName: string;
  effectivePermissionCount: number;
  email: string | null;
  id: string;
  isActive: boolean;
  linkedProfileLabel: string | null;
  roleLabels: string[];
  unitLabel: string | null;
};

export type AdministrationUserDetail = {
  assignedRoles: AdministrationRoleAssignmentItem[];
  auditSummary: {
    activeAssignments: number;
    totalAssignments: number;
  };
  createdAtLabel: string;
  currentPositionLabel: string | null;
  currentUnitLabel: string | null;
  discordId: string | null;
  displayName: string;
  effectivePermissionGroups: AdministrationPermissionGroup[];
  effectivePermissionKeys: string[];
  email: string | null;
  id: string;
  isActive: boolean;
  linkedProfileId: string | null;
  linkedProfileLabel: string | null;
  profileStatusLabel: string | null;
};

export type AdministrationRoleListItem = {
  activeAssignmentCount: number;
  id: string;
  isActive: boolean;
  isSystem: boolean;
  label: string;
  name: string;
  permissionCount: number;
  updatedAtLabel: string;
};

export type AdministrationRoleDetail = {
  assignedUsers: Array<{
    id: string;
    isActive: boolean;
    isUserActive: boolean;
    linkedProfileLabel: string | null;
    scopeLabel: string;
    startsAtLabel: string | null;
    unitId: string | null;
    userDisplayName: string;
    userEmail: string | null;
    userId: string;
  }>;
  description: string | null;
  id: string;
  isActive: boolean;
  isSystem: boolean;
  label: string;
  name: string;
  permissionCount: number;
  permissionGroups: AdministrationPermissionGroup[];
  updatedAtLabel: string;
};

export type AdministrationUserListData = {
  filters: {
    q?: string;
    state?: "active" | "inactive" | "";
  };
  users: AdministrationUserListItem[];
};

export type AdministrationRoleListData = {
  filters: {
    q?: string;
    state?: "active" | "inactive" | "";
  };
  roles: AdministrationRoleListItem[];
};

export type AdministrationReferenceData = {
  activeRoles: Array<{
    id: string;
    isSystem: boolean;
    label: string;
    name: string;
  }>;
  permissionGroups: AdministrationPermissionGroup[];
  units: Array<{
    id: string;
    name: string;
    shortName: string;
  }>;
};
