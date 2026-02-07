"use client";

import { useState } from "react";
import {
  CandidateDTO,
  ReviewInfoDTO,
  createChange,
  submitChange,
} from "@/lib/api";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { t } from "@/i18n";

export function CandidateActions({
  draft,
  reviewInfo,
  onFeedback,
  onDone,
}: {
  draft: CandidateDTO;
  reviewInfo: ReviewInfoDTO;
  onFeedback: (f: {
    type: "error" | "success" | "info";
    title: string;
    message?: string;
  }) => void;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    try {
      setLoading(true);
      onFeedback({
        type: "info",
        title: t("glossary.common.processing", {
          action: t("glossary.common.action.submitReview"),
        }),
      });

      const changeResult = await createChange({
        candidateId: draft.id,
        payload: {
          canonical: draft.canonical,
          aliases: draft.aliases,
          definition: draft.definition,
          role: draft.role,
        },
        submittedBy: "ui-user",
      });

      if (!changeResult.data) {
        throw new Error(
          changeResult.error ?? t("glossary.candidates.submit.createFailed")
        );
      }

      const submitResult = await submitChange(changeResult.data.id, {
        submittedBy: "ui-user",
      });
      if (!submitResult.data) {
        throw new Error(
          submitResult.error ?? t("glossary.candidates.submit.submitFailed")
        );
      }

      onFeedback({
        type: "success",
        title: t("glossary.candidates.submit.success"),
      });

      setOpen(false);
      onDone();
    } catch (e: any) {
      onFeedback({
        type: "error",
        title: t("glossary.candidates.submit.failed"),
        message: e?.message,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex gap-2">
        <button
          className="rounded-md bg-black px-3 py-1 text-sm text-white disabled:opacity-50"
          disabled={!reviewInfo.canSubmitForReview || loading}
          title={reviewInfo.reason}
          onClick={() => setOpen(true)}
        >
          {t("glossary.candidates.submit.button")}
        </button>
      </div>

      <ConfirmDialog
        open={open}
        subject={{
          title: draft.canonical,
          meta: `${t("glossary.common.role")}: ${draft.role}`,
          fromStatus: reviewInfo.effectiveStatus,
          toStatus: "IN_REVIEW",
        }}
        onCancel={() => setOpen(false)}
        onConfirm={handleSubmit}
      />
    </>
  );
}
