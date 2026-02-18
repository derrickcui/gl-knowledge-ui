import type { UiCapabilityViewModel, UiExpressionNode } from "./types";
import { getAllowedChildren } from "./validator/matrix";

type ParentType = UiExpressionNode["type"];
type ChildType = UiExpressionNode["type"];

export function getAllowedChildNodeTypesByMatrix(
  parentType: ParentType,
  capability: UiCapabilityViewModel
): ChildType[] {
  return getAllowedChildren(parentType, capability);
}

export function isChildAllowedByMatrix(
  parentType: ParentType,
  childType: ChildType,
  capability: UiCapabilityViewModel
): boolean {
  return getAllowedChildNodeTypesByMatrix(parentType, capability).includes(childType);
}
