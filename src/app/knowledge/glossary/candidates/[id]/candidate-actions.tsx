"use client";

import { useState } from "react";
import { createChange, submitChange } from "@/lib/api";
import { CandidateDTO } from "@/lib/api";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function CandidateActions({
  draft,
  onStatusChange,
  onFeedback,
}: {
  draft: CandidateDTO;
  onStatusChange: (status: string) => void;
  onFeedback: (fb: {
    type: "error" | "success";
    title: string;
    message?: string;
  }) => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function doSubmit() {
    try {
      setSubmitting(true);

      // 1️⃣ create change
      const change = await createChange({
        candidateId: draft.id,
        payload: {
          canonical: draft.canonical,
          aliases: draft.aliases,
          definition: draft.definition,
          role: draft.role,
        },
        submittedBy: "system", // V1 写死即可
      });

      // 2️⃣ submit change
      await submitChange(change.id, {
        submittedBy: "system",
      });

      // 3️⃣ 更新状态（页面变只读）
      onStatusChange("IN_REVIEW");

      // 4️⃣ 成功反馈（交给页面统一展示）
      onFeedback({
        type: "success",
        title: "Submitted for review",
        message: `The term "${draft.canonical}" is now under review.`,
      });

      setConfirmOpen(false);
    } catch (e: any) {
      console.error(e);

      // ❗ 不再 alert，而是统一反馈
      onFeedback({
        type: "error",
        title: "Failed to submit for review",
        message:
          e?.message ||
          "Please check the term information or try again later.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="flex gap-2">
        <button
          className="rounded-md border px-3 py-1 text-sm"
          disabled={submitting}
        >
          Save Draft
        </button>

        <button
          className="rounded-md bg-black px-3 py-1 text-sm text-white"
          onClick={() => setConfirmOpen(true)}
          disabled={submitting}
        >
          Submit for Review
        </button>

        <button
          className="rounded-md border border-red-300 px-3 py-1 text-sm text-red-600"
          disabled={submitting}
        >
          Reject
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        subject={{
          title: draft.canonical,
          meta: `role: ${draft.role}`,
          fromStatus: draft.status,
          toStatus: "IN_REVIEW",
        }}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={doSubmit}
      />
    </>
  );
}
