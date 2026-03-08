"use client";

import { useState } from "react";
import { useDraggableDialog } from "@/lib/useDraggableDialog";
import { t } from "@/i18n";
import { TopicSetValidationDetails } from "@/lib/topicset-api";
import { LifecycleValidationPanel } from "./lifecycle-validation-panel";

type PublishDialogProps = {
  open: boolean;
  versionLabel: string;
  loading?: boolean;
  diffLoading?: boolean;
  diffSummary?: {
    nodesAdded: number;
    nodesRemoved: number;
    nodesMoved: number;
    nodesUpdated: number;
    topicBindingsChanged: number;
  } | null;
  errorMessage?: string | null;
  validationDetails?: TopicSetValidationDetails | null;
  onClose: () => void;
  onPublish: (comment: string) => Promise<void>;
};

export function PublishDialog({
  open,
  versionLabel,
  loading = false,
  diffLoading = false,
  diffSummary,
  errorMessage,
  validationDetails,
  onClose,
  onPublish,
}: PublishDialogProps) {
  const [comment, setComment] = useState(t("topicSet.publish.placeholder"));
  const draggable = useDraggableDialog(open);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[520px] rounded-lg bg-white p-5 shadow-xl" style={draggable.style}>
        <div
          className={`select-none ${draggable.dragging ? "cursor-grabbing" : "cursor-grab"}`}
          {...draggable.handleProps}
        >
          <h3 className="text-lg font-semibold">{t("topicSet.publish.dialogTitle")}</h3>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {t("topicSet.publish.currentVersion")} {versionLabel}
        </p>
        <div className="mt-4 rounded-lg border bg-slate-50 p-3 text-xs">
          <div className="font-medium">{t("topicSet.publish.changes")}</div>
          {diffLoading && <div className="mt-2 text-muted-foreground">{t("common.loading")}</div>}
          {!diffLoading && diffSummary && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>{t("topicSet.diff.summary.added")}: {diffSummary.nodesAdded}</div>
              <div>{t("topicSet.diff.summary.removed")}: {diffSummary.nodesRemoved}</div>
              <div>{t("topicSet.diff.summary.moved")}: {diffSummary.nodesMoved}</div>
              <div>{t("topicSet.diff.summary.updated")}: {diffSummary.nodesUpdated}</div>
              <div className="col-span-2">
                {t("topicSet.diff.summary.topicChanged")}: {diffSummary.topicBindingsChanged}
              </div>
            </div>
          )}
          {!diffLoading && !diffSummary && (
            <div className="mt-2 text-muted-foreground">{t("topicSet.publish.noBaseline")}</div>
          )}
          {!diffLoading && (diffSummary?.nodesRemoved ?? 0) >= 10 && (
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
              {t("topicSet.publish.warningRemoved", { count: diffSummary?.nodesRemoved ?? 0 })}
            </div>
          )}
        </div>
        <label className="mt-4 block text-sm font-medium">{t("topicSet.publish.comment")}</label>
        <textarea
          className="mt-2 h-24 w-full rounded-md border px-3 py-2 text-sm"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder={t("topicSet.publish.placeholder")}
        />
        {errorMessage && (
          <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage}
          </div>
        )}
        <LifecycleValidationPanel details={validationDetails} />
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-md border px-3 py-1.5 text-sm"
            onClick={onClose}
            disabled={loading}
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            className="rounded-md bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50"
            onClick={() => onPublish(comment.trim())}
            disabled={loading}
          >
            {loading ? t("topicSet.publish.publishing") : t("topicSet.workspace.publish")}
          </button>
        </div>
      </div>
    </div>
  );
}
