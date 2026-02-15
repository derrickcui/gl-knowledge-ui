import type { UiExpressionNode } from "./types";
import { createId } from "./utils";

export function normalizeRootForSave(root: UiExpressionNode | null): UiExpressionNode | null {
  if (!root) return null;
  const hydrated = hydrateRootForEditor(root);
  if (!hydrated) return null;
  const normalized = normalizeNode(hydrated);
  return downgradeNodeForSave(normalized);
}

export function hydrateRootForEditor(root: UiExpressionNode | null): UiExpressionNode | null {
  if (!root) return null;
  return upgradeLegacyNode(hydrateNode(root), undefined);
}

function normalizeNode(node: UiExpressionNode): UiExpressionNode {
  switch (node.type) {
    case "LOGIC": {
      const children = node.children.map((child) => normalizeNode(child));
      const normalizedChildren =
        node.operator === "LOGSUM" || node.operator === "WEIGHTED"
          ? children.map((child) => normalizeImportanceForChild(child))
          : children.map((child) => stripTermImportance(child));
      const normalizedThreshold =
        node.operator === "AT_LEAST" || node.operator === "LOGSUM" || node.operator === "WEIGHTED"
          ? node.threshold
          : undefined;
      if (normalizedChildren.length === 1) {
        return normalizedChildren[0];
      }
      return { ...node, threshold: normalizedThreshold, children: normalizedChildren };
    }
    case "POSITION_RELATION":
      return {
        ...node,
        children: node.children
          .map((child) => normalizeNode(child))
          .filter((child): child is Extract<UiExpressionNode, { type: "TERM_SET" }> => child.type === "TERM_SET"),
      };
    case "PROXIMITY":
      return { ...node, children: node.children.map((child) => normalizeNode(child)) };
    case "FIELD":
    case "STRUCTURE":
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

function normalizeImportanceForChild(node: UiExpressionNode): UiExpressionNode {
  if (node.type !== "TERM_SET" && node.type !== "LOGIC") {
    return node;
  }
  return {
    ...node,
    importance: node.importance ?? "NORMAL",
    importanceWeight: node.importanceWeight ?? node.weight ?? 5,
    weight: node.weight ?? node.importanceWeight ?? 5,
  };
}

function stripTermImportance(node: UiExpressionNode): UiExpressionNode {
  if (node.type !== "TERM_SET") return node;
  const { importance, importanceWeight, weight, ...rest } = node;
  void importance;
  void importanceWeight;
  void weight;
  return rest;
}

function hydrateNode(node: UiExpressionNode): UiExpressionNode {
  const id = normalizeNodeId((node as { id?: unknown }).id);
  switch (node.type) {
    case "LOGIC":
    case "PROXIMITY":
      return {
        ...node,
        id,
        children: node.children.map((child) => hydrateNode(child)),
      };
    case "POSITION_RELATION":
      return {
        ...node,
        id,
        children: node.children
          .map((child) => hydrateNode(child))
          .filter((child): child is Extract<UiExpressionNode, { type: "TERM_SET" }> => child.type === "TERM_SET"),
      };
    case "FIELD":
    case "STRUCTURE":
    case "NOT":
    case "SCORE":
      return {
        ...node,
        id,
        child: node.child ? hydrateNode(node.child) : null,
      };
    case "TERM_SET":
    case "TOPIC_REF":
      return {
        ...node,
        id,
      };
  }
}

function upgradeLegacyNode(
  node: UiExpressionNode,
  parentType: UiExpressionNode["type"] | undefined
): UiExpressionNode {
  if (node.type === "PROXIMITY") {
    const convertedChildren = node.children.map((child) => upgradeLegacyNode(child, "PROXIMITY"));
    const termChildren = convertedChildren.filter(
      (child): child is Extract<UiExpressionNode, { type: "TERM_SET" }> => child.type === "TERM_SET"
    );
    if (parentType === "FIELD") {
      const scope = node.relation === "SENTENCE" ? "SENTENCE" : "PARAGRAPH";
      const child: UiExpressionNode | null =
        convertedChildren.length === 0
          ? null
          : convertedChildren.length === 1
          ? convertedChildren[0]
          : { id: createId(), type: "LOGIC", operator: "AND", children: convertedChildren };
      return { id: node.id, type: "STRUCTURE", scope, child };
    }
    return {
      id: node.id,
      type: "POSITION_RELATION",
      mode: "PROXIMITY",
      relation:
        node.relation === "SENTENCE" || node.relation === "PARAGRAPH" ? node.relation : "NEAR",
      ordered: node.relation === "ORDER" ? true : node.ordered,
      strict: undefined,
      distance: node.relation === "NEAR" ? node.distance : undefined,
      children: termChildren,
    };
  }

  switch (node.type) {
    case "LOGIC":
      return { ...node, children: node.children.map((child) => upgradeLegacyNode(child, node.type)) };
    case "POSITION_RELATION":
      const upgradedChildren = node.children
        .map((child) => upgradeLegacyNode(child, node.type))
        .filter((child): child is Extract<UiExpressionNode, { type: "TERM_SET" }> => child.type === "TERM_SET");
      return {
        ...node,
        mode: "PROXIMITY",
        relation: node.relation ?? "NEAR",
        strict: undefined,
        children: upgradedChildren,
      };
    case "FIELD": {
      const upgradedChild = node.child ? upgradeLegacyNode(node.child, node.type) : null;
      if (!upgradedChild) return { ...node, child: null };
      return { ...node, child: upgradedChild };
    }
    case "STRUCTURE":
    case "NOT":
    case "SCORE":
      return { ...node, child: node.child ? upgradeLegacyNode(node.child, node.type) : null };
    case "TERM_SET":
    case "TOPIC_REF":
      return node;
  }
}

function downgradeNodeForSave(node: UiExpressionNode): UiExpressionNode {
  switch (node.type) {
    case "STRUCTURE":
      if (node.scope === "DOCUMENT") {
        return node.child ? downgradeNodeForSave(node.child) : node;
      }
      return {
        id: node.id,
        type: "PROXIMITY",
        relation: node.scope === "SENTENCE" ? "SENTENCE" : "PARAGRAPH",
        ordered: false,
        distance: undefined,
        children: node.child ? [downgradeNodeForSave(node.child)] : [],
      };
    case "POSITION_RELATION":
      return {
        id: node.id,
        type: "PROXIMITY",
        relation: node.relation ?? "NEAR",
        ordered: Boolean(node.ordered),
        distance: (node.relation ?? "NEAR") === "NEAR" ? node.distance : undefined,
        children: node.children.map((child) => downgradeNodeForSave(child)),
      };
    case "LOGIC":
      return { ...node, children: node.children.map((child) => downgradeNodeForSave(child)) };
    case "PROXIMITY":
      return { ...node, children: node.children.map((child) => downgradeNodeForSave(child)) };
    case "FIELD":
      return { ...node, child: node.child ? downgradeNodeForSave(node.child) : null };
    case "NOT":
      return { ...node, child: node.child ? downgradeNodeForSave(node.child) : null };
    case "SCORE":
      return { ...node, child: node.child ? downgradeNodeForSave(node.child) : null };
    case "TERM_SET":
    case "TOPIC_REF":
      return node;
  }
}

function normalizeNodeId(id: unknown): string {
  if (typeof id === "string" && id.trim()) return id;
  return createId();
}
