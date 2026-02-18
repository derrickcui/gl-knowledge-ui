import type { UiCapabilityViewModel, UiRuleViewModel } from "../types";
import type { ValidationError } from "./types";
import { validateStructure } from "./validateStructure";

export function validateRule(
  rule: UiRuleViewModel,
  capability: UiCapabilityViewModel
): ValidationError[] {
  if (!rule.root) {
    return [
      {
        nodeId: "root",
        severity: "ERROR",
        message: "规则必须包含根节点",
      },
    ];
  }
  return validateStructure(rule.root, capability);
}

