"use client";

import { useState } from "react";
import { CandidateDTO } from "@/lib/api";
import { useRouter } from "next/navigation";

import { CandidateHeader } from "./candidate-header";
import { CandidateTermEditor } from "./candidate-term-editor";
import { CandidateEvidencePanel } from "./candidate-evidence-panel";
import { CandidateActions } from "./candidate-actions";
import { FeedbackBanner } from "@/components/ui/feedback-banner";

export function CandidateDetailView({
  candidate,
}: {
  candidate: CandidateDTO;
}) {
  const [draft, setDraft] = useState(candidate);
  const readonly = candidate.status !== "CANDIDATE";
  const router = useRouter();
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
        
        <CandidateHeader
          candidate={candidate}
          onBack={() =>
            router.push("/knowledge/glossary/candidates")
          }
        />

        <div className="grid grid-cols-2 gap-6">
          <CandidateTermEditor
            draft={draft}
            readonly={readonly}
            onChange={setDraft}
          />

          <CandidateEvidencePanel candidate={candidate} />
        </div>

        {!readonly && (
          <CandidateActions
              draft={draft}
              onStatusChange={(status) =>
                setDraft({ ...draft, status })
              }
              onFeedback={setFeedback}
            />
        )}
      </div>
    </div>
  );
}
