import { t } from "@/i18n";
import type { UiExpressionNode, UiStructureNode } from "../types";
import type { ExplainNode } from "./types";

export function buildStructureExplain(
  node: UiStructureNode,
  buildChild: (child: UiExpressionNode) => ExplainNode | null
): ExplainNode | null {
  if (!node.child) return null;
  const child = buildChild(node.child);
  if (!child) return null;
  return {
    type: "STRUCTURE",
    text:
      node.scope === "SENTENCE"
        ? t("ruleEditor.explain.structureSentence")
        : node.scope === "PARAGRAPH"
        ? t("ruleEditor.explain.structureParagraph")
        : t("ruleEditor.explain.structureDocument"),
    source: node,
    children: [child],
  };
}
