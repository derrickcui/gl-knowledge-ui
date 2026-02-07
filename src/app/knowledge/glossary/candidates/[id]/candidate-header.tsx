import { CandidateDTO } from "@/lib/api";
import { ConfidenceLabel } from "@/components/glossary/confidence-label";
import { t } from "@/i18n";

function getStatusLabel(status: string) {
  switch (status) {
    case "DRAFT":
    case "PENDING_REVIEW":
    case "CANDIDATE":
      return t("glossary.status.pendingReview");
    case "SUBMITTED":
    case "IN_REVIEW":
      return t("glossary.status.underReview");
    case "APPROVED":
    case "PUBLISHED":
      return t("glossary.status.published");
    case "REJECTED":
      return t("glossary.status.rejected");
    default:
      return status;
  }
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
    : t("glossary.common.role");

  return (
    <div className="flex items-start justify-between">
      <div>
        <button
          className="mb-2 text-sm text-muted-foreground hover:underline"
          onClick={onBack}
        >
          {t("glossary.candidates.back")}
        </button>

        <h1 className="text-lg font-semibold">
          {candidate.canonical}
        </h1>

        <div className="mt-1 text-sm text-muted-foreground">
          {roleLabel} - {statusLabel}
        </div>
      </div>

      <ConfidenceLabel value={candidate.confidence} />
    </div>
  );
}
