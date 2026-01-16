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

  const [candidate, reviewInfo, relations] = await Promise.all([
    fetchCandidateById(candidateId),
    fetchReviewInfo(candidateId),
    fetchCandidateRelations(candidateId),
  ]);

  return (
    <CandidateDetailView
      candidate={candidate}
      reviewInfo={reviewInfo}
      relations={relations}
    />
  );
}
