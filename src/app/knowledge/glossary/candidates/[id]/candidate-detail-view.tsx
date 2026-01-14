"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CandidateDTO, ReviewInfoDTO } from "@/lib/api";

import { CandidateHeader } from "./candidate-header";
import { CandidateTermEditor } from "./candidate-term-editor";
import { CandidateEvidencePanel } from "./candidate-evidence-panel";
import { CandidateActions } from "./candidate-actions";
import { FeedbackBanner } from "@/components/ui/feedback-banner";

export function CandidateDetailView({
  candidate,
  reviewInfo,
}: {
  candidate: CandidateDTO;
  reviewInfo: ReviewInfoDTO;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(candidate);

  // ƒo. †"_„,?‘-œ‡­r‡s, readonly †^‘--
  const effectiveStatus =
    candidate.lifecycleStatus ??
    reviewInfo.effectiveStatus ??
    candidate.status;
  const readonly = effectiveStatus !== "CANDIDATE";
  const isInReview =
    effectiveStatus === "IN_REVIEW" ||
    effectiveStatus === "SUBMITTED";
  const submittedBy =
    candidate.submitted_by ??
    reviewInfo.submittedBy ??
    (reviewInfo as any).submitted_by;
  const submittedAt =
    reviewInfo.submittedAt ??
    (reviewInfo as any).submitted_at;
  const reviewedBy = candidate.reviewed_by;
  const reviewComment = candidate.review_comment;
  const publishedAt = candidate.published_at;

  const [feedback, setFeedback] = useState<null | {
    type: "error" | "success";
    title: string;
    message?: string;
  }>(null);

  return (
    <div className="space-y-4">
      {feedback && (
        <FeedbackBanner
          type={feedback.type}
          title={feedback.title}
          message={feedback.message}
          onDismiss={() => setFeedback(null)}
        />
      )}

      <div className="space-y-6">
        {/* Header‹¬s‡¯"‘z,„,?†?~‹¬O†?¦‘~_‡S‘??‘?‘§?†?~ */}
        <CandidateHeader
          candidate={candidate}
          status={effectiveStatus}
          onBack={() =>
            router.push("/knowledge/glossary/candidates")
          }
        />

        {isInReview && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            This term is under review. Editing is locked.
          </div>
        )}

        {(candidate.lifecycleStatus ||
          candidate.extractionStatus ||
          submittedBy ||
          submittedAt ||
          reviewedBy ||
          reviewComment ||
          publishedAt) && (
          <details className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
            <summary className="cursor-pointer select-none font-medium">
              Governance Info
            </summary>
            <div className="mt-2 flex flex-wrap gap-4">
              {candidate.lifecycleStatus && (
                <span>
                  Lifecycle:{" "}
                  <span className="font-medium">
                    {candidate.lifecycleStatus}
                  </span>
                </span>
              )}
              {candidate.extractionStatus && (
                <span>
                  Extraction:{" "}
                  <span className="font-medium">
                    {candidate.extractionStatus}
                  </span>
                </span>
              )}
              {submittedBy && (
                <span>
                  Submitted by:{" "}
                  <span className="font-medium">{submittedBy}</span>
                </span>
              )}
              {submittedAt && (
                <span>
                  Submitted at:{" "}
                  <span className="font-medium">{submittedAt}</span>
                </span>
              )}
              {reviewedBy && (
                <span>
                  Reviewed by:{" "}
                  <span className="font-medium">{reviewedBy}</span>
                </span>
              )}
              {publishedAt && (
                <span>
                  Published at:{" "}
                  <span className="font-medium">{publishedAt}</span>
                </span>
              )}
              {reviewComment && (
                <span>
                  Review comment:{" "}
                  <span className="font-medium">{reviewComment}</span>
                </span>
              )}
            </div>
          </details>
        )}

        {/* „,¯„«"†+.†r1‹¬s†rO†."‘?›†? */}
        <div className="grid grid-cols-2 gap-6">
          <CandidateTermEditor
            draft={draft}
            readonly={readonly}
            onChange={setDraft}
          />

          <CandidateEvidencePanel candidate={candidate} />
        </div>

        {/* Actions‹¬s†?¦‡"ñ reviewInfo †+3†rs‘~_†?Ý†Ø§‡Zø */}
        {reviewInfo.canSubmitForReview && (
          <CandidateActions
            draft={draft}
            reviewInfo={reviewInfo}
            onFeedback={setFeedback}
            onDone={() => router.refresh()}
          />
        )}

        {isInReview && (
          <div className="flex gap-2">
            <button
              className="rounded-md border px-3 py-1 text-sm text-muted-foreground"
              disabled
            >
              Approve
            </button>
            <button
              className="rounded-md border px-3 py-1 text-sm text-muted-foreground"
              disabled
            >
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
