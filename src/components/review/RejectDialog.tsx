"use client";

import { useState } from "react";
import { t } from "@/i18n";
import { useDraggableDialog } from "@/lib/useDraggableDialog";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

export default function RejectDialog({ open, onClose, onSubmit }: Props) {
  const [reason, setReason] = useState("");
  const draggable = useDraggableDialog(open);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div
        className="w-[420px] space-y-3 rounded bg-white p-4 shadow-lg"
        style={draggable.style}
      >
        <div
          className={`select-none ${draggable.dragging ? "cursor-grabbing" : "cursor-grab"}`}
          {...draggable.handleProps}
        >
          <h3 className="text-sm font-semibold">{t("review.reject.title")}</h3>
        </div>
        <div className="text-xs text-slate-600">
          {t("review.reject.hint")}
        </div>
        <textarea
          className="w-full rounded border p-2 text-sm"
          rows={4}
          placeholder={t("review.reject.placeholder")}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded border px-3 py-1 text-sm"
            onClick={onClose}
          >
            {t("review.reject.cancel")}
          </button>
          <button
            type="button"
            className="rounded bg-red-600 px-3 py-1 text-sm text-white disabled:opacity-50"
            disabled={!reason.trim()}
            onClick={() => {
              onSubmit(reason.trim());
              setReason("");
            }}
          >
            {t("review.reject.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
