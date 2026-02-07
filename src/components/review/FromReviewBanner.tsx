"use client";

import Link from "next/link";
import { t } from "@/i18n";

export default function FromReviewBanner({
  reviewId,
  reason,
}: {
  reviewId: string;
  reason?: string | null;
}) {
  return (
    <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm">
      {t("review.fromReview.message", { id: reviewId })}
      <span className="ml-2">
        <Link className="underline" href={`/knowledge/reviews/${reviewId}`}>
          {t("review.fromReview.back")}
        </Link>
      </span>
      {reason && (
        <div className="mt-2 text-xs text-amber-900">
          {t("review.fromReview.reason", { reason })}
        </div>
      )}
    </div>
  );
}
