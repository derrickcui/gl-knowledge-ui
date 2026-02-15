import { t } from "@/i18n";
import type { ExplainNode } from "./types";

export function renderExplainLines(tree: ExplainNode, topicName: string): string[] {
  const logic = findFirstNode(tree, "LOGIC");
  if (!logic) return [];

  const contextPrefix = buildContextPrefix(tree, logic);
  const lines: string[] = [];
  lines.push(`${contextPrefix}${t("ruleEditor.explain.whenSuffix")}`);
  lines.push(
    ...logic.children
      .map((child) => renderLogicChild(child))
      .filter(Boolean)
      .map((line) => line as string)
  );
  lines.push(
    t("ruleEditor.explain.topicTail", {
      topic: topicName || t("common.topic"),
    })
  );
  return lines;
}

function buildContextPrefix(tree: ExplainNode, logic: ExplainNode): string {
  const field = findFirstNode(tree, "FIELD");
  const structure = findFirstNode(tree, "STRUCTURE");
  return `${field?.text ?? ""}${structure?.text ?? ""}${logic.text}`;
}

function renderLogicChild(node: ExplainNode): string | null {
  if (node.type === "TERM") return node.text;
  if (node.type === "POSITION") return renderPosition(node);
  if (node.type === "LOGIC") {
    const children = node.children.map((child) => renderLogicChild(child)).filter(Boolean) as string[];
    if (children.length === 0) return null;
    return `${node.text}${t("ruleEditor.explain.nestedSeparator")}${children.join(t("ruleEditor.explain.nestedJoin"))}`;
  }
  if (node.type === "STRUCTURE" || node.type === "FIELD") {
    const children = node.children.map((child) => renderLogicChild(child)).filter(Boolean) as string[];
    if (children.length === 0) return null;
    return `${node.text}${t("ruleEditor.explain.nestedSeparator")}${children.join(t("ruleEditor.explain.nestedJoin"))}`;
  }
  return node.text || null;
}

function renderPosition(node: ExplainNode): string | null {
  const termTexts = node.children
    .map((child) => renderLogicChild(child))
    .filter(Boolean)
    .map((text) => String(text).replace(t("ruleEditor.explain.termContainsPrefix"), ""))
    .map((text) => text.trim())
    .filter(Boolean);
  if (termTexts.length === 0) return null;
  return `${node.text}${t("ruleEditor.explain.termContainsPrefix")}${joinWithAnd(termTexts)}`;
}

function joinWithAnd(items: string[]): string {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]}${t("ruleEditor.explain.termJoinAnd")}${items[1]}`;
  return `${items.slice(0, -1).join(t("ruleEditor.explain.termJoinComma"))}${t(
    "ruleEditor.explain.termJoinAnd"
  )}${items[items.length - 1]}`;
}

function findFirstNode(node: ExplainNode, type: ExplainNode["type"]): ExplainNode | null {
  if (node.type === type) return node;
  for (const child of node.children) {
    const found = findFirstNode(child, type);
    if (found) return found;
  }
  return null;
}
