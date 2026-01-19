"use client";

import { useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

export default function RejectDialog({ open, onClose, onSubmit }: Props) {
  const [reason, setReason] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-[420px] space-y-3 rounded bg-white p-4 shadow-lg">
        <h3 className="text-sm font-semibold">拒绝评审</h3>
        <div className="text-xs text-slate-600">
          请填写拒绝原因（将记录在评审记录中）
        </div>
        <textarea
          className="w-full rounded border p-2 text-sm"
          rows={4}
          placeholder="请输入拒绝原因…"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded border px-3 py-1 text-sm"
            onClick={onClose}
          >
            取消
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
            确认拒绝
          </button>
        </div>
      </div>
    </div>
  );
}
