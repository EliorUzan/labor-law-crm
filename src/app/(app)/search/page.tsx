import { z } from "zod";

import { requireAuthenticatedUserId } from "@/lib/auth";
import { searchRecords } from "@/modules/search/queries";
import { SearchPageContent } from "@/modules/search/search-page";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const ownerUserId = await requireAuthenticatedUserId();
  const query = z.string().trim().max(200).catch("").parse((await searchParams).q);
  const results = await searchRecords(ownerUserId, query);
  return <SearchPageContent query={query} results={results} />;
}
