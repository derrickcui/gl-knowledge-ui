import type { UiExpressionNode } from "./types";

export function normalizeRootForSave(root: UiExpressionNode | null): UiExpressionNode | null {
  if (!root) return null;
  return normalizeNode(root);
}

function normalizeNode(node: UiExpressionNode): UiExpressionNode {
  switch (node.type) {
    case "LOGIC": {
      const children = node.children.map((child) => normalizeNode(child));
      if (children.length === 1) {
        return children[0];
      }
      return { ...node, children };
    }
    case "PROXIMITY":
      return { ...node, children: node.children.map((child) => normalizeNode(child)) };
    case "FIELD":
      return { ...node, child: node.child ? normalizeNode(node.child) : null };
    case "NOT":
      return { ...node, child: node.child ? normalizeNode(node.child) : null };
    case "SCORE":
      return { ...node, child: node.child ? normalizeNode(node.child) : null };
    case "TERM_SET":
    case "TOPIC_REF":
      return node;
  }
}

