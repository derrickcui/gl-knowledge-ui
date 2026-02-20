import { RuleApprovalPanel } from "./internal/RuleApprovalPanel";
import type { ReviewDecision } from "./types";

type ReviewActionBarProps = {
  decision: ReviewDecision;
  comment: string;
  onDecisionChange: (decision: ReviewDecision) => void;
  onCommentChange: (comment: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  canSubmit: boolean;
  expectedHashReady: boolean;
  expectedHashHint?: string | null;
  readOnly: boolean;
  readOnlyMessage?: string;
};

export function ReviewActionBar(props: ReviewActionBarProps) {
  return <RuleApprovalPanel {...props} />;
}
