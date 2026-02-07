"use client";

import { AntiPatternReport } from "./antiPatternTypes";
import AntiPatternItem from "./AntiPatternItem";
import AntiPatternSummary from "./AntiPatternSummary";
import { t } from "@/i18n";

interface Props {
  report: AntiPatternReport;
  onHoverPath?: (path: number[] | null) => void;
  onClickPath?: (path: number[]) => void;
}

export default function AntiPatternPanel({
  report,
  onHoverPath,
  onClickPath,
}: Props) {
  if (!report.findings.length) {
    return (
      <div className="text-xs italic text-slate-400">
        {t("review.anti.noneFound")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AntiPatternSummary report={report} />
      <div className="space-y-2">
        {report.findings.map((finding, idx) => (
          <AntiPatternItem
            key={`${finding.code}-${idx}`}
            finding={finding}
            onHoverPath={onHoverPath}
            onClickPath={onClickPath}
          />
        ))}
      </div>
    </div>
  );
}
