"use client";

import { useEffect, useState } from "react";

export function ApproveDialog({
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
        <h3 className="text-base font-semibold">Approve Term</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          You are approving <strong>{term}</strong>. Provide a reason.
        </p>

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
            Confirm Approve
          </button>
        </div>
      </div>
    </div>
  );
}
