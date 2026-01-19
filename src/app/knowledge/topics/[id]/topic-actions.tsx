import { useState } from "react";

interface Props {
  status: string;
  onSaveDraft?: () => void;
  onSubmitReview?: () => void;
  onPublish?: () => void;
}

export function TopicActions({
  status,
  onSaveDraft,
  onSubmitReview,
  onPublish,
}: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isInReview = status === "IN_REVIEW";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
          {status}
        </span>
        <span className="text-xs text-muted-foreground">
          {isInReview
            ? "规则正在评审中，当前不可修改"
            : "这是草稿状态，你可以随时编辑"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="h-9 rounded-md border px-3 text-sm"
          onClick={onSaveDraft}
          disabled={isInReview}
        >
          保存草稿
        </button>
        <button
          type="button"
          className={`h-9 rounded-md px-3 text-sm text-white ${
            isInReview
              ? "cursor-not-allowed bg-slate-300"
              : "bg-black"
          }`}
          onClick={() => {
            if (isInReview) return;
            setConfirmOpen(true);
          }}
          disabled={isInReview}
        >
          提交评审
        </button>
        <button
          type="button"
          className="h-9 rounded-md border px-3 text-sm"
          onClick={onPublish}
          disabled={isInReview}
        >
          发布 Topic
        </button>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[420px] rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold">提交评审</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              提交评审后，规则将进入评审流程，你将无法直接修改规则。
            </p>
            <div className="mt-4 rounded-md border bg-muted/30 p-3 text-sm">
              <div>当前状态：{status}</div>
              <div className="mt-1">提交后状态：IN_REVIEW</div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                className="rounded-md border px-3 py-1 text-sm"
                onClick={() => setConfirmOpen(false)}
              >
                取消
              </button>
              <button
                className="rounded-md bg-black px-4 py-1.5 text-sm text-white"
                onClick={() => {
                  setConfirmOpen(false);
                  onSubmitReview?.();
                }}
              >
                确认提交
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
