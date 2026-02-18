import type { UiCapabilityViewModel, UiExpressionNode } from "../types";
import { canUseNot, canUseTopicRef } from "../capability-policy";

export type MatrixParentType = UiExpressionNode["type"];
export type MatrixChildType = UiExpressionNode["type"];

export const parentChildMatrix: Record<MatrixParentType, MatrixChildType[]> = {
  LOGIC: ["LOGIC", "FIELD", "POSITION_RELATION", "TERM_SET", "NOT", "SCORE", "TOPIC_REF"],
  FIELD: ["LOGIC", "POSITION_RELATION", "TERM_SET", "NOT", "STRUCTURE"],
  PROXIMITY: ["TERM_SET"],
  POSITION_RELATION: ["TERM_SET"],
  STRUCTURE: ["LOGIC"],
  TERM_SET: [],
  NOT: ["LOGIC", "FIELD", "POSITION_RELATION", "TERM_SET"],
  SCORE: ["FIELD", "TERM_SET"],
  TOPIC_REF: [],
};

function unique(items: MatrixChildType[]): MatrixChildType[] {
  return Array.from(new Set(items));
}

export function getAllowedChildren(
  parentType: MatrixParentType,
  capability: UiCapabilityViewModel
): MatrixChildType[] {
  const configured = parentChildMatrix[parentType] ?? [];

  // Capability-based gating.
  const filtered = configured.filter((type) => {
    if (type === "NOT") return canUseNot(capability);
    if (type === "SCORE") return capability.advanced.allowScore;
    if (type === "TOPIC_REF") return canUseTopicRef(capability);
    return true;
  });

  return unique(filtered);
}
