import { CandidateDTO } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { ConfidenceLabel } from "@/components/glossary/confidence-label";

export function CandidateHeader({
  candidate,
  status,
  onBack,
}: {
  candidate: CandidateDTO;
  status: string;
  onBack: () => void;
}) {
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

        <div className="mt-1 flex items-center gap-2 text-sm">
          <Badge variant={candidate.role as any}>
            {candidate.role}
          </Badge>
          <span className="opacity-60">
            Status: {status}
          </span>
        </div>
      </div>

      <ConfidenceLabel value={candidate.confidence} />
    </div>
  );
}
