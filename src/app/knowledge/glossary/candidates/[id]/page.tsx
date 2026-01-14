import { fetchCandidateById } from "@/lib/api";
import { CandidateDetailView } from "./candidate-detail-view";

export default async function CandidateDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const candidate = await fetchCandidateById(Number(params.id));

  return <CandidateDetailView candidate={candidate} />;
}
