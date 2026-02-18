import type { UiCapabilityViewModel, UiExpressionNode } from "../types";
import { getAllowedChildren } from "./matrix";

export function validateParentChild(
  parentType: UiExpressionNode["type"],
  childType: UiExpressionNode["type"],
  capability: UiCapabilityViewModel
): boolean {
  return getAllowedChildren(parentType, capability).includes(childType as never);
}
