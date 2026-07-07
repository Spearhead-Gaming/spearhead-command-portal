import { QualificationMatrixFoundationPage } from "@/features/qualifications/pages";
import { PlaceholderRoutePage } from "@/components/shared/placeholder-route-page";
import { trainingPageConfigs } from "@/features/training/config";

export async function QualificationMatrixPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <QualificationMatrixFoundationPage searchParams={searchParams} />;
}

export function TrainingEventsPage() {
  return <PlaceholderRoutePage config={trainingPageConfigs.trainingEvents} />;
}

export function InstructorsPage() {
  return <PlaceholderRoutePage config={trainingPageConfigs.instructors} />;
}
