import { fetchCandidates } from "@/lib/api";
import { CandidatesView } from "./candidates-view";

export default async function CandidatesPage() {
  const response = await fetchCandidates({
    status: "CANDIDATE",
    limit: 10,
    offset: 0,
  });
  const data = response.data ?? {
    items: [],
    hasMore: false,
    nextCursor: null,
  };

  return (
    <CandidatesView
      initialStatus="ALL"
      initialData={data}
    />
  );
}
