export type PortalPermissionGrant = {
  key: string;
  roleId: string;
  roleLabel: string;
  unitId: string | null;
  unitName: string | null;
};

export type PortalUser = {
  id: string;
  email: string | null;
  displayName: string;
  callsign: string | null;
  primaryRole: string;
  primaryUnitId: string | null;
  unit: string | null;
  permissions: string[];
  permissionGrants: PortalPermissionGrant[];
  avatarUrl: string | null;
  discordId: string | null;
  discordLinked: boolean;
  memberProfileId: string | null;
  memberProfileLinked: boolean;
};

export type AuthenticatedPortalSession = {
  mode: "authenticated";
  authReady: true;
  discordReady: true;
  user: PortalUser;
};

export type UnauthenticatedPortalSession = {
  mode: "unauthenticated";
  authReady: true;
  discordReady: true;
  user: null;
};

export type PortalSession =
  | AuthenticatedPortalSession
  | UnauthenticatedPortalSession;
