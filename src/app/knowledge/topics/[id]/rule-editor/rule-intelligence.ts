import type {
  RuntimeExecuteFullResponse,
  RuntimeExecuteImpactResponse,
} from "@/lib/api/ruleRuntime";
import type { ConditionImpactItem } from "@/lib/rule-preview-api";
import type { UiExpressionNode } from "./types";

export type HeatLevel = "HIGH" | "MEDIUM" | "LOW" | "NONE";

export type ComplexityMetrics = {
  score: number;
  level: "SIMPLE" | "MEDIUM" | "COMPLEX" | "RISKY";
  nodeCount: number;
  depth: number;
  proximityCount: number;
  logsumCount: number;
};

export type PerformanceMetrics = {
  tookMs: number | null;
  clauseCount: number;
  nestedDepth: number;
  riskScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
};

export type RiskAssessment = {
  score: number;
  level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  reasons: string[];
};

export type HitDistribution = {
  byField: Array<{ key: string; count: number }>;
  byKeyword: Array<{ key: string; count: number }>;
};

export type OptimizationSuggestion = {
  type: "USE_PROXIMITY" | "LOGSUM_TO_AND" | "FLATTEN_LOGIC" | "REMOVE_LOW_IMPACT" | "BACKEND";
  nodeId: string;
  message: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  payload?: Record<string, unknown>;
};

export type TemplateRecommendation = {
  key: string;
  name: string;
  reason: string;
  score: number;
};

export function buildHeatLevelByNodeId(
  impactRuntimeResult: RuntimeExecuteImpactResponse | null,
  impactRanking: ConditionImpactItem[],
  fullTotal: number
): Record<string, HeatLevel> {
  const map: Record<string, HeatLevel> = {};
  if (impactRuntimeResult) {
    impactRuntimeResult.analysis.forEach((item) => {
      map[item.nodeId] = item.impactLevel;
    });
    return map;
  }
  impactRanking.forEach((item) => {
    const rate = fullTotal > 0 ? item.contribution / fullTotal : item.contributionRate;
    if (rate >= 0.6) map[item.nodeId] = "HIGH";
    else if (rate >= 0.3) map[item.nodeId] = "MEDIUM";
    else if (rate >= 0.1) map[item.nodeId] = "LOW";
    else map[item.nodeId] = "NONE";
  });
  return map;
}

export function computeComplexityMetrics(root: UiExpressionNode | null): ComplexityMetrics {
  if (!root) {
    return {
      score: 0,
      level: "SIMPLE",
      nodeCount: 0,
      depth: 0,
      proximityCount: 0,
      logsumCount: 0,
    };
  }

  let nodeCount = 0;
  let depth = 0;
  let proximityCount = 0;
  let logsumCount = 0;

  const walk = (node: UiExpressionNode, d: number) => {
    nodeCount += 1;
    depth = Math.max(depth, d);
    if (node.type === "POSITION_RELATION" || node.type === "PROXIMITY") proximityCount += 1;
    if (node.type === "LOGIC" && (node.operator === "LOGSUM" || node.operator === "AT_LEAST")) logsumCount += 1;

    if ("children" in node && Array.isArray(node.children)) {
      node.children.forEach((child) => walk(child, d + 1));
    }
    if ("child" in node && node.child) {
      walk(node.child, d + 1);
    }
  };
  walk(root, 1);

  const score = nodeCount * 1 + depth * 2 + proximityCount * 3 + logsumCount * 2;
  const level: ComplexityMetrics["level"] =
    score > 100 ? "RISKY" : score > 50 ? "COMPLEX" : score > 20 ? "MEDIUM" : "SIMPLE";
  return { score, level, nodeCount, depth, proximityCount, logsumCount };
}

export function computeHitDistribution(fullRuntimeResult: RuntimeExecuteFullResponse | null): HitDistribution {
  if (!fullRuntimeResult) return { byField: [], byKeyword: [] };
  const fieldMap = new Map<string, number>();
  const keywordMap = new Map<string, number>();

  fullRuntimeResult.items.forEach((item) => {
    item.matchedReasons.forEach((reason) => {
      fieldMap.set(reason.field, (fieldMap.get(reason.field) ?? 0) + 1);
      const keyword = reason.matchedTerms?.[0] ?? reason.displayText ?? reason.label;
      keywordMap.set(keyword, (keywordMap.get(keyword) ?? 0) + 1);
    });
  });

  const toSorted = (map: Map<string, number>) =>
    Array.from(map.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

  return { byField: toSorted(fieldMap), byKeyword: toSorted(keywordMap) };
}

export function computePerformanceMetrics(
  root: UiExpressionNode | null,
  fullRuntimeResult: RuntimeExecuteFullResponse | null,
  impactRuntimeResult: RuntimeExecuteImpactResponse | null
): PerformanceMetrics {
  const complexity = computeComplexityMetrics(root);
  const clauseCount = countClauses(root);
  const tookMs = fullRuntimeResult?.took ?? impactRuntimeResult?.took ?? null;
  const riskScore = complexity.depth * 2 + complexity.proximityCount * 3 + clauseCount;
  const riskLevel: PerformanceMetrics["riskLevel"] =
    riskScore >= 80 ? "HIGH" : riskScore >= 40 ? "MEDIUM" : "LOW";
  return {
    tookMs,
    clauseCount,
    nestedDepth: complexity.depth,
    riskScore,
    riskLevel,
  };
}

export function assessRuleRisk(
  root: UiExpressionNode | null,
  fullTotal: number,
  impactRuntimeResult: RuntimeExecuteImpactResponse | null,
  impactRanking: ConditionImpactItem[]
): RiskAssessment {
  const complexity = computeComplexityMetrics(root);
  const reasons: string[] = [];
  let score = 0;

  if (fullTotal === 0) {
    score += 30;
    reasons.push("命中结果为 0，规则可能过窄");
  } else if (fullTotal > 1000) {
    score += 20;
    reasons.push("命中量较大，规则可能过宽");
  }

  if (complexity.depth > 6) {
    score += 25;
    reasons.push("嵌套深度超过 6，结构复杂度高");
  } else if (complexity.depth > 4) {
    score += 10;
    reasons.push("嵌套深度偏高");
  }

  const volatility = computeImpactVolatility(impactRuntimeResult, impactRanking);
  if (volatility >= 0.25) {
    score += 20;
    reasons.push("节点贡献波动较大，规则稳定性风险较高");
  } else if (volatility >= 0.15) {
    score += 10;
    reasons.push("节点贡献存在波动，建议持续观察");
  }

  if (complexity.score > 100) {
    score += 20;
    reasons.push("综合复杂度偏高");
  } else if (complexity.score > 50) {
    score += 10;
    reasons.push("综合复杂度中高");
  }

  const level: RiskAssessment["level"] =
    score >= 70 ? "CRITICAL" : score >= 45 ? "HIGH" : score >= 20 ? "MEDIUM" : "LOW";
  return { score, level, reasons };
}

export function buildOptimizationSuggestions(
  root: UiExpressionNode | null,
  impactRuntimeResult: RuntimeExecuteImpactResponse | null,
  impactRanking: ConditionImpactItem[]
): OptimizationSuggestion[] {
  if (!root) return [];
  const list: OptimizationSuggestion[] = [];

  const walk = (node: UiExpressionNode) => {
    if (node.type === "LOGIC") {
      const termChildren = node.children.filter((child) => child.type === "TERM_SET");
      const hasProximity = node.children.some(
        (child) => child.type === "POSITION_RELATION" || child.type === "PROXIMITY"
      );
      if ((node.operator === "AND" || node.operator === "ALL") && termChildren.length >= 2 && !hasProximity) {
        list.push({
          type: "USE_PROXIMITY",
          nodeId: node.id,
          message: "可考虑使用近邻匹配提升准确率",
          priority: "MEDIUM",
          payload: { childIds: termChildren.slice(0, 2).map((item) => item.id) },
        });
      }
      if ((node.operator === "LOGSUM" || node.operator === "AT_LEAST") && node.threshold === node.children.length) {
        list.push({
          type: "LOGSUM_TO_AND",
          nodeId: node.id,
          message: "threshold 等于子条件数，可改为 AND 简化规则",
          priority: "LOW",
        });
      }
      const nestedSameLogic = node.children.some(
        (child) => child.type === "LOGIC" && child.operator === node.operator
      );
      if (nestedSameLogic) {
        list.push({
          type: "FLATTEN_LOGIC",
          nodeId: node.id,
          message: "检测到可扁平化逻辑层级，建议自动整理",
          priority: "LOW",
        });
      }
    }
    if ("children" in node && Array.isArray(node.children)) {
      node.children.forEach((child) => walk(child));
    }
    if ("child" in node && node.child) walk(node.child);
  };
  walk(root);

  const lowImpactCandidates = impactRuntimeResult
    ? impactRuntimeResult.analysis.filter((item) => item.impactLevel === "NONE" || item.contribution <= 0)
    : impactRanking.filter((item) => item.contributionRate < 0.01 || item.contribution <= 0);

  lowImpactCandidates.slice(0, 2).forEach((item) => {
    list.push({
      type: "REMOVE_LOW_IMPACT",
      nodeId: item.nodeId,
      message: "该节点贡献接近 0，可考虑移除",
      priority: "HIGH",
    });
  });

  return list.slice(0, 8);
}

export function recommendTemplates(root: UiExpressionNode | null): TemplateRecommendation[] {
  if (!root) return [];
  const features = collectFeatures(root);
  const library: Array<{
    key: string;
    name: string;
    requires: Array<(f: ReturnType<typeof collectFeatures>) => boolean>;
    reason: string;
  }> = [
    {
      key: "talent",
      name: "人才政策筛选模板",
      requires: [(f) => f.hasLogsum, (f) => f.termCount >= 3],
      reason: "包含阈值判断和多术语筛选",
    },
    {
      key: "qualification",
      name: "资格条件过滤模板",
      requires: [(f) => f.hasField, (f) => f.depth >= 3],
      reason: "包含范围限定与多层组合",
    },
    {
      key: "precision",
      name: "高精度近邻模板",
      requires: [(f) => f.hasProximity, (f) => f.termCount >= 2],
      reason: "适合关键短语近邻判定",
    },
  ];

  return library
    .map((item) => {
      const matched = item.requires.filter((fn) => fn(features)).length;
      const score = matched / item.requires.length;
      return { key: item.key, name: item.name, reason: item.reason, score };
    })
    .filter((item) => item.score > 0.4)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function collectFeatures(root: UiExpressionNode) {
  let hasProximity = false;
  let hasLogsum = false;
  let hasField = false;
  let termCount = 0;
  let depth = 0;
  const walk = (node: UiExpressionNode, d: number) => {
    depth = Math.max(depth, d);
    if (node.type === "POSITION_RELATION" || node.type === "PROXIMITY") hasProximity = true;
    if (node.type === "LOGIC" && (node.operator === "LOGSUM" || node.operator === "AT_LEAST")) hasLogsum = true;
    if (node.type === "FIELD") hasField = true;
    if (node.type === "TERM_SET") termCount += 1;
    if ("children" in node && Array.isArray(node.children)) node.children.forEach((child) => walk(child, d + 1));
    if ("child" in node && node.child) walk(node.child, d + 1);
  };
  walk(root, 1);
  return { hasProximity, hasLogsum, hasField, termCount, depth };
}

function countClauses(root: UiExpressionNode | null): number {
  if (!root) return 0;
  let clauses = 0;
  const walk = (node: UiExpressionNode) => {
    if (node.type === "TERM_SET" || node.type === "TOPIC_REF") clauses += 1;
    if (node.type === "LOGIC" || node.type === "POSITION_RELATION" || node.type === "PROXIMITY") {
      clauses += 1;
    }
    if ("children" in node && Array.isArray(node.children)) {
      node.children.forEach((child) => walk(child));
    }
    if ("child" in node && node.child) walk(node.child);
  };
  walk(root);
  return clauses;
}

function computeImpactVolatility(
  impactRuntimeResult: RuntimeExecuteImpactResponse | null,
  impactRanking: ConditionImpactItem[]
): number {
  const values = impactRuntimeResult
    ? impactRuntimeResult.analysis.map((item) => Math.max(0, item.contribution))
    : impactRanking.map((item) => Math.max(0, item.contributionRate));
  if (values.length <= 1) return 0;
  const sum = values.reduce((acc, value) => acc + value, 0);
  if (sum <= 0) return 0;
  const normalized = values.map((value) => value / sum);
  const mean = normalized.reduce((acc, value) => acc + value, 0) / normalized.length;
  const variance =
    normalized.reduce((acc, value) => acc + (value - mean) * (value - mean), 0) / normalized.length;
  return Math.sqrt(variance);
}
