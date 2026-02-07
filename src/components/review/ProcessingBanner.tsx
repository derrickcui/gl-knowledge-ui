"use client";

import { t } from "@/i18n";

export default function ProcessingBanner({
  text,
}: {
  text?: string;
}) {
  return (
    <div className="rounded border border-blue-300 bg-blue-50 p-2 text-sm text-blue-700">
      {text ?? t("review.processing.default")}
    </div>
  );
}
