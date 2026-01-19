import { BusinessOperatorId } from "../rule-palette/paletteDefinition";
import { RuleNode } from "./astTypes";

export function isDuplicateWrap(
  operator: BusinessOperatorId,
  node: RuleNode
): boolean {
  if (operator === "how.exclude") {
    return node.type === "LOGIC" && node.params?.operator === "NOT";
  }
  if (operator === "where.title") {
    return (
      node.type === "FIELD_CONDITION" && node.params?.field === "TITLE"
    );
  }
  if (operator === "where.paragraph") {
    return node.type === "PROXIMITY" && node.params?.mode === "PARAGRAPH";
  }
  if (operator === "where.sentence") {
    return node.type === "PROXIMITY" && node.params?.mode === "SENTENCE";
  }
  return false;
}

export function isOperatorEnabled(
  operator: BusinessOperatorId,
  node: RuleNode
): { enabled: boolean; reason?: string } {
  switch (operator) {
    case "where.title":
    case "where.paragraph":
    case "where.sentence":
    case "how.exclude":
      if (isDuplicateWrap(operator, node)) {
        return { enabled: false, reason: "当前已存在该约束" };
      }
      return { enabled: true };

    case "score.atLeast":
    case "score.weighted":
      if (node.type !== "GROUP" && node.type !== "ACCUMULATE") {
        return {
          enabled: false,
          reason: "评分方式只能用于条件组合",
        };
      }
      return { enabled: true };

    case "how.all":
      if (node.type === "GROUP" && node.params?.operator === "ALL") {
        return { enabled: false, reason: "当前已是该组合方式" };
      }
      return { enabled: true };

    case "how.any":
      if (node.type === "GROUP" && node.params?.operator === "ANY") {
        return { enabled: false, reason: "当前已是该组合方式" };
      }
      return { enabled: true };

    case "where.body":
      return { enabled: false, reason: "默认已匹配正文" };

    case "what.concept":
    case "what.topicRef":
    default:
      return { enabled: true };
  }
}
