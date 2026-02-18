import type { UiCapabilityViewModel, UiExpressionNode } from "../types";
import { validateParentChild } from "./validateParentChild";
import type { ValidationError } from "./types";

function nodeKey(node: UiExpressionNode): string {
  return (node as { nodeId?: string }).nodeId ?? node.id;
}

export function validateStructure(
  root: UiExpressionNode,
  capability: UiCapabilityViewModel
): ValidationError[] {
  const errors: ValidationError[] = [];

  const push = (nodeId: string, message: string, severity: ValidationError["severity"] = "ERROR") => {
    errors.push({ nodeId, message, severity });
  };

  const walk = (node: UiExpressionNode) => {
    const currentId = nodeKey(node);

    if ("children" in node && Array.isArray(node.children)) {
      for (const child of node.children) {
        if (!validateParentChild(node.type, child.type, capability)) {
          push(currentId, `${node.type} 不能包含 ${child.type}`);
        }
        walk(child);
      }
    }

    if ("child" in node && node.child) {
      if (!validateParentChild(node.type, node.child.type, capability)) {
        push(currentId, `${node.type} 不能包含 ${node.child.type}`);
      }
      walk(node.child);
    }

    if (node.type === "LOGIC") {
      if (!node.children || node.children.length === 0) {
        push(currentId, "条件组不能为空");
      }
      if (node.operator === "LOGSUM") {
        const threshold = Number(node.threshold);
        if (!Number.isFinite(threshold) || threshold < 1) {
          push(currentId, "LOGSUM 必须设置 threshold");
        } else if (threshold > (node.children?.length ?? 0)) {
          push(currentId, "threshold 不能大于子条件数量");
        }
      }
    }

    if (node.type === "POSITION_RELATION" || node.type === "PROXIMITY") {
      if (!node.children || node.children.length < 2) {
        push(currentId, "位置关系至少需要两个条件");
      }
      if (node.children && node.children.length > 5) {
        push(currentId, "位置关系最多允许 5 个条件");
      }
    }

    if (node.type === "FIELD" && !node.child) {
      push(currentId, "范围必须包含一个子表达式");
    }

    if (node.type === "NOT" && !node.child) {
      push(currentId, "排除条件必须包含一个子表达式");
    }
  };

  walk(root);
  return errors;
}

