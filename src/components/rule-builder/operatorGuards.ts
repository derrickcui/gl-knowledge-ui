import { BusinessOperatorId } from "../rule-palette/paletteDefinition";
import { RuleNode } from "./astTypes";
import { t } from "@/i18n";

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
          reason: t("operatorGuard.selectCondition"),
        };
      }
      if (isDuplicateWrap(operator, node)) {
        return {
          enabled: false,
          reason: t("operatorGuard.duplicateConstraint"),
        };
      }
      return { enabled: true };

    case "how.all":
    case "how.any":
    case "how.exclude":
      if (!isScenarioGroup) {
        return {
          enabled: false,
          reason: t("operatorGuard.selectScenario"),
        };
      }
      if (
        node.type === "GROUP" &&
        (node.params?.operator === "ALL" || node.params?.operator === "AND")
      ) {
        return {
          enabled: false,
          reason: t("operatorGuard.alreadyAll"),
        };
      }
      if (
        node.type === "GROUP" &&
        (node.params?.operator === "ANY" || node.params?.operator === "OR")
      ) {
        return {
          enabled: false,
          reason: t("operatorGuard.alreadyAny"),
        };
      }
      if (node.type === "GROUP" && node.params?.operator === "EXCLUDE") {
        return {
          enabled: false,
          reason: t("operatorGuard.alreadyExclude"),
        };
      }
      return { enabled: true };

    case "where.body":
      return { enabled: false, reason: t("operatorGuard.bodyDefault") };

    case "what.concept":
    case "what.topicRef":
    default:
      return { enabled: true };
  }
}
