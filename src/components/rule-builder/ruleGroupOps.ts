import { RuleNode, cloneRule } from "./astTypes";
import { createNodeId } from "./nodeId";

function createRuleRoot(
  children: RuleNode[],
  operator: "ANY" | "ALL" | "EXCLUDE" = "ANY"
): RuleNode {
  return {
    type: "GROUP",
    params: { operator, role: "RULE", sticky: true },
    children,
  };
}

export function createScenario(index: number): RuleNode {
  return {
    id: createNodeId(),
    type: "GROUP",
    params: {
      operator: "AND",
      role: "SCENARIO",
      sticky: true,
      title: `\u5224\u65ad\u573a\u666f ${index + 1}`,
    },
    priority: 100,
    children: [],
  };
}

function ensureScenario(node: RuleNode, index: number): RuleNode {
  const rawOperator = node.params?.operator;
  const scenarioOperator =
    rawOperator === "ALL"
      ? "AND"
      : rawOperator === "ANY"
      ? "OR"
      : rawOperator === "EXCLUDE"
      ? "EXCLUDE"
      : rawOperator === "ACCRUE"
      ? "ACCRUE"
      : rawOperator === "LOGSUM"
      ? "LOGSUM"
      : rawOperator === "AND" || rawOperator === "OR"
      ? rawOperator
      : "AND";

  if (
    node.type === "GROUP" &&
    (node.params?.operator === "ALL" ||
      node.params?.operator === "ANY" ||
      node.params?.operator === "EXCLUDE" ||
      node.params?.operator === "ACCRUE" ||
      node.params?.operator === "LOGSUM" ||
      node.params?.operator === "AND" ||
      node.params?.operator === "OR")
  ) {
    return {
      ...node,
      id: node.id ?? createNodeId(),
      priority: node.priority ?? 100,
      params: {
        ...node.params,
        operator: scenarioOperator,
        role: node.params?.role ?? "SCENARIO",
        sticky: true,
        title: node.params?.title ?? `\u5224\u65ad\u573a\u666f ${index + 1}`,
      },
    };
  }

  return {
    id: createNodeId(),
    type: "GROUP",
    params: {
      operator: "AND",
      role: "SCENARIO",
      sticky: true,
      title: `\u5224\u65ad\u573a\u666f ${index + 1}`,
    },
    priority: 100,
    children: [node],
  };
}

export function normalizeForRuleBuilder(rule: RuleNode): RuleNode {
  const draft = cloneRule(rule);
  let root: RuleNode;

  const rootOperator =
  draft.params?.operator === "ALL" ||
  draft.params?.operator === "EXCLUDE"
    ? draft.params?.operator
    : "ANY";

  if (
    draft.type === "GROUP" &&
    (draft.params?.operator === "ANY" ||
      draft.params?.operator === "ALL" ||
      draft.params?.operator === "EXCLUDE")
  ) {
    root = {
      ...draft,
      params: {
        ...draft.params,
        operator: rootOperator,
        role: draft.params?.role ?? "RULE",
        sticky: true,
      },
      children: draft.children ?? [],
    };
  } else {
    root = createRuleRoot([draft], rootOperator);
  }

  const scenarios =
    root.children && root.children.length > 0
      ? root.children.map((child, index) => ensureScenario(child, index))
      : [createScenario(0)];

  return createRuleRoot(scenarios, rootOperator);
}

export function addScenario(rule: RuleNode): RuleNode {
  const root = normalizeForRuleBuilder(rule);
  const children = root.children ?? [];
  const next = createScenario(children.length);
  return createRuleRoot([...children, next], root.params?.operator ?? "ANY");
}

export function removeScenario(rule: RuleNode, index: number): RuleNode {
  const root = normalizeForRuleBuilder(rule);
  const children = root.children ?? [];
  if (children.length <= 1) {
    return root;
  }
  const nextChildren = children.filter((_, idx) => idx !== index);
  return createRuleRoot(
    nextChildren.map((child, idx) => ensureScenario(child, idx)),
    root.params?.operator ?? "ANY"
  );
}
