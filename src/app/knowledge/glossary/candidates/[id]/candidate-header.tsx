import { CandidateDTO } from "@/lib/api";
import { ConfidenceLabel } from "@/components/glossary/confidence-label";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Not Reviewed",
  CANDIDATE: "Not Reviewed",
  SUBMITTED: "Under Review",
  IN_REVIEW: "Under Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

function getStatusLabel(status: string) {
  return STATUS_LABELS[status] ?? status;
}

export function CandidateHeader({
  candidate,
  status,
  onBack,
}: {
  candidate: CandidateDTO;
  status: string;
  onBack: () => void;
}) {
  const statusLabel = getStatusLabel(status);
  const roleLabel = candidate.role
    ? `${candidate.role[0].toUpperCase()}${candidate.role.slice(1)}`
    : "Role";

  return (
    <div className="flex items-start justify-between">
      <div>
        <button
          className="mb-2 text-sm text-muted-foreground hover:underline"
          onClick={onBack}
        >
          ← Back to Candidates
        </button>

        <h1 className="text-lg font-semibold">
          {candidate.canonical}
        </h1>

        <div className="mt-1 text-sm text-muted-foreground">
          {roleLabel} · {statusLabel}
        </div>
      </div>

      <ConfidenceLabel value={candidate.confidence} />
    </div>
  );
}
