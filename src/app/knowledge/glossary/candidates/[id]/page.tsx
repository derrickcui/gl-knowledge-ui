import {
  fetchCandidateById,
  fetchCandidateRelations,
  fetchReviewInfo,
} from "@/lib/api";
import { CandidateDetailView } from "./candidate-detail-view";

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const candidateId = Number(id);

  const [candidateResult, reviewInfoResult, relationsResult] =
    await Promise.all([
      fetchCandidateById(candidateId),
      fetchReviewInfo(candidateId),
      fetchCandidateRelations(candidateId),
    ]);
  const candidate = candidateResult.data;
  const reviewInfo = reviewInfoResult.data;
  const relations = relationsResult.data;
  const loadError =
    candidateResult.error ||
    reviewInfoResult.error ||
    relationsResult.error;

  if (!candidate || !reviewInfo || !relations) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800">
        {loadError ?? "Unable to load candidate details."}
      </div>
    );
  }

  return (
    <CandidateDetailView
      candidate={candidate}
      reviewInfo={reviewInfo}
      relations={relations}
    />
  );
}
