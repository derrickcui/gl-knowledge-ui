"use client";

import { useState } from "react";

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
            ? "\u89c4\u5219\u5df2\u63d0\u4ea4\u8bc4\u5ba1\uff0c\u5f53\u524d\u4e0d\u53ef\u4fee\u6539\u3002"
            : "\u8349\u7a3f\u53ef\u968f\u65f6\u4fdd\u5b58\uff0c\u63d0\u4ea4\u8bc4\u5ba1\u540e\u5c06\u8fdb\u5165\u51bb\u7ed3\u72b6\u6001\u3002"}
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
            {"\u5220\u9664\u8349\u7a3f"}
          </button>
        )}
        <button
          type="button"
          className="h-9 rounded-md border px-3 text-sm"
          onClick={onSaveDraft}
          disabled={isDisabled}
        >
          {busy
            ? "\u6b63\u5728\u4fdd\u5b58..."
            : "\u4fdd\u5b58\u8349\u7a3f"}
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
            {"\u63d0\u4ea4\u8bc4\u5ba1"}
          </button>
        )}
        <button
          type="button"
          className="h-9 rounded-md border px-3 text-sm"
          onClick={onPublish}
          disabled={isDisabled}
        >
          {"\u53d1\u5e03 Topic"}
        </button>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[420px] rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold">
              {"\u63d0\u4ea4\u8bc4\u5ba1"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {
                "\u63d0\u4ea4\u8bc4\u5ba1\u540e\uff0c\u89c4\u5219\u5c06\u8fdb\u5165\u51bb\u7ed3\u72b6\u6001\uff0c\u5f85\u8bc4\u5ba1\u5b8c\u6210\u624d\u80fd\u7ee7\u7eed\u4fee\u6539\u3002"
              }
            </p>
            <div className="mt-4 rounded-md border bg-muted/30 p-3 text-sm">
              <div>
                {"\u5f53\u524d\u72b6\u6001\uff1a"}
                {status}
              </div>
              <div className="mt-1">
                {"\u63d0\u4ea4\u540e\u72b6\u6001\uff1aIN_REVIEW"}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                className="rounded-md border px-3 py-1 text-sm"
                onClick={() => setConfirmOpen(false)}
              >
                {"\u53d6\u6d88"}
              </button>
              <button
                className="rounded-md bg-black px-4 py-1.5 text-sm text-white"
                onClick={() => {
                  setConfirmOpen(false);
                  onSubmitReview?.();
                }}
              >
                {"\u786e\u8ba4\u63d0\u4ea4"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmOpen && onDeleteDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[420px] rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold">
              {"\u5220\u9664\u8349\u7a3f"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {
                "\u5220\u9664\u540e\u4f1a\u6e05\u7a7a\u5f53\u524d\u7f16\u8f91\u7684\u89c4\u5219\u5185\u5bb9\uff0c\u4e14\u65e0\u6cd5\u6062\u590d\u3002"
              }
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                className="rounded-md border px-3 py-1 text-sm"
                onClick={() => setDeleteConfirmOpen(false)}
              >
                {"\u53d6\u6d88"}
              </button>
              <button
                className="rounded-md bg-black px-4 py-1.5 text-sm text-white"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  onDeleteDraft?.();
                }}
              >
                {"\u786e\u8ba4\u5220\u9664"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
