import type { LogicOperator, UiExpressionNode, UiTermExpression, UiTermSetNode } from "./types";

export type GqlCompileError = {
  nodeId: string;
  message: string;
};

export type GqlCompileResult =
  | {
      ok: true;
      gql: string;
      errors: [];
    }
  | {
      ok: false;
      gql: null;
      errors: GqlCompileError[];
    };

class CompileError extends Error {
  nodeId: string;

  constructor(nodeId: string, message: string) {
    super(message);
    this.name = "CompileError";
    this.nodeId = nodeId;
  }
}

export function compileToGql(root: UiExpressionNode): string {
  if (!root) {
    throw new CompileError("root", "Root is empty.");
  }
  return compileNode(root);
}

export function compileUiTreeToGql(root: UiExpressionNode | null): GqlCompileResult {
  if (!root) {
    return { ok: false, gql: null, errors: [{ nodeId: "root", message: "Root is empty." }] };
  }
  try {
    const gql = compileToGql(root);
    return { ok: true, gql, errors: [] };
  } catch (error) {
    if (error instanceof CompileError) {
      return { ok: false, gql: null, errors: [{ nodeId: error.nodeId, message: error.message }] };
    }
    const message = error instanceof Error ? error.message : "Unknown compile error.";
    return { ok: false, gql: null, errors: [{ nodeId: "root", message }] };
  }
}

function compileNode(node: UiExpressionNode): string {
  switch (node.type) {
    case "FIELD":
      return compileField(node);
    case "STRUCTURE":
      return compileStructure(node);
    case "LOGIC":
      return compileLogic(node);
    case "POSITION_RELATION":
      return compilePositionRelation(node);
    case "TERM_SET":
      return compileTermSet(node);
    case "TOPIC_REF":
      return compileTopicRef(node);
    case "NOT":
      if (!node.child) {
        throw new CompileError(node.id, "NOT node requires a child.");
      }
      return `<not>(${compileNode(node.child)})`;
    case "SCORE":
      return compileScore(node);
    case "PROXIMITY":
      return compileProximityLike(node.id, node.children, {
        relation: node.relation,
        ordered: node.ordered,
        distance: node.distance,
      });
  }
}

function compileField(node: Extract<UiExpressionNode, { type: "FIELD" }>): string {
  if (!node.child) {
    throw new CompileError(node.id, "FIELD node requires a child.");
  }
  const child = compileNode(node.child);
  const field = mapField(node.field);
  if (isAtomicNode(node.child)) {
    return `<in/${field}>${child}`;
  }
  return `<in/${field}>(${child})`;
}

function compileStructure(node: Extract<UiExpressionNode, { type: "STRUCTURE" }>): string {
  if (!node.child) {
    throw new CompileError(node.id, "STRUCTURE node requires a child.");
  }
  const child = compileNode(node.child);
  if (node.scope === "DOCUMENT") return child;
  if (node.scope === "SENTENCE") return `<sentence>(${child})`;
  return `<paragraph>(${child})`;
}

function compileLogic(node: Extract<UiExpressionNode, { type: "LOGIC" }>): string {
  if (node.children.length === 0) {
    throw new CompileError(node.id, "LOGIC node requires at least one child.");
  }
  const parts = node.children.map((child) => compileNode(child));
  if (node.operator === "AT_LEAST") {
    const threshold = requireThreshold(node.id, node.threshold, parts.length);
    return `<logsum/${threshold}>(${parts.join(",")})`;
  }
  if (node.operator === "LOGSUM" || node.operator === "WEIGHTED") {
    if (node.threshold == null) {
      return `<logsum>(${parts.join(",")})`;
    }
    const threshold = requireThreshold(node.id, node.threshold, parts.length);
    return `<logsum/${threshold}>(${parts.join(",")})`;
  }
  const fn = logicOperatorToFn(node.operator);
  return `<${fn}>(${parts.join(",")})`;
}

function compilePositionRelation(node: Extract<UiExpressionNode, { type: "POSITION_RELATION" }>): string {
  const relation = node.relation ?? "NEAR";
  return compileProximityLike(node.id, node.children, {
    relation: node.mode === "ORDER" ? "ORDER" : relation,
    ordered: Boolean(node.ordered || node.mode === "ORDER"),
    distance: node.distance,
  });
}

function compileProximityLike(
  nodeId: string,
  children: UiExpressionNode[],
  options: {
    relation: "NEAR" | "SENTENCE" | "PARAGRAPH" | "ORDER";
    ordered?: boolean;
    distance?: number;
  }
): string {
  if (children.length < 2) {
    throw new CompileError(nodeId, "PROXIMITY requires at least two children.");
  }
  const parts = children.map((child) => compileNode(child));
  const distance = normalizeDistance(options.distance);
  if (options.relation === "SENTENCE") {
    return `<sentence>(${parts.join(",")})`;
  }
  if (options.relation === "PARAGRAPH") {
    return `<paragraph>(${parts.join(",")})`;
  }
  if (options.relation === "ORDER" || options.ordered) {
    return `<order/${distance}>(${parts.join(",")})`;
  }
  return `<near/${distance}>(${parts.join(",")})`;
}

function compileTermSet(node: UiTermSetNode): string {
  if (!node.terms.length) {
    throw new CompileError(node.id, "TERM_SET requires at least one term.");
  }
  const terms = node.terms.map((item) => compileTerm(item));
  const setWeight = Number.isFinite(node.weight) && (node.weight ?? 0) > 0 ? node.weight : 1;
  if (terms.length === 1) {
    return wrapInlineWeight(terms[0], setWeight);
  }
  const fn = node.matchMode === "ALL" ? "and" : "or";
  const inner = `<${fn}>(${terms.join(",")})`;
  return wrapGroupWeight(inner, setWeight);
}

function compileTopicRef(
  node: Extract<UiExpressionNode, { type: "TOPIC_REF" }>
): string {
  const topic = node.topicId.trim();
  if (!topic) {
    throw new CompileError(node.id, "TOPIC_REF requires topicId.");
  }
  return `{${escapeTopic(topic)}}`;
}

function compileScore(node: Extract<UiExpressionNode, { type: "SCORE" }>): string {
  if (!node.child) {
    throw new CompileError(node.id, "SCORE node requires a child.");
  }
  const inner = compileNode(node.child);
  const safeWeight = Number.isFinite(node.weight) && node.weight >= 0 ? node.weight : 1;
  if (isAtomicNode(node.child)) {
    return `[${safeWeight}]${inner}`;
  }
  return `[${safeWeight}](${inner})`;
}

function isAtomicNode(node: UiExpressionNode): boolean {
  return node.type === "TERM_SET" || node.type === "TOPIC_REF";
}

function wrapInlineWeight(inner: string, weight: number | undefined): string {
  if (weight == null || !Number.isFinite(weight) || weight < 0) return inner;
  if (Math.abs(weight - 1) < 1e-6) return inner;
  const normalized = Number(weight.toFixed(3)).toString();
  return `[${normalized}]${inner}`;
}

function wrapGroupWeight(inner: string, weight: number | undefined): string {
  if (weight == null || !Number.isFinite(weight) || weight < 0) return inner;
  if (Math.abs(weight - 1) < 1e-6) return inner;
  const normalized = Number(weight.toFixed(3)).toString();
  return `[${normalized}](${inner})`;
}

function logicOperatorToFn(operator: LogicOperator): "and" | "or" | "accrue" {
  if (operator === "AND") return "and";
  if (operator === "ALL") return "and";
  if (operator === "OR") return "or";
  if (operator === "ANY") return "or";
  if (operator === "ACCRUE") return "accrue";
  throw new Error(`Unsupported LOGIC operator: ${operator}`);
}

function requireThreshold(nodeId: string, raw: number | undefined, childrenCount: number): number {
  const value = Math.round(Number(raw));
  if (!Number.isFinite(value) || value < 1) {
    throw new CompileError(nodeId, "LOGIC threshold must be >= 1.");
  }
  if (value > childrenCount) {
    throw new CompileError(nodeId, "LOGIC threshold exceeds children count.");
  }
  return value;
}

function normalizeDistance(raw: number | undefined): number {
  const value = Math.round(Number(raw ?? 3));
  if (!Number.isFinite(value) || value < 1) return 3;
  return value;
}

function mapField(field: "CONTENT" | "TITLE" | "COLUMN"): string {
  if (field === "TITLE") return "title";
  if (field === "COLUMN") return "column";
  return "content";
}

function compileTerm(term: UiTermExpression): string {
  const text = (term.conceptName || term.conceptId || "").trim();
  if (!text) return "\"\"";
  return quoteTermIfNeeded(text);
}

function quoteTermIfNeeded(text: string): string {
  if (/^[^\s<>{}()[\],"]+$/.test(text)) {
    return text;
  }
  return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function escapeTopic(topic: string): string {
  return topic.replace(/[{}]/g, "");
}
