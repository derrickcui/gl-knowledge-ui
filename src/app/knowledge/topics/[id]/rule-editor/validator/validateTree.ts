import type { UiCapabilityViewModel, UiExpressionNode } from "../types";
import { validateStructure } from "./validateStructure";

export type MatrixValidationIssue = {
  nodeId: string;
  message: string;
};

export function validateTreeByMatrix(
  root: UiExpressionNode | null,
  capability: UiCapabilityViewModel
): MatrixValidationIssue[] {
  if (!root) {
    return [{ nodeId: "root", message: "非法结构：根节点不能为空" }];
  }
  return validateStructure(root, capability).map((item) => ({
    nodeId: item.nodeId,
    message: item.message,
  }));
}

