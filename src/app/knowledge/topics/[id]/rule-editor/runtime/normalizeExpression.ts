import type { RuleField, UiExpressionNode, UiNodeType } from "../types";
import { createId } from "../utils";

const VALID_NODE_TYPES: UiNodeType[] = [
  "LOGIC",
  "PROXIMITY",
  "STRUCTURE",
  "POSITION_RELATION",
  "FIELD",
  "TERM_SET",
  "NOT",
  "SCORE",
  "TOPIC_REF",
];

type AnyNode = UiExpressionNode & { nodeId?: unknown; children?: unknown[]; child?: unknown };

export function normalizeExpression(root: UiExpressionNode): UiExpressionNode {
  return normalizeNode(root, {});
}

function normalizeNode(node: UiExpressionNode, context: { activeField?: RuleField }): UiExpressionNode {
  const clean = cloneNode(node as AnyNode);
  if (!VALID_NODE_TYPES.includes(clean.type)) {
    throw new Error("LOGIC children contain invalid node type");
  }

  switch (clean.type) {
    case "FIELD":
      return normalizeField(clean, context);
    case "LOGIC":
      return normalizeLogic(clean, context);
    case "PROXIMITY":
      return normalizeProximity(clean, context);
    case "STRUCTURE":
      return normalizeStructure(clean, context);
    case "POSITION_RELATION":
      return normalizePosition(clean, context);
    case "NOT":
      return normalizeNot(clean, context);
    case "SCORE":
      return normalizeScore(clean, context);
    case "TERM_SET":
      return normalizeTermSet(clean);
    case "TOPIC_REF":
      return clean;
  }
}

function normalizeField(
  node: Extract<UiExpressionNode, { type: "FIELD" }>,
  context: { activeField?: RuleField }
): UiExpressionNode {
  if (!node.field || typeof node.field !== "string") {
    throw new Error("FIELD field is required");
  }
  if (!node.child) {
    throw new Error("FIELD must contain one child expression");
  }
  const normalizedChild = normalizeNode(node.child, { activeField: node.field });
  if (normalizedChild.type === "FIELD") {
    throw new Error("FIELD cannot nest FIELD");
  }
  void context;
  return { ...node, child: normalizedChild };
}

function normalizeLogic(
  node: Extract<UiExpressionNode, { type: "LOGIC" }>,
  context: { activeField?: RuleField }
): UiExpressionNode {
  if (!Array.isArray(node.children) || node.children.length === 0) {
    throw new Error("LOGIC node must contain at least one child");
  }
  if (node.children.some((child) => !child)) {
    throw new Error("LOGIC children contain invalid node");
  }

  const children = node.children.map((child) => normalizeNode(child, context));
  const fieldChildren = children.filter(
    (child): child is Extract<UiExpressionNode, { type: "FIELD" }> => child.type === "FIELD"
  );
  const uniqueFieldCount = new Set(fieldChildren.map((item) => item.field)).size;
  if (fieldChildren.length >= 2 && uniqueFieldCount > 1) {
    throw new Error("FIELD scope conflict: mixed fields in LOGIC");
  }

  const thresholdBased = node.operator === "AT_LEAST" || node.operator === "LOGSUM";
  if (thresholdBased) {
    const threshold = Number(node.threshold ?? 0);
    if (!Number.isFinite(threshold) || threshold < 1) {
      throw new Error("LOGIC threshold must be >= 1");
    }
    if (threshold > children.length) {
      throw new Error("LOGIC threshold exceeds children count");
    }
  }

  if (fieldChildren.length === children.length && fieldChildren.length > 0 && uniqueFieldCount === 1) {
    const field = fieldChildren[0].field;
    const unwrapped = fieldChildren.map((item) => item.child as UiExpressionNode);
    if (context.activeField === field) {
      return { ...node, children: unwrapped };
    }
    return {
      id: createId(),
      type: "FIELD",
      field,
      child: { ...node, children: unwrapped },
    };
  }

  return { ...node, children };
}

function normalizeProximity(
  node: Extract<UiExpressionNode, { type: "PROXIMITY" }>,
  context: { activeField?: RuleField }
): UiExpressionNode {
  if (!Array.isArray(node.children) || node.children.length < 2) {
    throw new Error("PROXIMITY requires at least two children");
  }
  if (node.children.some((child) => !child)) {
    throw new Error("PROXIMITY children contain invalid node");
  }

  const children = node.children.map((child) => normalizeNode(child, context));
  const fieldChildren = children.filter(
    (child): child is Extract<UiExpressionNode, { type: "FIELD" }> => child.type === "FIELD"
  );
  if (fieldChildren.length === 0) {
    return { ...node, children };
  }

  const uniqueField = new Set(fieldChildren.map((child) => child.field));
  if (uniqueField.size > 1) {
    throw new Error("FIELD scope conflict: mixed fields in PROXIMITY");
  }

  if (fieldChildren.some((child) => !child.child)) {
    throw new Error("FIELD child inside PROXIMITY must contain one child expression");
  }

  if (fieldChildren.length === children.length) {
    const field = fieldChildren[0].field;
    const unwrapped = fieldChildren.map((item) => item.child as UiExpressionNode);
    const proximity = { ...node, children: unwrapped };
    if (context.activeField === field) {
      return proximity;
    }
    return {
      id: createId(),
      type: "FIELD",
      field,
      child: proximity,
    };
  }

  return { ...node, children };
}

function normalizeStructure(
  node: Extract<UiExpressionNode, { type: "STRUCTURE" }>,
  context: { activeField?: RuleField }
): UiExpressionNode {
  if (!node.child) {
    throw new Error("STRUCTURE must contain one child expression");
  }
  return { ...node, child: normalizeNode(node.child, context) };
}

function normalizePosition(
  node: Extract<UiExpressionNode, { type: "POSITION_RELATION" }>,
  context: { activeField?: RuleField }
): UiExpressionNode {
  if (!Array.isArray(node.children) || node.children.length < 2) {
    throw new Error("POSITION_RELATION requires at least two children");
  }
  const children = node.children.map((child) => normalizeNode(child, context));
  if (children.some((child) => child.type !== "TERM_SET")) {
    throw new Error("POSITION_RELATION only supports TERM_SET children");
  }
  return { ...node, children: children as Extract<UiExpressionNode, { type: "TERM_SET" }>[] };
}

function normalizeNot(
  node: Extract<UiExpressionNode, { type: "NOT" }>,
  context: { activeField?: RuleField }
): UiExpressionNode {
  if (!node.child) {
    throw new Error("NOT must contain one child expression");
  }
  return { ...node, child: normalizeNode(node.child, context) };
}

function normalizeScore(
  node: Extract<UiExpressionNode, { type: "SCORE" }>,
  context: { activeField?: RuleField }
): UiExpressionNode {
  if (!node.child) {
    throw new Error("SCORE must contain at least one child expression");
  }
  return { ...node, child: normalizeNode(node.child, context) };
}

function normalizeTermSet(node: Extract<UiExpressionNode, { type: "TERM_SET" }>): UiExpressionNode {
  if (!Array.isArray(node.terms) || node.terms.length === 0) {
    throw new Error("TERM_SET must contain at least one term");
  }
  return node;
}

function cloneNode<T extends AnyNode>(node: T): T {
  const cloned = JSON.parse(JSON.stringify(node)) as T;
  if ("nodeId" in cloned) {
    delete cloned.nodeId;
  }
  return cloned;
}
