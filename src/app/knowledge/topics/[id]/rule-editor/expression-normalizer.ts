import type { RuleField, UiExpressionNode } from "./types";
import { createId } from "./utils";

export interface NormalizationIssue {
  nodeId: string;
  message: string;
}

type NormalizeContext = {
  activeField?: RuleField;
};

export function normalizeExpressionTree(root: UiExpressionNode | null): {
  root: UiExpressionNode | null;
  issues: NormalizationIssue[];
} {
  if (!root) return { root: null, issues: [] };
  const issues: NormalizationIssue[] = [];
  const normalized = normalizeNode(root, issues, {});
  return { root: normalized, issues };
}

function normalizeNode(
  node: UiExpressionNode,
  issues: NormalizationIssue[],
  context: NormalizeContext
): UiExpressionNode {
  const cleanNodeId = <T extends UiExpressionNode>(item: T): T => {
    const next = { ...item } as T & { nodeId?: unknown };
    if ("nodeId" in next) {
      delete next.nodeId;
    }
    return next;
  };

  switch (node.type) {
    case "FIELD": {
      const base = cleanNodeId(node);
      const child = base.child ? normalizeNode(base.child, issues, { activeField: base.field }) : null;
      if (child?.type === "FIELD") {
        issues.push({
          nodeId: child.id,
          message: "FIELD cannot directly contain another FIELD.",
        });
      }
      return { ...base, child };
    }
    case "LOGIC": {
      const base = cleanNodeId(node);
      const children = base.children.map((child) => normalizeNode(child, issues, context));
      const hoisted = tryHoistCommonField(children);
      if (hoisted) {
        if (context.activeField === hoisted.field) {
          return {
            ...base,
            children: hoisted.children,
          };
        }
        return {
          id: createId(),
          type: "FIELD",
          field: hoisted.field,
          child: {
            ...base,
            children: hoisted.children,
          },
        };
      }
      return {
        ...base,
        children,
      };
    }
    case "PROXIMITY": {
      const base = cleanNodeId(node);
      const normalizedChildren = base.children.map((child) => normalizeNode(child, issues, context));
      const fieldChildren = normalizedChildren.filter(
        (child): child is Extract<UiExpressionNode, { type: "FIELD" }> => child.type === "FIELD"
      );
      if (fieldChildren.length === 0) {
        return { ...base, children: normalizedChildren };
      }

      if (fieldChildren.some((child) => !child.child)) {
        issues.push({
          nodeId: base.id,
          message: "FIELD child inside PROXIMITY must have one expression child.",
        });
        return { ...base, children: normalizedChildren };
      }

      const uniqueFields = Array.from(new Set(fieldChildren.map((child) => child.field)));
      if (uniqueFields.length > 1) {
        issues.push({
          nodeId: base.id,
          message: "All FIELD children inside PROXIMITY must use the same field.",
        });
        return { ...base, children: normalizedChildren };
      }

      const targetField = uniqueFields[0];
      const unwrappedChildren = normalizedChildren.map((child) =>
        child.type === "FIELD" && child.child ? child.child : child
      );
      const normalizedProximity: UiExpressionNode = { ...base, children: unwrappedChildren };

      if (context.activeField === targetField) {
        return normalizedProximity;
      }

      return {
        id: createId(),
        type: "FIELD",
        field: targetField,
        child: normalizedProximity,
      };
    }
    case "POSITION_RELATION":
      return {
        ...cleanNodeId(node),
        children: node.children.map((child) => normalizeNode(child, issues, context)).filter(
          (child): child is Extract<UiExpressionNode, { type: "TERM_SET" }> => child.type === "TERM_SET"
        ),
      };
    case "NOT":
      return {
        ...cleanNodeId(node),
        child: node.child ? normalizeNode(node.child, issues, context) : null,
      };
    case "SCORE":
      return {
        ...cleanNodeId(node),
        child: node.child ? normalizeNode(node.child, issues, context) : null,
      };
    case "TERM_SET":
    case "TOPIC_REF":
      return cleanNodeId(node);
    case "STRUCTURE":
      return {
        ...cleanNodeId(node),
        child: node.child ? normalizeNode(node.child, issues, context) : null,
      };
  }
}

function tryHoistCommonField(children: UiExpressionNode[]): { field: RuleField; children: UiExpressionNode[] } | null {
  if (children.length === 0) return null;
  const fieldChildren = children.filter(
    (item): item is Extract<UiExpressionNode, { type: "FIELD" }> => item.type === "FIELD" && !!item.child
  );
  if (fieldChildren.length !== children.length) return null;
  const unique = Array.from(new Set(fieldChildren.map((item) => item.field)));
  if (unique.length !== 1) return null;
  return {
    field: unique[0],
    children: fieldChildren.map((item) => item.child as UiExpressionNode),
  };
}
