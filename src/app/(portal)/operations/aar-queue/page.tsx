import { AarsLibraryPage } from "@/features/s3/pages";

type SearchParamsValue = string | string[] | undefined;

export default async function OperationsAarQueuePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, SearchParamsValue>>;
}) {
  return (
    <AarsLibraryPage
      basePath="/operations/aar-queue"
      searchParams={searchParams}
    />
  );
}
