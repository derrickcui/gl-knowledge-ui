import { t } from "@/i18n";
import type { UiExpressionNode, UiLogicNode } from "../types";
import type { ExplainNode } from "./types";

export function buildLogicExplain(
  node: UiLogicNode,
  buildChild: (child: UiExpressionNode) => ExplainNode | null
): ExplainNode | null {
  const children = node.children
    .map((child) => buildChild(child))
    .filter((item): item is ExplainNode => Boolean(item));
  if (children.length === 0) return null;
  return {
    type: "LOGIC",
    text: logicText(node.operator, node.threshold),
    source: node,
    children,
  };
}

function logicText(operator: string, threshold?: number): string {
  if (operator === "OR" || operator === "ANY") return t("ruleEditor.explain.logicAny");
  if (operator === "AT_LEAST") {
    return t("ruleEditor.explain.logicAtLeast", {
      count: Math.max(1, Math.round(Number(threshold ?? 2))),
    });
  }
  if (operator === "ACCRUE") return t("ruleEditor.explain.logicAccrue");
  if (operator === "LOGSUM" || operator === "WEIGHTED") return t("ruleEditor.explain.logicWeighted");
  return t("ruleEditor.explain.logicAll");
}
