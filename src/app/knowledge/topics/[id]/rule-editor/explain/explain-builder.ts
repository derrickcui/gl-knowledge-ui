import { t } from "@/i18n";
import type { ExplainBlock } from "@/components/explain/explainTypes";
import type { ExplainViewModel } from "../ExplainPanel";
import type { UiExpressionNode } from "../types";
import { buildFieldExplain } from "./field-explain";
import { buildLogicExplain } from "./logic-explain";
import { buildPositionExplain } from "./position-explain";
import { renderExplainLines } from "./render-explain";
import { renderBusinessExplainText } from "./render-natural-explain";
import { buildStructureExplain } from "./structure-explain";
import { buildTermExplain } from "./term-explain";
import type { ExplainNode } from "./types";

export function buildExplainViewModel(
  root: UiExpressionNode | null,
  topicName: string,
  fallback?: ExplainViewModel | null
): ExplainViewModel | null {
  const title =
    fallback?.title ||
    t("ruleEditor.explain.autoTitle", {
      topic: topicName || t("common.topic"),
    });
  const tree = root ? buildAnyExplain(root) : null;
  if (!tree) {
    return {
      title,
      blocks: fallback?.blocks ?? [],
    };
  }
  const lines = renderExplainLines(tree, topicName);
  const professionalText = lines.join("\n");
  const businessText = renderBusinessExplainText(tree, topicName);
  const blocks: ExplainBlock[] =
    lines.length > 0
      ? [
          {
            level: "INFO",
            title: t("ruleEditor.explain.blockCurrent"),
            lines,
          },
        ]
      : fallback?.blocks ?? [];
  return {
    title,
    blocks,
    professionalText,
    businessText,
  };
}

export function buildAnyExplain(node: UiExpressionNode): ExplainNode | null {
  const buildChild = (child: UiExpressionNode) => buildAnyExplain(child);
  switch (node.type) {
    case "FIELD":
      return buildFieldExplain(node, buildChild);
    case "STRUCTURE":
      return buildStructureExplain(node, buildChild);
    case "LOGIC":
      return buildLogicExplain(node, buildChild);
    case "POSITION_RELATION":
    case "PROXIMITY":
      return buildPositionExplain(node, buildChild);
    case "TERM_SET":
      return buildTermExplain(node);
    case "TOPIC_REF":
      return {
        type: "TERM",
        text: t("ruleEditor.explain.topicRefLine", { topic: node.topicId || "-" }),
        source: node,
        children: [],
      };
    case "NOT": {
      if (!node.child) return null;
      const child = buildAnyExplain(node.child);
      if (!child) return null;
      return {
        type: "LOGIC",
        text: t("ruleEditor.explain.logicExclude"),
        source: node,
        children: [child],
      };
    }
    case "SCORE": {
      if (!node.child) return null;
      return buildAnyExplain(node.child);
    }
  }
}
