import { createId } from "./utils";
import type {
  ProximityRelation,
  UiCapabilityViewModel,
  UiExpressionNode,
  UiNodeType,
} from "./types";

export function createNode(type: UiNodeType): UiExpressionNode {
  const id = createId();
  switch (type) {
    case "LOGIC":
      return { id, type, operator: "AND", children: [] };
    case "PROXIMITY":
      return { id, type, relation: "NEAR", ordered: false, distance: 5, children: [] };
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
    case "FIELD":
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
      case "FIELD":
      case "NOT":
      case "SCORE":
        return { ...node, child: newNode };
      default:
        return node;
    }
  });
}

export function removeNode(root: UiExpressionNode, nodeId: string): UiExpressionNode | null {
  if (root.id === nodeId) return null;
  switch (root.type) {
    case "LOGIC":
    case "PROXIMITY":
      return {
        ...root,
        children: root.children
          .map((child) => removeNode(child, nodeId))
          .filter((child): child is UiExpressionNode => Boolean(child)),
      };
    case "FIELD":
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
  const allow: UiNodeType[] = [];
  if (parentNode.type === "LOGIC") {
    if (capability.semantic.allowNested) {
      allow.push("LOGIC");
    }
    allow.push("TERM_SET");
    if (capability.structure.allowRelation.some((item) => item !== "NONE")) {
      allow.push("PROXIMITY");
    }
    if (capability.advanced.allowNot) {
      allow.push("NOT");
    }
    if (capability.advanced.allowScore) {
      allow.push("SCORE");
    }
    if (capability.advanced.allowTopicRef) {
      allow.push("TOPIC_REF");
    }
    return allow;
  }

  if (parentNode.type === "PROXIMITY") {
    allow.push("TERM_SET");
    if (capability.semantic.allowNested) {
      allow.push("LOGIC");
    }
    if (capability.advanced.allowTopicRef) {
      allow.push("TOPIC_REF");
    }
    return allow;
  }

  if (parentNode.type === "FIELD") {
    allow.push("LOGIC");
    return allow;
  }

  if (parentNode.type === "NOT" || parentNode.type === "SCORE") {
    allow.push("TERM_SET");
    allow.push("LOGIC");
    if (capability.structure.allowRelation.some((item) => item !== "NONE")) {
      allow.push("PROXIMITY");
    }
    if (capability.advanced.allowTopicRef) {
      allow.push("TOPIC_REF");
    }
    return allow;
  }

  return allow;
}

export function findNode(root: UiExpressionNode, nodeId: string): UiExpressionNode | null {
  if (root.id === nodeId) return root;
  switch (root.type) {
    case "LOGIC":
    case "PROXIMITY":
      for (const child of root.children) {
        const found = findNode(child, nodeId);
        if (found) return found;
      }
      return null;
    case "FIELD":
    case "NOT":
    case "SCORE":
      return root.child ? findNode(root.child, nodeId) : null;
    case "TERM_SET":
    case "TOPIC_REF":
      return null;
  }
}

export function wrapNode(
  root: UiExpressionNode,
  nodeId: string,
  wrapper: "LOGIC" | "NOT" | "PROXIMITY"
): { root: UiExpressionNode; wrapperId: string } {
  const [next, wrapperId] = wrapNodeInternal(root, nodeId, wrapper);
  return { root: next, wrapperId: wrapperId ?? root.id };
}

function wrapNodeInternal(
  node: UiExpressionNode,
  nodeId: string,
  wrapper: "LOGIC" | "NOT" | "PROXIMITY"
): [UiExpressionNode, string | null] {
  if (node.id === nodeId) {
    const wrapped = wrapCurrent(node, wrapper);
    return [wrapped, wrapped.id];
  }
  switch (node.type) {
    case "LOGIC":
    case "PROXIMITY": {
      let wrapperId: string | null = null;
      const children = node.children.map((child) => {
        const [nextChild, nextWrapperId] = wrapNodeInternal(child, nodeId, wrapper);
        if (nextWrapperId) wrapperId = nextWrapperId;
        return nextChild;
      });
      return [{ ...node, children }, wrapperId];
    }
    case "FIELD":
    case "NOT":
    case "SCORE": {
      if (!node.child) return [node, null];
      const [nextChild, wrapperId] = wrapNodeInternal(node.child, nodeId, wrapper);
      return [{ ...node, child: nextChild }, wrapperId];
    }
    case "TERM_SET":
    case "TOPIC_REF":
      return [node, null];
  }
}

function wrapCurrent(node: UiExpressionNode, wrapper: "LOGIC" | "NOT" | "PROXIMITY"): UiExpressionNode {
  if (wrapper === "LOGIC") {
    return {
      id: createId(),
      type: "LOGIC",
      operator: "AND",
      children: [node],
    };
  }
  if (wrapper === "NOT") {
    return {
      id: createId(),
      type: "NOT",
      child: node,
    };
  }
  const proximity: ProximityRelation = "NEAR";
  return {
    id: createId(),
    type: "PROXIMITY",
    relation: proximity,
    ordered: false,
    distance: 5,
    children: [node],
  };
}

export function moveChild(
  root: UiExpressionNode,
  parentId: string,
  childId: string,
  direction: "up" | "down"
): UiExpressionNode {
  return updateNode(root, parentId, (node) => {
    if (node.type !== "LOGIC" && node.type !== "PROXIMITY") return node;
    const index = node.children.findIndex((item) => item.id === childId);
    if (index < 0) return node;
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= node.children.length) return node;
    const next = [...node.children];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    return { ...node, children: next };
  });
}

