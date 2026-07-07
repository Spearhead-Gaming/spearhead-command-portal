import { Badge } from "@/components/ui/badge";

type QualificationBadgeProps = {
  label: string;
};

export function QualificationBadge({ label }: QualificationBadgeProps) {
  return (
    <Badge className="border-success/25 bg-success/10 text-success" variant="outline">
      {label}
    </Badge>
  );
}
