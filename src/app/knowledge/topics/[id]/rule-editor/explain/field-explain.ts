import { t } from "@/i18n";
import type { UiExpressionNode, UiFieldNode } from "../types";
import type { ExplainNode } from "./types";

export function buildFieldExplain(
  node: UiFieldNode,
  buildChild: (child: UiExpressionNode) => ExplainNode | null
): ExplainNode | null {
  if (!node.child) return null;
  const child = buildChild(node.child);
  if (!child) return null;
  return {
    type: "FIELD",
    text:
      node.field === "TITLE"
        ? t("ruleEditor.explain.fieldTitle")
        : node.field === "COLUMN"
        ? t("ruleEditor.explain.fieldColumn")
        : t("ruleEditor.explain.fieldContent"),
    source: node,
    children: [child],
  };
}
