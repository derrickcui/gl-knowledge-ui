import { createId } from "./utils";
import type {
  UiCapabilityViewModel,
  UiExpressionNode,
  UiNodeType,
  UiPositionRelationNode,
} from "./types";
import {
  canUsePositionMode,
  canUsePositionRelation,
} from "./capability-policy";
import { getAllowedChildNodeTypesByMatrix } from "./nesting-matrix";

export function createNode(type: UiNodeType): UiExpressionNode {
  const id = createId();
  switch (type) {
    case "LOGIC":
      return { id, type, operator: "AND", children: [] };
    case "STRUCTURE":
      return { id, type, scope: "PARAGRAPH", child: null };
    case "POSITION_RELATION":
      return createPositionRelationNode("PROXIMITY");
    case "PROXIMITY":
      return {
        id,
        type,
        relation: "NEAR",
        ordered: false,
        distance: 5,
        children: [],
      };
    case "FIELD":
      return { id, type, field: "CONTENT", child: null };
    case "TERM_SET":
      return { id, type, terms: [], matchMode: "ANY" };
    case "NOT":
      return { id, type, child: null };
    case "SCORE":
      return { id, type, weight: 1, child: null };
    case "TOPIC_REF":
      return { id, type, topicId: "" };
  }
}

export function createPositionRelationNode(mode: "PROXIMITY" | "ORDER"): UiPositionRelationNode {
  if (mode === "ORDER") {
    return {
      id: createId(),
      type: "POSITION_RELATION",
      mode,
      relation: "NEAR",
      strict: true,
      distance: undefined,
      children: [],
    };
  }
  return {
    id: createId(),
    type: "POSITION_RELATION",
    mode,
    relation: "NEAR",
    ordered: false,
    distance: 5,
    children: [],
  };
}

export function updateNode(
  root: UiExpressionNode,
  nodeId: string,
  updater: (node: UiExpressionNode) => UiExpressionNode
): UiExpressionNode {
  if (root.id === nodeId) return updater(root);
  switch (root.type) {
    case "LOGIC":
    case "PROXIMITY":
      return {
        ...root,
        children: root.children.map((child) => updateNode(child, nodeId, updater)),
      };
    case "POSITION_RELATION":
      return {
        ...root,
        children: root.children
          .map((child) => updateNode(child, nodeId, updater))
          .filter((child): child is Extract<UiExpressionNode, { type: "TERM_SET" }> => child.type === "TERM_SET"),
      };
    case "FIELD":
    case "STRUCTURE":
    case "NOT":
    case "SCORE":
      return {
        ...root,
        child: root.child ? updateNode(root.child, nodeId, updater) : null,
      };
    case "TERM_SET":
    case "TOPIC_REF":
      return root;
  }
}

export function insertChild(
  root: UiExpressionNode,
  parentId: string,
  newNode: UiExpressionNode
): UiExpressionNode {
  return updateNode(root, parentId, (node) => {
    switch (node.type) {
      case "LOGIC":
      case "PROXIMITY":
        return { ...node, children: [...node.children, newNode] };
      case "POSITION_RELATION":
        if (newNode.type !== "TERM_SET") return node;
        return { ...node, children: [...node.children, newNode] };
      case "FIELD":
      case "STRUCTURE":
      case "NOT":
      case "SCORE":
        if (!node.child) {
          return { ...node, child: newNode };
        }
        return {
          ...node,
          child: placeNodeAboveExisting(newNode, node.child),
        };
      default:
        return node;
    }
  });
}

function placeNodeAboveExisting(
  inserted: UiExpressionNode,
  existing: UiExpressionNode
): UiExpressionNode {
  switch (inserted.type) {
    case "LOGIC":
    case "PROXIMITY":
      return {
        ...inserted,
        children: [existing, ...inserted.children],
      };
    case "POSITION_RELATION":
      if (existing.type !== "TERM_SET") {
        return {
          id: createId(),
          type: "LOGIC",
          operator: "AND",
          children: [existing, inserted],
        };
      }
      return {
        ...inserted,
        children: [existing, ...inserted.children],
      };
    case "FIELD":
    case "STRUCTURE":
    case "NOT":
    case "SCORE":
      return {
        ...inserted,
        child: existing,
      };
    case "TERM_SET":
    case "TOPIC_REF":
      return {
        id: createId(),
        type: "LOGIC",
        operator: "AND",
        children: [existing, inserted],
      };
  }
}

export function removeNode(root: UiExpressionNode, nodeId: string): UiExpressionNode | null {
  if (root.id === nodeId) {
    return null;
  }
  switch (root.type) {
    case "LOGIC":
    case "PROXIMITY":
      return {
        ...root,
        children: root.children
          .map((child) => removeNode(child, nodeId))
          .filter((child): child is UiExpressionNode => Boolean(child)),
      };
    case "POSITION_RELATION":
      return {
        ...root,
        children: root.children
          .map((child) => removeNode(child, nodeId))
          .filter(
            (child): child is Extract<UiExpressionNode, { type: "TERM_SET" }> =>
              child !== null && child.type === "TERM_SET"
          ),
      };
    case "FIELD":
    case "STRUCTURE":
    case "NOT":
    case "SCORE":
      return {
        ...root,
        child: root.child ? removeNode(root.child, nodeId) : null,
      };
    case "TERM_SET":
    case "TOPIC_REF":
      return root;
  }
}

export function getAllowedChildTypes(
  parentNode: UiExpressionNode,
  capability: UiCapabilityViewModel
): UiNodeType[] {
  const allow = getAllowedChildNodeTypesByMatrix(parentNode.type, capability);
  if ((parentNode.type === "FIELD" || parentNode.type === "STRUCTURE" || parentNode.type === "NOT" || parentNode.type === "SCORE") && parentNode.child) {
    return [];
  }
  return allow;
}

export function supportsPositionRelation(capability: UiCapabilityViewModel): boolean {
  return canUsePositionRelation(capability);
}

export function canCreatePositionMode(
  capability: UiCapabilityViewModel,
  mode: "PROXIMITY" | "ORDER"
): boolean {
  return canUsePositionMode(capability, mode);
}

export function findParent(root: UiExpressionNode, nodeId: string): UiExpressionNode | null {
  switch (root.type) {
    case "LOGIC":
    case "POSITION_RELATION":
    case "PROXIMITY": {
      for (const child of root.children) {
        if (child.id === nodeId) return root;
        const found = findParent(child, nodeId);
        if (found) return found;
      }
      return null;
    }
    case "FIELD":
    case "STRUCTURE":
    case "NOT":
    case "SCORE":
      if (!root.child) return null;
      if (root.child.id === nodeId) return root;
      return findParent(root.child, nodeId);
    case "TERM_SET":
    case "TOPIC_REF":
      return null;
  }
}

export function findNode(root: UiExpressionNode, nodeId: string): UiExpressionNode | null {
  if (root.id === nodeId) return root;
  switch (root.type) {
    case "LOGIC":
    case "POSITION_RELATION":
    case "PROXIMITY":
      for (const child of root.children) {
        const found = findNode(child, nodeId);
        if (found) return found;
      }
      return null;
    case "FIELD":
    case "STRUCTURE":
    case "NOT":
    case "SCORE":
      return root.child ? findNode(root.child, nodeId) : null;
    case "TERM_SET":
    case "TOPIC_REF":
      return null;
  }
}

export function moveChild(
  root: UiExpressionNode,
  parentId: string,
  childId: string,
  direction: "up" | "down"
): UiExpressionNode {
  return updateNode(root, parentId, (node) => {
    if (node.type !== "LOGIC" && node.type !== "POSITION_RELATION" && node.type !== "PROXIMITY") return node;
    const index = node.children.findIndex((item) => item.id === childId);
    if (index < 0) return node;
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= node.children.length) return node;
    const next = [...node.children];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    if (node.type === "POSITION_RELATION") {
      return {
        ...node,
        children: next.filter(
          (child): child is Extract<UiExpressionNode, { type: "TERM_SET" }> => child.type === "TERM_SET"
        ),
      };
    }
    return { ...node, children: next };
  });
}
