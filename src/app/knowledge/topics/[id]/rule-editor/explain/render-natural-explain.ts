import { t } from "@/i18n";
import type { UiLogicNode } from "../types";
import type { ExplainNode } from "./types";

export function renderBusinessExplainText(tree: ExplainNode, topicName: string): string {
  const logic = findFirstNode(tree, "LOGIC");
  if (!logic || logic.source.type !== "LOGIC") {
    return t("ruleEditor.explain.empty");
  }
  const contextPrefix = buildContextPrefix(tree);
  const logicText = buildLogicText(logic);
  if (!logicText) return t("ruleEditor.explain.empty");
  return `${contextPrefix}${logicText}${t("ruleEditor.explain.businessTail", {
    topic: topicName || t("common.topic"),
  })}`;
}

function buildContextPrefix(tree: ExplainNode): string {
  const field = findFirstNode(tree, "FIELD");
  const structure = findFirstNode(tree, "STRUCTURE");
  const structureText =
    structure?.source.type === "STRUCTURE" && structure.source.scope === "DOCUMENT"
      ? ""
      : structure?.text ?? "";
  return `${field?.text ?? ""}${structureText}`;
}

function buildLogicText(node: ExplainNode): string {
  if (node.source.type !== "LOGIC") return "";
  const childTexts = node.children.map((child) => buildRuleNodeText(child)).filter(Boolean);
  if (childTexts.length === 0) return "";
  return logicWithChildren(node.source, childTexts);
}

function logicWithChildren(node: UiLogicNode, parts: string[]): string {
  const threshold = Math.max(1, Math.round(Number(node.threshold ?? 2)));
  if (node.operator === "OR" || node.operator === "ANY") {
    return t("ruleEditor.explain.businessLogicAny", { parts: joinWithOr(parts) });
  }
  if (node.operator === "AT_LEAST") {
    return t("ruleEditor.explain.businessLogicAtLeast", {
      threshold,
      parts: joinWithComma(parts),
    });
  }
  if (node.operator === "LOGSUM" || node.operator === "WEIGHTED") {
    return t("ruleEditor.explain.businessLogicWeighted", {
      parts: joinWithComma(parts),
    });
  }
  if (node.operator === "ACCRUE") {
    return t("ruleEditor.explain.businessLogicAccrue", {
      parts: joinWithComma(parts),
    });
  }
  return t("ruleEditor.explain.businessLogicAll", { parts: joinWithAnd(parts) });
}

function buildRuleNodeText(node: ExplainNode): string {
  if (node.type === "TERM") return node.text;
  if (node.type === "POSITION") return buildPositionText(node);
  if (node.type === "LOGIC") return buildLogicText(node);
  if (node.type === "FIELD" || node.type === "STRUCTURE") {
    const child = node.children[0];
    return child ? buildRuleNodeText(child) : "";
  }
  return node.text;
}

function buildPositionText(node: ExplainNode): string {
  const terms = node.children
    .map((child) => buildRuleNodeText(child))
    .filter(Boolean)
    .map((text) => text.replace(t("ruleEditor.explain.termContainsPrefix"), "").trim());
  if (terms.length === 0) return "";
  return `${node.text}${t("ruleEditor.explain.termContainsPrefix")}${joinWithAnd(terms)}`;
}

function joinWithAnd(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  if (parts.length === 2) return `${parts[0]}${t("ruleEditor.explain.termJoinAnd")}${parts[1]}`;
  return `${parts.slice(0, -1).join(t("ruleEditor.explain.termJoinComma"))}${t(
    "ruleEditor.explain.termJoinAnd"
  )}${parts[parts.length - 1]}`;
}

function joinWithOr(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return parts.join(t("ruleEditor.explain.businessJoinOr"));
}

function joinWithComma(parts: string[]): string {
  return parts.join(t("ruleEditor.explain.termJoinComma"));
}

function findFirstNode(node: ExplainNode, type: ExplainNode["type"]): ExplainNode | null {
  if (node.type === type) return node;
  for (const child of node.children) {
    const found = findFirstNode(child, type);
    if (found) return found;
  }
  return null;
}
