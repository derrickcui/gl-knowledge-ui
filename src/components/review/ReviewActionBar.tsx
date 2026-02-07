"use client";

import Link from "next/link";
import { AntiPatternReport } from "./antiPatternTypes";
import { t } from "@/i18n";

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
            {t("review.actionBar.ready")}
          </span>
        ) : (
          <span className="text-red-700">
            {t("review.actionBar.blocked", { count: errors.length })}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {approving ? (
          <span className="rounded border px-3 py-1 text-sm text-slate-400">
            {t("review.actionBar.fixInEditor")}
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
            {t("review.actionBar.fixInEditor")}
          </Link>
        )}

        <button
          type="button"
          className="rounded border px-3 py-1 text-sm hover:bg-slate-50"
          onClick={onRejectClick}
          disabled={approving}
        >
          {t("review.actionBar.reject")}
        </button>

        <button
          type="button"
          className={`rounded px-3 py-1 text-sm ${
            canApprove && !approving
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "cursor-not-allowed bg-slate-200 text-slate-500"
          }`}
          disabled={!canApprove || approving}
          title={!canApprove ? t("review.actionBar.blockedTooltip") : ""}
          onClick={onApproveClick}
        >
          {approving
            ? t("review.actionBar.approving")
            : t("review.actionBar.approve")}
        </button>
      </div>
    </div>
  );
}
