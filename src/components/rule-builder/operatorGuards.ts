import { BusinessOperatorId } from "../rule-palette/paletteDefinition";
import { RuleNode } from "./astTypes";

export function isDuplicateWrap(
  operator: BusinessOperatorId,
  node: RuleNode
): boolean {
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
  const isScenarioGroup =
    node.type === "GROUP" && node.params?.role === "SCENARIO";

  switch (operator) {
    case "where.title":
    case "where.paragraph":
    case "where.sentence":
      if (isScenarioGroup) {
        return {
          enabled: false,
          reason: "\u8bf7\u5148\u9009\u4e2d\u4e00\u4e2a\u5177\u4f53\u6761\u4ef6",
        };
      }
      if (isDuplicateWrap(operator, node)) {
        return { enabled: false, reason: "\u6761\u4ef6\u5df2\u7ecf\u5305\u542b\u8fd9\u4e2a\u7ea6\u675f" };
      }
      return { enabled: true };

    case "how.all":
    case "how.any":
    case "how.exclude":
      if (!isScenarioGroup) {
        return {
          enabled: false,
          reason: "\u8bf7\u9009\u4e2d\u4e00\u4e2a\u5224\u65ad\u573a\u666f",
        };
      }
      if (
        node.type === "GROUP" &&
        (node.params?.operator === "ALL" || node.params?.operator === "AND")
      ) {
        return { enabled: false, reason: "\u5f53\u524d\u5df2\u662f\u5168\u90e8\u6ee1\u8db3" };
      }
      if (
        node.type === "GROUP" &&
        (node.params?.operator === "ANY" || node.params?.operator === "OR")
      ) {
        return { enabled: false, reason: "\u5f53\u524d\u5df2\u662f\u4efb\u4e00\u6ee1\u8db3" };
      }
      if (node.type === "GROUP" && node.params?.operator === "EXCLUDE") {
        return { enabled: false, reason: "\u5f53\u524d\u5df2\u662f\u6392\u9664\u8be5\u573a\u666f" };
      }
      return { enabled: true };

    case "where.body":
      return { enabled: false, reason: "\u6b64\u6761\u4ef6\u9ed8\u8ba4\u4f5c\u7528\u4e8e\u6b63\u6587" };

    case "what.concept":
    case "what.topicRef":
    default:
      return { enabled: true };
  }
}
