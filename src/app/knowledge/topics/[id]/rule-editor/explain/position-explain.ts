import { t } from "@/i18n";
import type {
  UiExpressionNode,
  UiPositionRelationNode,
  UiLegacyProximityNode,
} from "../types";
import type { ExplainNode } from "./types";

export function buildPositionExplain(
  node: UiPositionRelationNode | UiLegacyProximityNode,
  buildChild: (child: UiExpressionNode) => ExplainNode | null
): ExplainNode | null {
  const relation = node.type === "POSITION_RELATION" ? node.relation ?? "NEAR" : normalizeLegacyRelation(node);
  const distance = node.distance ?? 5;
  const ordered = node.ordered ? t("ruleEditor.explain.positionOrderedSuffix") : "";
  const text =
    relation === "SENTENCE"
      ? t("ruleEditor.explain.positionSentence", { ordered })
      : relation === "PARAGRAPH"
      ? t("ruleEditor.explain.positionParagraph", { ordered })
      : t("ruleEditor.explain.positionNear", { distance, ordered });
  const children = node.children
    .map((child) => buildChild(child))
    .filter((item): item is ExplainNode => Boolean(item));
  if (children.length === 0) return null;
  return {
    type: "POSITION",
    text,
    source: node,
    children,
  };
}

function normalizeLegacyRelation(node: UiLegacyProximityNode): "NEAR" | "SENTENCE" | "PARAGRAPH" {
  if (node.relation === "SENTENCE") return "SENTENCE";
  if (node.relation === "PARAGRAPH") return "PARAGRAPH";
  return "NEAR";
}
