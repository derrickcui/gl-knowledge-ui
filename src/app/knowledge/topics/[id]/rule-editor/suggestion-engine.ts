import type { UiExpressionNode } from "./types";

export interface ProximitySuggestion {
  logicNodeId: string;
  termNodeIds: string[];
}

export function detectProximitySuggestion(root: UiExpressionNode | null): ProximitySuggestion | null {
  if (!root) return null;
  return walk(root);
}

function walk(node: UiExpressionNode): ProximitySuggestion | null {
  if (node.type === "LOGIC") {
    const hasRelation = node.children.some(
      (child) => child.type === "POSITION_RELATION" || child.type === "PROXIMITY"
    );
    const terms = node.children.filter(
      (child): child is Extract<UiExpressionNode, { type: "TERM_SET" }> => child.type === "TERM_SET"
    );
    if (!hasRelation && terms.length >= 2) {
      return {
        logicNodeId: node.id,
        termNodeIds: [terms[0].id, terms[1].id],
      };
    }
  }

  if ("children" in node && Array.isArray(node.children)) {
    for (const child of node.children) {
      const found = walk(child);
      if (found) return found;
    }
  }
  if ("child" in node && node.child) {
    return walk(node.child);
  }
  return null;
}
