"use client";

import { AntiPatternReport } from "./antiPatternTypes";

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
        规则质量评估
      </div>
      <div className="text-sm">
        风险评分：<b>{report.score}</b> / 100
      </div>
      <div className="mt-1 text-xs text-slate-600">
        {errors > 0 &&
          `存在 ${errors} 个严重问题，必须修改后才能发布。`}
        {errors === 0 &&
          warnings > 0 &&
          `存在 ${warnings} 个潜在问题，建议优化。`}
        {errors === 0 &&
          warnings === 0 &&
          "未发现明显问题。"}
      </div>
    </div>
  );
}
