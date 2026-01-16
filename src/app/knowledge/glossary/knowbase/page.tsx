import { fetchCandidates } from "@/lib/api";
import { PublishedView } from "../published/published-view";

export default async function KnowbasePage() {
  const response = await fetchCandidates({
    status: "PUBLISHED",
    limit: 10,
    offset: 0,
  });
  const data = response.data ?? {
    items: [],
    hasMore: false,
    nextCursor: null,
  };

  return <PublishedView initialData={data} mode="knowbase" />;
}
