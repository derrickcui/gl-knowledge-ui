"use client";

import Link from "next/link";
import { AntiPatternReport } from "./antiPatternTypes";

type Props = {
  topicId: string;
  reviewId: string | number;
  anti: AntiPatternReport;
  onApproveClick: () => void;
  onRejectClick: () => void;
  defaultFixPath?: number[] | null;
  approving?: boolean;
};

export default function ReviewActionBar({
  topicId,
  reviewId,
  anti,
  onApproveClick,
  onRejectClick,
  defaultFixPath,
  approving = false,
}: Props) {
  const errors = anti.findings.filter(
    (finding) => finding.severity === "ERROR"
  );
  const canApprove = errors.length === 0;

  const focusPath = defaultFixPath ?? errors[0]?.path ?? null;
  const focusQuery = focusPath ? focusPath.join(",") : "";
  const reviewIdText = String(reviewId);

  return (
    <div className="flex items-center justify-between rounded border p-3">
      <div className="text-sm">
        {canApprove ? (
          <span className="text-green-700">
            ✅ 无严重问题，可通过评审
          </span>
        ) : (
          <span className="text-red-700">
            ❌ 存在 {errors.length} 个严重问题，禁止通过
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {approving ? (
          <span className="rounded border px-3 py-1 text-sm text-slate-400">
            去编辑器修复
          </span>
        ) : (
          <Link
            className="rounded border px-3 py-1 text-sm hover:bg-slate-50"
            href={
              focusQuery
                ? `/knowledge/topics/${topicId}?focus=${encodeURIComponent(
                    focusQuery
                  )}&fromReview=${encodeURIComponent(reviewIdText)}`
                : `/knowledge/topics/${topicId}?fromReview=${encodeURIComponent(
                    reviewIdText
                  )}`
            }
          >
            去编辑器修复
          </Link>
        )}

        <button
          type="button"
          className="rounded border px-3 py-1 text-sm hover:bg-slate-50"
          onClick={onRejectClick}
          disabled={approving}
        >
          拒绝
        </button>

        <button
          type="button"
          className={`rounded px-3 py-1 text-sm ${
            canApprove && !approving
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "cursor-not-allowed bg-slate-200 text-slate-500"
          }`}
          disabled={!canApprove || approving}
          title={!canApprove ? "存在严重反模式，必须修复后才能通过" : ""}
          onClick={onApproveClick}
        >
          {approving ? "处理中…" : "通过"}
        </button>
      </div>
    </div>
  );
}
