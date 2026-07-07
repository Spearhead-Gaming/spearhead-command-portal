import { cn } from "@/lib/utils";
import type { MissionStatusKey } from "@/server/s3/types";

const missionLifecycleSteps: Array<{
  key: MissionStatusKey;
  label: string;
}> = [
  { key: "draft", label: "Draft" },
  { key: "s3-review", label: "S3 Review" },
  { key: "approved", label: "Approved" },
  { key: "published", label: "Published" },
  { key: "completed", label: "Completed" },
  { key: "aar-submitted", label: "AAR Submitted" },
  { key: "archived", label: "Archived" },
];

function getStepState(currentStatus: string, stepKey: MissionStatusKey) {
  const currentIndex = missionLifecycleSteps.findIndex((step) => step.key === currentStatus);
  const stepIndex = missionLifecycleSteps.findIndex((step) => step.key === stepKey);

  if (currentIndex === -1 || stepIndex === -1) {
    return "upcoming";
  }

  if (currentIndex === stepIndex) {
    return "current";
  }

  if (currentIndex > stepIndex) {
    return "complete";
  }

  return "upcoming";
}

export function MissionLifecycleStepper({
  className,
  compact = false,
  currentStatus,
}: {
  className?: string;
  compact?: boolean;
  currentStatus: string;
}) {
  return (
    <ol
      className={cn(
        "grid gap-2",
        compact ? "grid-cols-2 xl:grid-cols-4" : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
        className,
      )}
    >
      {missionLifecycleSteps.map((step) => {
        const state = getStepState(currentStatus, step.key);

        return (
          <li
            key={step.key}
            className={cn(
              "rounded-xl border px-3 py-2 transition-colors",
              state === "current" &&
                "border-primary/40 bg-primary/12 text-foreground shadow-[0_0_0_1px_rgba(67,126,247,0.14)]",
              state === "complete" &&
                "border-success/30 bg-success/10 text-foreground",
              state === "upcoming" &&
                "border-border/70 bg-background/45 text-muted-foreground",
            )}
          >
            <p className="text-[11px] uppercase tracking-[0.18em]">
              {state === "current"
                ? "Current"
                : state === "complete"
                  ? "Complete"
                  : "Next"}
            </p>
            <p className={cn("mt-1 font-medium", compact ? "text-sm" : "text-sm sm:text-[15px]")}>
              {step.label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
