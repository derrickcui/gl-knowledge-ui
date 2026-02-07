"use client";

import { useEffect, useState } from "react";
import { t } from "@/i18n";

const REJECT_REASONS = [
  { value: "TOO_GENERIC", labelKey: "glossary.rejectDialog.reason.tooGeneric" },
  { value: "NOT_DOMAIN_TERM", labelKey: "glossary.rejectDialog.reason.notDomain" },
  { value: "NOISE", labelKey: "glossary.rejectDialog.reason.noise" },
  { value: "OTHER", labelKey: "glossary.rejectDialog.reason.other" },
];

export function RejectDialog({
  open,
  term,
  loading,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  term: string;
  loading: boolean;
  onCancel: () => void;
  onConfirm: (payload: {
    reasonType: string;
    reason: string;
  }) => void;
}) {
  const [reasonType, setReasonType] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) {
      setReasonType("");
      setReason("");
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[440px] rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-base font-semibold">
          {t("glossary.rejectDialog.title")}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("glossary.rejectDialog.subtitle", { term })}
        </p>

        <div className="mt-4">
          <label className="text-xs font-medium text-muted-foreground">
            {t("glossary.rejectDialog.reasonTypeLabel")}
          </label>
          <select
            className="mt-2 w-full rounded-md border bg-white p-2 text-sm"
            value={reasonType}
            onChange={(e) => setReasonType(e.target.value)}
          >
            <option value="">
              {t("glossary.rejectDialog.reasonTypePlaceholder")}
            </option>
            {REJECT_REASONS.map((item) => (
              <option key={item.value} value={item.value}>
                {t(item.labelKey as any)}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4">
          <label className="text-xs font-medium text-muted-foreground">
            {t("glossary.rejectDialog.explanationLabel")}
          </label>
          <textarea
            className="mt-2 w-full rounded-md border p-2 text-sm"
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("glossary.rejectDialog.explanationPlaceholder")}
          />
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            className="rounded-md border px-3 py-1 text-sm"
            onClick={onCancel}
            disabled={loading}
          >
            {t("glossary.common.cancel")}
          </button>
          <button
            className="rounded-md bg-black px-4 py-1.5 text-sm text-white disabled:opacity-50"
            disabled={!reasonType || !reason.trim() || loading}
            onClick={() =>
              onConfirm({
                reasonType,
                reason: reason.trim(),
              })
            }
          >
            {t("glossary.rejectDialog.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
