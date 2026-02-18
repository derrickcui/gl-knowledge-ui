import type { UiExpressionNode } from "./types";
import { createId } from "./utils";

export function normalizeRootForSave(root: UiExpressionNode | null): UiExpressionNode | null {
  if (!root) return null;
  const hydrated = hydrateRootForEditor(root);
  if (!hydrated) return null;
  return normalizeNode(hydrated);
}

export function hydrateRootForEditor(root: UiExpressionNode | null): UiExpressionNode | null {
  if (!root) return null;
  return ensureRootExpressionGroup(upgradeLegacyNode(hydrateNode(root), undefined));
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
  const legacyNode = node as { id?: unknown; nodeId?: unknown };
  const id = normalizeNodeId(legacyNode.id, legacyNode.nodeId);
  switch (node.type) {
    case "LOGIC": {
      // Persisted/runtime LOGSUM+threshold is the UI AT_LEAST semantic mode.
      const uiOperator = node.operator === "LOGSUM" && node.threshold != null ? "AT_LEAST" : node.operator;
      return {
        id,
        type: "LOGIC",
        operator: uiOperator,
        threshold: node.threshold,
        importance: node.importance,
        importanceWeight: node.importanceWeight,
        weight: node.weight,
        children: node.children.map((child) => hydrateNode(child)),
      };
    }
    case "PROXIMITY":
      return {
        id,
        type: "PROXIMITY",
        relation: node.relation,
        ordered: node.ordered,
        distance: node.distance,
        children: node.children.map((child) => hydrateNode(child)),
      };
    case "POSITION_RELATION":
      return {
        id,
        type: "POSITION_RELATION",
        mode: node.mode,
        relation: node.relation,
        distance: node.distance,
        ordered: node.ordered,
        strict: node.strict,
        children: node.children
          .map((child) => hydrateNode(child))
          .filter((child): child is Extract<UiExpressionNode, { type: "TERM_SET" }> => child.type === "TERM_SET"),
      };
    case "FIELD":
      return {
        id,
        type: "FIELD",
        field: node.field,
        child: node.child ? hydrateNode(node.child) : null,
      };
    case "STRUCTURE":
      return {
        id,
        type: "STRUCTURE",
        scope: node.scope,
        child: node.child ? hydrateNode(node.child) : null,
      };
    case "NOT":
      return {
        id,
        type: "NOT",
        child: node.child ? hydrateNode(node.child) : null,
      };
    case "SCORE":
      return {
        id,
        type: "SCORE",
        weight: node.weight,
        child: node.child ? hydrateNode(node.child) : null,
      };
    case "TERM_SET":
      return {
        id,
        type: "TERM_SET",
        terms: node.terms,
        matchMode: node.matchMode,
        importance: node.importance,
        importanceWeight: node.importanceWeight,
        weight: node.weight,
      };
    case "TOPIC_REF":
      return {
        id,
        type: "TOPIC_REF",
        topicId: node.topicId,
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

function normalizeNodeId(id: unknown, legacyNodeId?: unknown): string {
  if (typeof id === "string" && id.trim()) return id;
  if (typeof legacyNodeId === "string" && legacyNodeId.trim()) return legacyNodeId;
  return createId();
}

function ensureRootExpressionGroup(root: UiExpressionNode): UiExpressionNode {
  if (root.type === "LOGIC") return root;
  return {
    id: createId(),
    type: "LOGIC",
    operator: "AND",
    children: [root],
  };
}
