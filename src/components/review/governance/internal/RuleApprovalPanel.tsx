import type { ReviewDecision } from "../types";

type RuleApprovalPanelProps = {
  decision: ReviewDecision;
  comment: string;
  onDecisionChange: (decision: ReviewDecision) => void;
  onCommentChange: (comment: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  canSubmit: boolean;
  expectedHashReady: boolean;
  expectedHashHint?: string | null;
  readOnly: boolean;
  readOnlyMessage?: string;
};

export function RuleApprovalPanel({
  decision,
  comment,
  onDecisionChange,
  onCommentChange,
  onSubmit,
  submitting,
  canSubmit,
  expectedHashReady,
  expectedHashHint,
  readOnly,
  readOnlyMessage,
}: RuleApprovalPanelProps) {
  const rejectSelected = decision === "REJECT";
  const commentPlaceholder = rejectSelected ? "请填写退回原因（必填）" : "审批意见（可选）";

  const lockMessage = readOnlyMessage || "当前状态不可审批，页面为只读模式。";

  return (
    <section className="rounded-xl border bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">审批决策</h3>

      {readOnly && (
        <div className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {lockMessage}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-6 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="review-decision"
            checked={decision === "APPROVE"}
            onChange={() => onDecisionChange("APPROVE")}
            disabled={readOnly}
          />
          通过
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="review-decision"
            checked={decision === "REJECT"}
            onChange={() => onDecisionChange("REJECT")}
            disabled={readOnly}
          />
          退回修改
        </label>
      </div>

      <div className="mt-4">
        <textarea
          className="min-h-[96px] w-full rounded border px-3 py-2 text-sm"
          placeholder={commentPlaceholder}
          value={comment}
          onChange={(event) => onCommentChange(event.target.value)}
          disabled={readOnly}
        />
        {!expectedHashReady && (
          <div className="mt-2 text-xs text-amber-600">
            {expectedHashHint ?? "缺少评审哈希，无法提交评审结果。"}
          </div>
        )}
      </div>

      <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        状态流转：DRAFT {"->"} IN_REVIEW {"->"} PUBLISHED；若退回则 IN_REVIEW {"->"} DRAFT
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          className="h-9 rounded bg-slate-900 px-4 text-sm text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={readOnly || !canSubmit || submitting}
          onClick={onSubmit}
        >
          {submitting ? "提交中..." : "确认评审"}
        </button>
      </div>
    </section>
  );
}
