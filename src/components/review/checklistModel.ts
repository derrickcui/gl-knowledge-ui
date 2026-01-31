import { ExplainDiffItem } from "./explainDiffTypes";
import { AntiPatternReport } from "./antiPatternTypes";
import { ChecklistSummary } from "./checklistTypes";
import { RuleNode } from "../rule-builder/astTypes";

export function buildChecklistSummary(
  explainDiff: ExplainDiffItem[] | undefined,
  anti: AntiPatternReport,
  rule?: RuleNode
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
  const importance = buildImportanceSummary(rule);

  return {
    explain,
    antiPattern: antiCount,
    decision: {
      canApprove,
      reason: canApprove
        ? undefined
        : "存在严重规则反模式，必须修改后才能发布",
    },
    importance,
  };
}

type ImportanceLevel = "HIGH" | "NORMAL" | "LOW";

function normalizeImportance(raw: unknown): ImportanceLevel {
  if (raw === "HIGH" || raw === "LOW") return raw;
  return "NORMAL";
}

function hasTopicRef(node: RuleNode): boolean {
  if (node.type === "TOPIC_REF") return true;
  return (node.children ?? []).some((child) => hasTopicRef(child));
}

function isImportanceScenario(node: RuleNode): boolean {
  const operator = node.params?.operator ?? "AND";
  if (operator !== "LOGSUM") return false;
  if (node.params?.importanceMode !== "IMPORTANCE") return false;
  if ((node.children?.length ?? 0) < 2) return false;
  if (hasTopicRef(node)) return false;
  return true;
}

function buildImportanceSummary(rule?: RuleNode) {
  if (!rule) return undefined;
  const scenarios: RuleNode[] = [];
  if (
    rule.type === "GROUP" &&
    (rule.params?.role === "RULE" || rule.params?.role === "SCENARIO")
  ) {
    if (rule.params?.role === "SCENARIO") scenarios.push(rule);
    else scenarios.push(...(rule.children ?? []));
  }
  if (!scenarios.length && rule.type === "GROUP") {
    scenarios.push(...(rule.children ?? []));
  }

  const summary = scenarios
    .map((scenario, index) => {
      if (!isImportanceScenario(scenario)) return null;
      const counts = { high: 0, normal: 0, low: 0 };
      (scenario.children ?? []).forEach((child) => {
        const level = normalizeImportance(child.params?.importance);
        if (level === "HIGH") counts.high += 1;
        else if (level === "LOW") counts.low += 1;
        else counts.normal += 1;
      });
      return {
        title:
          scenario.params?.title ?? `判断场景 ${index + 1}`,
        counts,
      };
    })
    .filter(Boolean);

  return { scenarios: summary as NonNullable<(typeof summary)[number]>[] };
}
