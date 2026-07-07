import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { OperationsReleaseHistoryList } from "@/features/operations/components/release";
import { operationsPackageService } from "@/server/operations-package/service";

export async function OperationsReleaseHistoryPage({
  params,
}: {
  params: Promise<{ campaignId: string; weekNumber: string }>;
}) {
  const { campaignId, weekNumber } = await params;
  const parsedWeekNumber = Number(weekNumber);
  const data = await operationsPackageService.getPackage({
    campaignId,
    weekNumber: parsedWeekNumber,
  });

  if (!data) {
    notFound();
  }

  const packageHref = `/operations/packages/${data.campaign.id}/week/${data.week.weekNumber}`;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={["Operations", "Planning", "Release History"]}
        contextLabel={data.campaign.key}
        description="Permanent release and amendment records for this operational week."
        title={`${data.campaign.title} / Week ${data.week.weekNumber} Releases`}
      />
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href={packageHref}>Back to package</Link>
        </Button>
        <Button disabled variant="outline">
          Compare releases
        </Button>
      </div>
      {data.release ? <OperationsReleaseHistoryList history={data.release.history} /> : null}
    </div>
  );
}
