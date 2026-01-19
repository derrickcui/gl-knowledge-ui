"use client";

import Link from "next/link";

export default function FromReviewBanner({
  reviewId,
  reason,
}: {
  reviewId: string;
  reason?: string | null;
}) {
  return (
    <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm">
      你正在修复评审中发现的问题（评审 #{reviewId}）。
      <span className="ml-2">
        <Link className="underline" href={`/knowledge/reviews/${reviewId}`}>
          返回评审
        </Link>
      </span>
      {reason && (
        <div className="mt-2 text-xs text-amber-900">
          评审原因：{reason}
        </div>
      )}
    </div>
  );
}
