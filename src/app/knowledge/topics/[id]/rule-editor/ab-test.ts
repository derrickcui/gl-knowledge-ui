import type { RuntimeExecuteFullResponse } from "@/lib/api/ruleRuntime";
import { t } from "@/i18n";

export type RuleAbTestResult = {
  generatedAt: string;
  ruleA: {
    label: string;
    total: number;
    took: number;
  };
  ruleB: {
    label: string;
    total: number;
    took: number;
  };
  deltaHit: number;
  deltaHitRate: number;
  overlapRate: number;
  winner: "A" | "B" | "TIE";
};

export function buildRuleAbTestResult(
  fullA: RuntimeExecuteFullResponse,
  fullB: RuntimeExecuteFullResponse
): RuleAbTestResult {
  const deltaHit = fullB.total - fullA.total;
  const deltaHitRate = fullA.total > 0 ? deltaHit / fullA.total : 0;
  const overlapRate = computeOverlapRate(fullA, fullB);

  let winner: RuleAbTestResult["winner"] = "TIE";
  if (fullB.total > fullA.total) winner = "B";
  if (fullB.total < fullA.total) winner = "A";

  return {
    generatedAt: new Date().toLocaleString(),
    ruleA: {
      label: t("topicDetail.ab.labelA"),
      total: fullA.total,
      took: fullA.took,
    },
    ruleB: {
      label: t("topicDetail.ab.labelB"),
      total: fullB.total,
      took: fullB.took,
    },
    deltaHit,
    deltaHitRate,
    overlapRate,
    winner,
  };
}

function computeOverlapRate(fullA: RuntimeExecuteFullResponse, fullB: RuntimeExecuteFullResponse): number {
  const a = new Set(fullA.items.map((item) => item.id));
  const b = new Set(fullB.items.map((item) => item.id));
  if (a.size === 0 && b.size === 0) return 1;
  const intersection = [...a].filter((id) => b.has(id)).length;
  const union = new Set([...a, ...b]).size;
  return union > 0 ? intersection / union : 0;
}

