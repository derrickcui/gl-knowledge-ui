import type { UiCapabilityViewModel, UiExpressionNode } from "../types";
import { validateParentChild } from "../validator/validateParentChild";

type ParentRef = {
  parentId: string | null;
  slot: "children" | "child";
  index?: number;
};

function findNodeAndParent(
  root: UiExpressionNode,
  targetId: string,
  parentId: string | null = null
): { node: UiExpressionNode; parent: ParentRef | null } | null {
  if (root.id === targetId) {
    return { node: root, parent: null };
  }

  if ("children" in root && Array.isArray(root.children)) {
    for (let i = 0; i < root.children.length; i += 1) {
      const child = root.children[i];
      if (child.id === targetId) {
        return {
          node: child,
          parent: { parentId: root.id, slot: "children", index: i },
        };
      }
      const found = findNodeAndParent(child, targetId, root.id);
      if (found) return found;
    }
  }

  if ("child" in root && root.child) {
    if (root.child.id === targetId) {
      return {
        node: root.child,
        parent: { parentId: root.id, slot: "child" },
      };
    }
    return findNodeAndParent(root.child, targetId, root.id);
  }

  return null;
}

function containsNode(node: UiExpressionNode, targetId: string): boolean {
  if (node.id === targetId) return true;
  if ("children" in node && Array.isArray(node.children)) {
    return node.children.some((child) => containsNode(child, targetId));
  }
  if ("child" in node && node.child) {
    return containsNode(node.child, targetId);
  }
  return false;
}

function removeById(root: UiExpressionNode, draggedId: string): UiExpressionNode {
  if ("children" in root && Array.isArray(root.children)) {
    return {
      ...root,
      children: root.children
        .filter((child) => child.id !== draggedId)
        .map((child) => removeById(child, draggedId)),
    };
  }

  if ("child" in root) {
    if (!root.child) return root;
    if (root.child.id === draggedId) {
      return { ...root, child: null };
    }
    return {
      ...root,
      child: removeById(root.child, draggedId),
    };
  }

  return root;
}

function insertIntoParent(
  root: UiExpressionNode,
  targetParentId: string,
  targetIndex: number,
  draggedNode: UiExpressionNode
): UiExpressionNode {
  if (root.id === targetParentId) {
    if ("children" in root && Array.isArray(root.children)) {
      const children = [...root.children];
      const insertAt = Math.max(0, Math.min(targetIndex, children.length));
      children.splice(insertAt, 0, draggedNode);
      return { ...root, children };
    }
    if ("child" in root) {
      if (!root.child) {
        return { ...root, child: draggedNode };
      }
      return root;
    }
    return root;
  }

  if ("children" in root && Array.isArray(root.children)) {
    return {
      ...root,
      children: root.children.map((child) => insertIntoParent(child, targetParentId, targetIndex, draggedNode)),
    };
  }

  if ("child" in root && root.child) {
    return {
      ...root,
      child: insertIntoParent(root.child, targetParentId, targetIndex, draggedNode),
    };
  }

  return root;
}

export function moveNode(
  root: UiExpressionNode,
  draggedId: string,
  targetParentId: string,
  targetIndex: number,
  capability: UiCapabilityViewModel
): UiExpressionNode {
  if (draggedId === root.id) return root;
  if (draggedId === targetParentId) return root;

  const dragged = findNodeAndParent(root, draggedId);
  const targetParent = findNodeAndParent(root, targetParentId);
  if (!dragged || !targetParent) return root;

  if (containsNode(dragged.node, targetParentId)) return root;

  if (!validateParentChild(targetParent.node.type, dragged.node.type, capability)) {
    return root;
  }

  const withoutDragged = removeById(root, draggedId);
  return insertIntoParent(withoutDragged, targetParentId, targetIndex, dragged.node);
}

