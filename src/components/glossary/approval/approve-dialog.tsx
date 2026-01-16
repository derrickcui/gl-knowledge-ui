"use client";

import { useEffect, useState } from "react";

export function ApproveDialog({
  open,
  term,
  summary,
  loading,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  term: string;
  summary: {
    total: number;
    inactive: number;
  };
  loading: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) setReason("");
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[420px] rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-base font-semibold">Approve Concept</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          You are approving this concept. Provide a reason.
        </p>

        <div className="mt-4 rounded-md bg-muted/40 p-3 text-sm">
          <div className="font-medium">This approval may lead to:</div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>{summary.total} relationship becoming eligible for activation</li>
            <li>
              {summary.inactive} relationship
              {summary.inactive === 1 ? "" : "s"} will remain inactive (target not published)
            </li>
          </ul>
        </div>

        <div className="mt-4">
          <label className="text-xs font-medium text-muted-foreground">
            Reason (required)
          </label>
          <textarea
            className="mt-2 w-full rounded-md border p-2 text-sm"
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Approval reason"
          />
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            className="rounded-md border px-3 py-1 text-sm"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="rounded-md bg-black px-4 py-1.5 text-sm text-white disabled:opacity-50"
            disabled={!reason.trim() || loading}
            onClick={() => onConfirm(reason.trim())}
          >
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}
