import { redirect } from "next/navigation";

import type { PortalUser } from "@/features/auth/types";
import { getCurrentUser } from "@/server/auth/current-user";
import {
  aarStatusCatalog,
  conopStatusCatalog,
  missionStatusCatalog,
} from "@/server/database/catalogs";
import { can } from "@/server/permissions/access";

export function getMissionStatusLabel(status: string) {
  return (
    missionStatusCatalog.find((entry) => entry.key === status)?.label ??
    status.replaceAll("-", " ")
  );
}

export function getConopStatusLabel(status: string) {
  return (
    conopStatusCatalog.find((entry) => entry.key === status)?.label ??
    status.replaceAll("-", " ")
  );
}

export function getAarStatusLabel(status: string) {
  return (
    aarStatusCatalog.find((entry) => entry.key === status)?.label ??
    status.replaceAll("-", " ")
  );
}

export function isMissionStatus(
  value: string,
): value is (typeof missionStatusCatalog)[number]["key"] {
  return missionStatusCatalog.some((entry) => entry.key === value);
}

export function isConopStatus(
  value: string,
): value is (typeof conopStatusCatalog)[number]["key"] {
  return conopStatusCatalog.some((entry) => entry.key === value);
}

export function isAarStatus(
  value: string,
): value is (typeof aarStatusCatalog)[number]["key"] {
  return aarStatusCatalog.some((entry) => entry.key === value);
}

const missionStatusTransitions = {
  draft: ["s3-review", "archived"],
  "s3-review": ["approved", "draft", "archived"],
  approved: ["published", "draft", "archived"],
  published: ["completed", "archived"],
  completed: ["aar-submitted", "archived"],
  "aar-submitted": ["archived"],
  archived: [],
} as const satisfies Record<
  (typeof missionStatusCatalog)[number]["key"],
  readonly (typeof missionStatusCatalog)[number]["key"][]
>;

export function getMissionStatusTransitions(status: string) {
  if (!isMissionStatus(status)) {
    return [] as (typeof missionStatusCatalog)[number]["key"][];
  }

  return [...missionStatusTransitions[status]] as (typeof missionStatusCatalog)[number]["key"][];
}

export function canTransitionMissionStatus(currentStatus: string, nextStatus: string) {
  if (!isMissionStatus(currentStatus) || !isMissionStatus(nextStatus)) {
    return false;
  }

  if (currentStatus === nextStatus) {
    return true;
  }

  return getMissionStatusTransitions(currentStatus).includes(nextStatus);
}

export function userCanAccessAnyScopedUnit(
  user: PortalUser,
  permissionKey: string,
  hostUnitIds: Array<string | null | undefined>,
) {
  if (can(user, permissionKey)) {
    return true;
  }

  return hostUnitIds.some((hostUnitId) =>
    hostUnitId ? can(user, permissionKey, { unitId: hostUnitId }) : false,
  );
}

export async function requireAnyS3Permission(permissionKeys: string[]) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/unauthorized");
  }

  if (!permissionKeys.some((permissionKey) => can(user, permissionKey))) {
    redirect("/forbidden");
  }

  return user;
}

export async function requireScopedS3Permission(
  permissionKey: string,
  hostUnitIds: Array<string | null | undefined>,
) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("An authenticated user is required.");
  }

  if (can(user, permissionKey)) {
    return user;
  }

  const scopedHostUnitIds = Array.from(
    new Set(hostUnitIds.filter((hostUnitId): hostUnitId is string => Boolean(hostUnitId))),
  );

  if (scopedHostUnitIds.length === 0) {
    throw new Error("You do not have permission to manage this S3 record.");
  }

  if (scopedHostUnitIds.some((hostUnitId) => can(user, permissionKey, { unitId: hostUnitId }))) {
    return user;
  }

  throw new Error("You do not have permission to manage this S3 record.");
}

export async function requireAnyScopedPermission(
  permissionKeys: string[],
  hostUnitIds: Array<string | null | undefined>,
) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("An authenticated user is required.");
  }

  if (permissionKeys.some((permissionKey) => can(user, permissionKey))) {
    return user;
  }

  const scopedHostUnitIds = Array.from(
    new Set(hostUnitIds.filter((hostUnitId): hostUnitId is string => Boolean(hostUnitId))),
  );

  if (
    scopedHostUnitIds.some((hostUnitId) =>
      permissionKeys.some((permissionKey) => can(user, permissionKey, { unitId: hostUnitId })),
    )
  ) {
    return user;
  }

  throw new Error("You do not have permission to manage this record.");
}
