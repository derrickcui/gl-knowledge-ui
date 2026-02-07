"use client";

import { AntiPatternReport } from "./antiPatternTypes";
import { t } from "@/i18n";

export default function AntiPatternSummary({
  report,
}: {
  report: AntiPatternReport;
}) {
  const errors = report.findings.filter(
    (finding) => finding.severity === "ERROR"
  ).length;
  const warnings = report.findings.filter(
    (finding) => finding.severity === "WARNING"
  ).length;

  const color =
    errors > 0
      ? "border-red-400 bg-red-50"
      : warnings > 0
      ? "border-amber-400 bg-amber-50"
      : "border-blue-400 bg-blue-50";

  return (
    <div className={`rounded border p-3 ${color}`}>
      <div className="mb-1 text-sm font-semibold">
        {t("review.anti.summaryTitle")}
      </div>
      <div className="text-sm">
        {t("review.anti.score", { score: report.score })}
      </div>
      <div className="mt-1 text-xs text-slate-600">
        {errors > 0 &&
          t("review.anti.errors", { count: errors })}
        {errors === 0 &&
          warnings > 0 &&
          t("review.anti.warnings", { count: warnings })}
        {errors === 0 &&
          warnings === 0 &&
          t("review.anti.none")}
      </div>
    </div>
  );
}
