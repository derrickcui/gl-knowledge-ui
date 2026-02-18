import type { UiCapabilityViewModel, UiExpressionNode } from "../types";
import { validateParentChild } from "../validator/validateParentChild";
import { createId } from "../utils";

export function wrapNodesInField(
  root: UiExpressionNode,
  parentId: string,
  selectedIds: string[],
  capability: UiCapabilityViewModel
): UiExpressionNode {
  if (!selectedIds.length) return root;
  const selected = new Set(selectedIds);

  const traverse = (node: UiExpressionNode): UiExpressionNode => {
    if (node.id === parentId && "children" in node && Array.isArray(node.children)) {
      if (!validateParentChild(node.type, "FIELD", capability)) {
        throw new Error("当前结构不允许设置范围");
      }

      const selectedIndexes = node.children
        .map((child, index) => (selected.has(child.id) ? index : -1))
        .filter((index) => index >= 0);
      if (selectedIndexes.length === 0) return node;

      const firstIndex = Math.min(...selectedIndexes);
      const selectedChildren = selectedIndexes.map((index) => node.children[index]);
      const selectedChildSet = new Set(selectedChildren.map((child) => child.id));

      const innerLogic: UiExpressionNode =
        selectedChildren.length === 1
          ? selectedChildren[0]
          : {
              id: createId(),
              type: "LOGIC",
              operator: "AND",
              children: selectedChildren,
            };

      const fieldNode: UiExpressionNode = {
        id: createId(),
        type: "FIELD",
        field: capability.where.allowFields.includes("CONTENT")
          ? "CONTENT"
          : capability.where.allowFields[0] ?? "CONTENT",
        child: innerLogic,
      };

      const remaining = node.children.filter((child) => !selectedChildSet.has(child.id));
      const insertAt = Math.min(firstIndex, remaining.length);

      return {
        ...node,
        children: [...remaining.slice(0, insertAt), fieldNode, ...remaining.slice(insertAt)],
      };
    }

    if ("children" in node && Array.isArray(node.children)) {
      return {
        ...node,
        children: node.children.map(traverse),
      };
    }

    if ("child" in node && node.child) {
      return {
        ...node,
        child: traverse(node.child),
      };
    }

    return node;
  };

  return traverse(root);
}

