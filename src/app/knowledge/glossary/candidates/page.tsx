import { fetchCandidates } from "@/lib/api";
import { CandidatesView } from "./candidates-view";

export default async function CandidatesPage() {
  const data = await fetchCandidates({
    status: "CANDIDATE",
    limit: 50,
    offset: 0,
  });

  return (
    <CandidatesView
      initialStatus="ALL"
      initialData={data}
    />
  );
}
