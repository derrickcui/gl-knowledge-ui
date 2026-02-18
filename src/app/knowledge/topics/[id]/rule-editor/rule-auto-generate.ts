import type { RuntimeExecuteFullResponse } from "@/lib/api/ruleRuntime";
import type { RuntimeExecuteImpactResponse } from "@/lib/api/ruleRuntime";

export type GeneratedRuleCandidateAction =
  | { type: "APPLY_PROXIMITY_HINT" }
  | { type: "REMOVE_LOW_IMPACT"; nodeId: string }
  | { type: "NONE" };

export type GeneratedRuleCandidate = {
  id: string;
  title: string;
  rulePreview: string;
  estimatedCoverage: number;
  estimatedPrecision: number;
  reason: string;
  action: GeneratedRuleCandidateAction;
};

export function generateRuleCandidatesFromRuntime(
  fullRuntimeResult: RuntimeExecuteFullResponse | null,
  impactRuntimeResult: RuntimeExecuteImpactResponse | null
): GeneratedRuleCandidate[] {
  if (!fullRuntimeResult || fullRuntimeResult.items.length === 0) return [];
  const totalDocs = fullRuntimeResult.items.length;

  const keywordFreq = new Map<string, number>();
  const pairFreq = new Map<string, number>();

  fullRuntimeResult.items.forEach((item) => {
    const keywords = item.matchedReasons
      .map((reason) => reason.matchedTerms?.[0] ?? reason.displayText ?? reason.label)
      .map((text) => normalizeKeyword(text))
      .filter((text): text is string => Boolean(text));

    const uniq = Array.from(new Set(keywords));
    uniq.forEach((key) => keywordFreq.set(key, (keywordFreq.get(key) ?? 0) + 1));
    for (let i = 0; i < uniq.length; i += 1) {
      for (let j = i + 1; j < uniq.length; j += 1) {
        const key = uniq[i] < uniq[j] ? `${uniq[i]}||${uniq[j]}` : `${uniq[j]}||${uniq[i]}`;
        pairFreq.set(key, (pairFreq.get(key) ?? 0) + 1);
      }
    }
  });

  const candidates: GeneratedRuleCandidate[] = [];
  const topPair = topEntry(pairFreq);
  if (topPair && topPair.count >= 2) {
    const [a, b] = topPair.key.split("||");
    const coverage = safeRate(topPair.count, totalDocs);
    candidates.push({
      id: "cooccur-near",
      title: `共现候选：${a} + ${b}`,
      rulePreview: `<in/content>(<near/5>(${a}, ${b}))`,
      estimatedCoverage: coverage,
      estimatedPrecision: Math.min(0.95, 0.55 + coverage * 0.4),
      reason: `在命中文档中共现 ${topPair.count} 次`,
      action: { type: "APPLY_PROXIMITY_HINT" },
    });
  }

  const topKeyword = topEntry(keywordFreq);
  if (topKeyword) {
    const coverage = safeRate(topKeyword.count, totalDocs);
    candidates.push({
      id: "single-core",
      title: `核心词候选：${topKeyword.key}`,
      rulePreview: `<in/content>(${topKeyword.key})`,
      estimatedCoverage: coverage,
      estimatedPrecision: Math.min(0.9, 0.45 + coverage * 0.35),
      reason: `在命中文档中出现 ${topKeyword.count} 次`,
      action: { type: "NONE" },
    });
  }

  const lowImpact = impactRuntimeResult?.analysis.find(
    (item) => item.impactLevel === "NONE" || item.contribution <= 0
  );
  if (lowImpact) {
    candidates.push({
      id: `prune-${lowImpact.nodeId}`,
      title: "低贡献裁剪候选",
      rulePreview: `删除低贡献节点：${lowImpact.label}`,
      estimatedCoverage: 1,
      estimatedPrecision: 0.6,
      reason: "该节点贡献接近 0，可能冗余",
      action: { type: "REMOVE_LOW_IMPACT", nodeId: lowImpact.nodeId },
    });
  }

  return candidates.slice(0, 5);
}

function normalizeKeyword(input: string | undefined): string | null {
  if (!input) return null;
  const text = input.trim().replace(/\s+/g, " ");
  if (!text) return null;
  return text.length > 40 ? text.slice(0, 40) : text;
}

function topEntry(map: Map<string, number>): { key: string; count: number } | null {
  let bestKey: string | null = null;
  let best = -1;
  map.forEach((value, key) => {
    if (value > best) {
      best = value;
      bestKey = key;
    }
  });
  if (!bestKey) return null;
  return { key: bestKey, count: best };
}

function safeRate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return numerator / denominator;
}
