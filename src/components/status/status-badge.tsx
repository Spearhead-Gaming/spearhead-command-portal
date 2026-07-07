import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type BadgeTone = "info" | "success" | "warning" | "danger" | "muted";

type StatusBadgeProps = {
  label: string;
  tone?: BadgeTone;
  className?: string;
};

const toneClasses: Record<BadgeTone, string> = {
  info: "border-info/35 bg-info/12 text-info",
  success: "border-success/35 bg-success/12 text-success",
  warning: "border-warning/35 bg-warning/12 text-warning",
  danger: "border-danger/35 bg-danger/12 text-danger",
  muted: "border-border bg-card/70 text-muted-foreground",
};

export function StatusBadge({
  label,
  tone = "muted",
  className,
}: StatusBadgeProps) {
  return (
    <Badge className={cn(toneClasses[tone], className)} variant="outline">
      <span className="truncate">{label}</span>
    </Badge>
  );
}
