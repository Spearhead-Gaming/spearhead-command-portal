import type { PortalUser } from "@/features/auth/types";
import {
  attendanceStatusCatalog,
  eventStatusCatalog,
  eventTypeCatalog,
} from "@/server/database/catalogs";

export const noAccessWhere = { in: ["__no-access__"] };

export function normalizeFilterValue(value?: string | null) {
  return value?.trim() ? value.trim() : undefined;
}

export function getPermissionScope(user: PortalUser, permissionKey: string) {
  const matchingGrants = user.permissionGrants.filter(
    (grant) => grant.key === permissionKey,
  );

  return {
    global: matchingGrants.some((grant) => grant.unitId === null),
    unitIds: Array.from(
      new Set(
        matchingGrants
          .map((grant) => grant.unitId)
          .filter((unitId): unitId is string => Boolean(unitId)),
      ),
    ),
  };
}

export function canAccessUnitScopedResource(
  user: PortalUser,
  permissionKey: string,
  unitId: string | null | undefined,
) {
  const scope = getPermissionScope(user, permissionKey);

  if (scope.global) {
    return true;
  }

  if (!unitId) {
    return false;
  }

  return scope.unitIds.includes(unitId);
}

export function getScopedUnitIds(user: PortalUser, permissionKey: string) {
  const scope = getPermissionScope(user, permissionKey);

  return scope.global ? null : scope.unitIds;
}

export function getEventStatusLabel(status: string) {
  return (
    eventStatusCatalog.find((entry) => entry.key === status)?.label ??
    status.replaceAll("-", " ")
  );
}

export function getEventTypeLabel(eventType: string) {
  return (
    eventTypeCatalog.find((entry) => entry.key === eventType)?.label ??
    eventType.replaceAll("-", " ")
  );
}

export function getRsvpLabel(status: string | null) {
  if (!status) {
    return "Missing RSVP";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function getFinalAttendanceLabel(status: string | null) {
  if (!status) {
    return "Pending";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function isEventStatus(value: string): value is (typeof eventStatusCatalog)[number]["key"] {
  return eventStatusCatalog.some((entry) => entry.key === value);
}

export function isEventType(value: string): value is (typeof eventTypeCatalog)[number]["key"] {
  return eventTypeCatalog.some((entry) => entry.key === value);
}

export function isRsvpStatus(
  value: string,
): value is (typeof attendanceStatusCatalog.rsvp)[number] {
  return attendanceStatusCatalog.rsvp.includes(
    value as (typeof attendanceStatusCatalog.rsvp)[number],
  );
}

export function isFinalAttendanceStatus(
  value: string,
): value is (typeof attendanceStatusCatalog.final)[number] {
  return attendanceStatusCatalog.final.includes(
    value as (typeof attendanceStatusCatalog.final)[number],
  );
}

export function calculateAttendanceRate(input: {
  present: number;
  late: number;
  absent: number;
}) {
  const accountable = input.present + input.late + input.absent;

  if (accountable === 0) {
    return null;
  }

  return Math.round(((input.present + input.late) / accountable) * 100);
}
