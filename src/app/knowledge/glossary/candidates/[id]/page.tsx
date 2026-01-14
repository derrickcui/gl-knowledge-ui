import {
  fetchCandidateById,
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

  const [candidate, reviewInfo] = await Promise.all([
    fetchCandidateById(candidateId),
    fetchReviewInfo(candidateId),
  ]);

  return (
    <CandidateDetailView
      candidate={candidate}
      reviewInfo={reviewInfo}
    />
  );
}
