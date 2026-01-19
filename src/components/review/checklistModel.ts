import { ExplainDiffItem } from "./explainDiffTypes";
import { AntiPatternReport } from "./antiPatternTypes";
import { ChecklistSummary } from "./checklistTypes";

export function buildChecklistSummary(
  explainDiff: ExplainDiffItem[] | undefined,
  anti: AntiPatternReport
): ChecklistSummary {
  const explain = {
    added: 0,
    modified: 0,
    removed: 0,
  };

  explainDiff?.forEach((item) => {
    if (item.kind === "ADD") explain.added += 1;
    if (item.kind === "MODIFY") explain.modified += 1;
    if (item.kind === "REMOVE") explain.removed += 1;
  });

  const antiCount = {
    errors: 0,
    warnings: 0,
    infos: 0,
  };

  anti.findings.forEach((finding) => {
    if (finding.severity === "ERROR") antiCount.errors += 1;
    else if (finding.severity === "WARNING") antiCount.warnings += 1;
    else antiCount.infos += 1;
  });

  const canApprove = antiCount.errors === 0;

  return {
    explain,
    antiPattern: antiCount,
    decision: {
      canApprove,
      reason: canApprove
        ? undefined
        : "存在严重规则反模式，必须修改后才能发布",
    },
  };
}
