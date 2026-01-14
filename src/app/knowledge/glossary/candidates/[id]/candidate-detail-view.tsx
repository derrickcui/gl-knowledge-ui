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

  // ✅ 唯一正确的 readonly 判断
  const readonly =
    reviewInfo.effectiveStatus !== "CANDIDATE";

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
        {/* Header：结构不变，只是状态来源变 */}
        <CandidateHeader
          candidate={candidate}
          status={reviewInfo.effectiveStatus}
          onBack={() =>
            router.push("/knowledge/glossary/candidates")
          }
        />

        {/* 主体内容：完全恢复 */}
        <div className="grid grid-cols-2 gap-6">
          <CandidateTermEditor
            draft={draft}
            readonly={readonly}
            onChange={setDraft}
          />

          <CandidateEvidencePanel candidate={candidate} />
        </div>

        {/* Actions：只由 reviewInfo 决定是否出现 */}
        {reviewInfo.canSubmitForReview && (
          <CandidateActions
            draft={draft}
            reviewInfo={reviewInfo}
            onFeedback={setFeedback}
            onDone={() => router.refresh()}
          />
        )}
      </div>
    </div>
  );
}
