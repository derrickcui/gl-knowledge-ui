"use client";

import { useState } from "react";
import { useDraggableDialog } from "@/lib/useDraggableDialog";
import { t } from "@/i18n";

type PublishDialogProps = {
  open: boolean;
  versionLabel: string;
  loading?: boolean;
  onClose: () => void;
  onPublish: (comment: string) => Promise<void>;
};

export function PublishDialog({
  open,
  versionLabel,
  loading = false,
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
        <label className="mt-4 block text-sm font-medium">{t("topicSet.publish.comment")}</label>
        <textarea
          className="mt-2 h-24 w-full rounded-md border px-3 py-2 text-sm"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder={t("topicSet.publish.placeholder")}
        />
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
