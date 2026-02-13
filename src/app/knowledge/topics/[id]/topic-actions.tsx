"use client";

import { useState } from "react";
import { t } from "@/i18n";
import { useDraggableDialog } from "@/lib/useDraggableDialog";

interface Props {
  status: string;
  onSaveDraft?: () => void;
  onDeleteDraft?: () => void;
  onSubmitReview?: () => void;
  onPublish?: () => void;
  busy?: boolean;
  showSubmitReview?: boolean;
}

export function TopicActions({
  status,
  onSaveDraft,
  onDeleteDraft,
  onSubmitReview,
  onPublish,
  busy = false,
  showSubmitReview = false,
}: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] =
    useState(false);
  const submitDialogDrag = useDraggableDialog(confirmOpen);
  const deleteDialogDrag = useDraggableDialog(deleteConfirmOpen);
  const isInReview = status === "IN_REVIEW";
  const isDisabled = isInReview || busy;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
          {status}
        </span>
        <span className="text-xs text-muted-foreground">
          {isInReview
            ? t("topicActions.status.inReviewHint")
            : t("topicActions.status.draftHint")}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {onDeleteDraft && (
          <button
            type="button"
            className="h-9 rounded-md border px-3 text-sm"
            onClick={() => setDeleteConfirmOpen(true)}
            disabled={isDisabled}
          >
            {t("topicActions.deleteDraft")}
          </button>
        )}
        <button
          type="button"
          className="h-9 rounded-md border px-3 text-sm"
          onClick={onSaveDraft}
          disabled={isDisabled}
        >
          {busy
            ? t("topicActions.savingDraft")
            : t("topicActions.saveDraft")}
        </button>
        {showSubmitReview && (
          <button
            type="button"
            className={`h-9 rounded-md px-3 text-sm text-white ${
              isDisabled
                ? "cursor-not-allowed bg-slate-300"
                : "bg-black"
            }`}
            onClick={() => {
              if (isDisabled) return;
              setConfirmOpen(true);
            }}
            disabled={isDisabled}
          >
            {t("topicActions.submitReview")}
          </button>
        )}
        <button
          type="button"
          className="h-9 rounded-md border px-3 text-sm"
          onClick={onPublish}
          disabled={isDisabled}
        >
          {t("topicActions.publish")}
        </button>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[420px] rounded-lg bg-white p-6 shadow-xl" style={submitDialogDrag.style}>
            <div
              className={`select-none ${submitDialogDrag.dragging ? "cursor-grabbing" : "cursor-grab"}`}
              {...submitDialogDrag.handleProps}
            >
              <h3 className="text-base font-semibold">
                {t("topicActions.submitReviewTitle")}
              </h3>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("topicActions.submitReviewHint")}
            </p>
            <div className="mt-4 rounded-md border bg-muted/30 p-3 text-sm">
              <div>
                {t("topicActions.submitReview.currentStatus", {
                  status,
                })}
              </div>
              <div className="mt-1">
                {t("topicActions.submitReview.nextStatus", {
                  status: "IN_REVIEW",
                })}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                className="rounded-md border px-3 py-1 text-sm"
                onClick={() => setConfirmOpen(false)}
              >
                {t("topicActions.cancel")}
              </button>
              <button
                className="rounded-md bg-black px-4 py-1.5 text-sm text-white"
                onClick={() => {
                  setConfirmOpen(false);
                  onSubmitReview?.();
                }}
              >
                {t("topicActions.confirmSubmit")}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmOpen && onDeleteDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[420px] rounded-lg bg-white p-6 shadow-xl" style={deleteDialogDrag.style}>
            <div
              className={`select-none ${deleteDialogDrag.dragging ? "cursor-grabbing" : "cursor-grab"}`}
              {...deleteDialogDrag.handleProps}
            >
              <h3 className="text-base font-semibold">
                {t("topicActions.deleteDraftTitle")}
              </h3>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("topicActions.deleteDraftHint")}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                className="rounded-md border px-3 py-1 text-sm"
                onClick={() => setDeleteConfirmOpen(false)}
              >
                {t("topicActions.cancel")}
              </button>
              <button
                className="rounded-md bg-black px-4 py-1.5 text-sm text-white"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  onDeleteDraft?.();
                }}
              >
                {t("topicActions.confirmDelete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
