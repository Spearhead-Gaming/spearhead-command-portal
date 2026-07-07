import { Badge } from "@/components/ui/badge";

type UnitBadgeProps = {
  label: string;
};

export function UnitBadge({ label }: UnitBadgeProps) {
  return (
    <Badge className="border-accent/25 bg-accent/10 text-accent" variant="outline">
      {label}
    </Badge>
  );
}
