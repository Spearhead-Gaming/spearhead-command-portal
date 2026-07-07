import { StatusBadge } from "@/components/status/status-badge";

type AttendanceBadgeProps = {
  label: string;
};

function inferAttendanceTone(label: string) {
  const normalized = label.toLowerCase();

  if (normalized.includes("%")) {
    const parsed = Number.parseInt(normalized, 10);

    if (!Number.isNaN(parsed)) {
      if (parsed >= 85) {
        return "success" as const;
      }

      if (parsed >= 70) {
        return "warning" as const;
      }

      return "danger" as const;
    }
  }

  if (
    normalized.includes("complete") ||
    normalized.includes("attending") ||
    normalized.includes("ready")
  ) {
    return "success" as const;
  }

  if (
    normalized.includes("pending") ||
    normalized.includes("rsvp") ||
    normalized.includes("open")
  ) {
    return "warning" as const;
  }

  if (
    normalized.includes("no") ||
    normalized.includes("missing") ||
    normalized.includes("loa")
  ) {
    return "danger" as const;
  }

  return "muted" as const;
}

export function AttendanceBadge({ label }: AttendanceBadgeProps) {
  return <StatusBadge label={label} tone={inferAttendanceTone(label)} />;
}
