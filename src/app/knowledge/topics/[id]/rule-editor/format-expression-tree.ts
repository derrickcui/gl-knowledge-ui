import type { LogicOperator, UiExpressionNode, UiTermSetNode } from "./types";

export function formatExpressionTree(root: UiExpressionNode | null): UiExpressionNode | null {
  if (!root) return null;
  return formatNode(root, true);
}

function formatNode(node: UiExpressionNode, isRoot = false): UiExpressionNode {
  switch (node.type) {
    case "LOGIC": {
      const normalizedChildren = node.children.map((child) => formatNode(child));
      const flattened = normalizedChildren.flatMap((child) => {
        if (
          child.type === "LOGIC" &&
          canFlattenOperator(node.operator) &&
          child.operator === node.operator
        ) {
          return child.children;
        }
        return [child];
      });
      const deduped = dedupeTermSets(flattened);
      if (!isRoot && deduped.length === 1) {
        return deduped[0];
      }
      return { ...node, children: deduped };
    }
    case "POSITION_RELATION":
      return {
        ...node,
        children: dedupeTermSets(node.children.map((child) => formatNode(child))).filter(
          (child): child is UiTermSetNode => child.type === "TERM_SET"
        ),
      };
    case "PROXIMITY":
      return {
        ...node,
        children: dedupeTermSets(node.children.map((child) => formatNode(child))),
      };
    case "FIELD":
    case "STRUCTURE":
    case "NOT":
    case "SCORE":
      return {
        ...node,
        child: node.child ? formatNode(node.child) : null,
      };
    case "TERM_SET":
    case "TOPIC_REF":
      return node;
  }
}

function canFlattenOperator(operator: LogicOperator) {
  return operator === "AND" || operator === "ALL" || operator === "OR" || operator === "ANY";
}

function dedupeTermSets(children: UiExpressionNode[]): UiExpressionNode[] {
  const seen = new Set<string>();
  const next: UiExpressionNode[] = [];
  children.forEach((child) => {
    if (child.type !== "TERM_SET") {
      next.push(child);
      return;
    }
    const key = serializeTermSet(child);
    if (seen.has(key)) return;
    seen.add(key);
    next.push(child);
  });
  return next;
}

function serializeTermSet(node: UiTermSetNode): string {
  const terms = [...node.terms]
    .map((term) => `${term.conceptId}:${term.includeDescendants ? 1 : 0}`)
    .sort()
    .join("|");
  return `${node.matchMode}::${terms}`;
}
