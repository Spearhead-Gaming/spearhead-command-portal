import { redirect } from "next/navigation";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

function buildRedirectHref(pathname: string, searchParams?: SearchParamsRecord) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    const normalized = Array.isArray(value) ? value[0] : value;

    if (normalized) {
      params.set(key, normalized);
    }
  }

  const query = params.toString();

  return query ? `${pathname}?${query}` : pathname;
}

export default async function LegacyCampaignsRoute({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  redirect(buildRedirectHref("/operations/deployments", await searchParams));
}
