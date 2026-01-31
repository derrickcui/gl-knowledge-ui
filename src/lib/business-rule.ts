import { RuleNode } from "@/components/rule-builder/astTypes";
import { buildConceptAstFromDraft } from "@/components/rule-builder/conceptConditionCompiler";
import { buildTopicAstFromDraft } from "@/components/rule-builder/topicConditionCompiler";

export type ExplainOverride = {
  mode: "AUTO" | "CUSTOM";
  text?: string;
};

export type BusinessRule = {
  groups: BusinessGroup[];
  logic?: "ALL" | "ANY" | "EXCLUDE";
};

export type BusinessGroup = {
  id: string;
  priority: number;
  explain?: ExplainOverride;
  conditions: BusinessCondition[];
  operator?: "AND" | "OR" | "ALL" | "ANY" | "EXCLUDE" | "ACCRUE" | "LOGSUM";
  score?: BusinessScore;
  mode?: "ACCRUE";
  threshold?: number;
};

export type BusinessScore =
  | {
      type: "AT_LEAST";
    }
  | {
      type: "WEIGHTED";
      mode?: "LOGSUM";
      threshold?: number;
      weights?: Record<string, number>;
    };

export type BusinessCondition =
  | {
      id: string;
      kind: "CONCEPT";
      negate?: boolean;
      explain?: ExplainOverride;
      payload: ConceptConditionPayload;
    }
  | {
      id: string;
      kind: "TOPIC_REF";
      negate?: boolean;
      explain?: ExplainOverride;
      payload: TopicConditionPayload;
    };

export type LocationPayload = {
  inBody: boolean;
  inTitle: boolean;
  inParagraph: boolean;
  inSentence: boolean;
};

export type ConceptConditionPayload = {
  conceptId: string;
  conceptName?: string;
  scope: "SELF" | "DESCENDANT" | "PARTIAL_DESCENDANT";
  selectedChildIds?: string[];
  selectedChildNames?: string[];
  location: LocationPayload;
};

export type TopicConditionPayload = {
  topicId: string;
  topicName?: string;
  topicStatus?: string;
  topicVersion?: string | number;
  location: LocationPayload;
  useOriginalRule?: boolean;
};

function defaultLocation(): LocationPayload {
  return {
    inBody: true,
    inTitle: false,
    inParagraph: false,
    inSentence: false,
  };
}

function emptyLocation(): LocationPayload {
  return {
    inBody: false,
    inTitle: false,
    inParagraph: false,
    inSentence: false,
  };
}

function buildConceptExplainFromPayload(
  payload: ConceptConditionPayload
) {
  const parts: string[] = [];
  if (payload.location.inBody) parts.push("\u6b63\u6587");
  if (payload.location.inTitle) parts.push("\u6807\u9898");
  if (payload.location.inParagraph)
    parts.push("\u540c\u4e00\u6bb5\u843d");
  if (payload.location.inSentence)
    parts.push("\u540c\u4e00\u53e5\u8bdd");
  const loc = parts.length
    ? `\u6587\u6863${parts.join(" / ")}`
    : "\u6587\u6863\u5185\u5bb9";
  const scope =
    payload.scope === "SELF"
      ? "\u4ec5\u8be5\u6982\u5ff5"
      : payload.scope === "DESCENDANT"
      ? "\u8be5\u6982\u5ff5\u53ca\u5176\u4e0b\u4f4d\u6982\u5ff5"
      : "\u8be5\u6982\u5ff5\u53ca\u9009\u4e2d\u4e0b\u4f4d\u6982\u5ff5";
  const name =
    payload.conceptName ??
    "\u6307\u5b9a\u6982\u5ff5";
  return `\u5f53\u3010${loc}\u3011\u4e2d\u63d0\u5230\u300c${name}\u300d\uff08${scope}\uff09\u65f6\uff0c\u8be5\u6761\u4ef6\u6210\u7acb\u3002`;
}

function buildTopicExplainFromPayload(
  payload: TopicConditionPayload
) {
  if (payload.useOriginalRule) {
    const name = payload.topicName ?? "\u6307\u5b9a\u4e3b\u9898";
    return `\u5f53\u4e3b\u9898\u300c${name}\u300d\u7684\u5b9a\u4e49\u89c4\u5219\u6210\u7acb\u65f6\uff0c\u8be5\u6761\u4ef6\u6210\u7acb\u3002`;
  }
  const parts: string[] = [];
  if (payload.location.inBody) parts.push("\u6b63\u6587");
  if (payload.location.inTitle) parts.push("\u6807\u9898");
  const loc = parts.length
    ? `\u6587\u6863${parts.join(" / ")}`
    : "\u6587\u6863\u5185\u5bb9";
  const name = payload.topicName ?? "\u6307\u5b9a\u4e3b\u9898";
  return `\u5f53\u3010${loc}\u3011\u4e2d\u7b26\u5408\u4e3b\u9898\u300c${name}\u300d\u65f6\uff0c\u8be5\u6761\u4ef6\u6210\u7acb\u3002`;
}

function extractConceptFromNode(node: RuleNode): {
  conceptId?: string;
  relation?: string;
  conceptName?: string;
  explain?: ExplainOverride;
} {
  if (node.type === "CONCEPT_MATCH") {
    return {
      conceptId: node.params?.conceptId,
      conceptName: node.params?.conceptName,
      relation: node.params?.relation,
      explain: node.explain,
    };
  }
  return {};
}

function extractTopicFromNode(node: RuleNode): {
  topicId?: string;
  topicName?: string;
  topicStatus?: string;
  topicVersion?: string | number;
  explain?: ExplainOverride;
} {
  if (node.type === "TOPIC_REF") {
    return {
      topicId: node.params?.topicId,
      topicName: node.params?.topicName,
      topicStatus: node.params?.topicStatus,
      topicVersion: node.params?.topicVersion,
      explain: node.explain,
    };
  }
  return {};
}

function unwrapLocations(node: RuleNode): {
  base: RuleNode;
  location: LocationPayload;
} {
  if (node.type === "FIELD_CONDITION") {
    const child = node.children?.[0];
    if (!child) return { base: node, location: defaultLocation() };
    if (node.params?.field === "TITLE") {
      const inner = unwrapLocations(child);
      return {
        base: inner.base,
        location: { ...inner.location, inTitle: true, inBody: false },
      };
    }
  }
  if (node.type === "PROXIMITY") {
    const child = node.children?.[0];
    if (!child) return { base: node, location: defaultLocation() };
    const inner = unwrapLocations(child);
    if (node.params?.mode === "PARAGRAPH") {
      return {
        base: inner.base,
        location: { ...inner.location, inParagraph: true, inBody: false },
      };
    }
    if (node.params?.mode === "SENTENCE") {
      return {
        base: inner.base,
        location: { ...inner.location, inSentence: true, inBody: false },
      };
    }
  }
  return { base: node, location: defaultLocation() };
}

function mergeLocations(left: LocationPayload, right: LocationPayload) {
  return {
    inBody: left.inBody || right.inBody,
    inTitle: left.inTitle || right.inTitle,
    inParagraph: left.inParagraph || right.inParagraph,
    inSentence: left.inSentence || right.inSentence,
  };
}

function isSameConcept(
  a?: string,
  b?: string,
  relA?: string,
  relB?: string
) {
  return a && b && a === b && relA === relB;
}

function isSameTopic(a?: string, b?: string) {
  return a && b && a === b;
}

function mapRelationToScope(rel?: string): ConceptConditionPayload["scope"] {
  if (rel === "SELF") return "SELF";
  return "DESCENDANT";
}

function normalizeScenarioOperator(operator?: string) {
  if (operator === "ALL") return "AND";
  if (operator === "ANY") return "OR";
  return operator;
}

type ImportanceLevel = "HIGH" | "NORMAL" | "LOW";

function normalizeImportance(raw: unknown): ImportanceLevel {
  if (raw === "HIGH" || raw === "LOW") return raw;
  return "NORMAL";
}

function importanceToWeight(level: ImportanceLevel): number {
  if (level === "HIGH") return 2.0;
  if (level === "LOW") return 0.5;
  return 1.0;
}

function weightToImportance(weight?: number): ImportanceLevel {
  if (weight === undefined || weight === null) return "NORMAL";
  if (weight >= 1.5) return "HIGH";
  if (weight <= 0.75) return "LOW";
  return "NORMAL";
}

function hasTopicRef(node: RuleNode): boolean {
  if (node.type === "TOPIC_REF") return true;
  return (node.children ?? []).some((child) => hasTopicRef(child));
}

function buildConceptCondition(
  node: RuleNode,
  fallbackId: string
): BusinessCondition | null {
  const negatedFlag = !!node.params?.negated;
  if (node.type === "LOGIC" && node.params?.operator === "NOT") {
    const child = node.children?.[0];
    if (!child) return null;
    const inner = buildConceptCondition(child, fallbackId);
    if (!inner) return null;
    return {
      ...inner,
      negate: inner.negate || negatedFlag || true,
      explain: inner.explain ?? node.explain,
    };
  }
  if (node.type === "GROUP" && node.params?.operator === "ANY") {
    const children = node.children ?? [];
    if (!children.length) return null;

    const childResults = children.map((child) => {
      const unwrapped = unwrapLocations(child);
      const concept = extractConceptFromNode(unwrapped.base);
      return {
        child,
        base: unwrapped.base,
        location: unwrapped.location,
        conceptId: concept.conceptId,
        relation: concept.relation,
        conceptName: concept.conceptName,
      };
    });

    const first = childResults[0];
    const sameConcept = childResults.every((c) =>
      isSameConcept(first.conceptId, c.conceptId, first.relation, c.relation)
    );

    if (sameConcept && first.conceptId) {
      const location = childResults.reduce(
        (acc, cur) => mergeLocations(acc, cur.location),
        first.location
      );
      return {
        id: node.id ?? fallbackId,
        kind: "CONCEPT",
        negate: negatedFlag,
        explain: node.explain,
        payload: {
          conceptId: first.conceptId,
          conceptName: first.conceptName,
          scope: mapRelationToScope(first.relation),
          location,
        },
      };
    }

    const allSelf = childResults.every(
      (c) => c.relation === "SELF" && c.conceptId
    );
    if (allSelf) {
      const location = childResults.reduce(
        (acc, cur) => mergeLocations(acc, cur.location),
        childResults[0].location
      );
      const base = childResults[0];
      const selectedChildIds = childResults
        .slice(1)
        .map((c) => c.conceptId!)
        .filter(Boolean);
      const selectedChildNames = childResults
        .slice(1)
        .map((c) => c.conceptName)
        .filter(Boolean) as string[];
      return {
        id: node.id ?? fallbackId,
        kind: "CONCEPT",
        negate: negatedFlag,
        explain: node.explain,
        payload: {
          conceptId: base.conceptId ?? "",
          conceptName: base.conceptName,
          scope: "PARTIAL_DESCENDANT",
          selectedChildIds,
          selectedChildNames,
          location,
        },
      };
    }

    return null;
  }

  const unwrapped = unwrapLocations(node);
  const concept = extractConceptFromNode(unwrapped.base);
  if (!concept.conceptId) return null;

  return {
    id: node.id ?? fallbackId,
    kind: "CONCEPT",
    negate: negatedFlag,
    explain: node.explain,
    payload: {
      conceptId: concept.conceptId,
      conceptName: concept.conceptName,
      scope: mapRelationToScope(concept.relation),
      location: unwrapped.location,
    },
  };
}

function buildTopicCondition(
  node: RuleNode,
  fallbackId: string
): BusinessCondition | null {
  const negatedFlag = !!node.params?.negated;
  if (node.type === "LOGIC" && node.params?.operator === "NOT") {
    const child = node.children?.[0];
    if (!child) return null;
    const inner = buildTopicCondition(child, fallbackId);
    if (!inner) return null;
    return {
      ...inner,
      negate: inner.negate || negatedFlag || true,
      explain: inner.explain ?? node.explain,
    };
  }

  if (node.type === "GROUP" && node.params?.operator === "ANY") {
    const children = node.children ?? [];
    if (!children.length) return null;

    const childResults = children.map((child) => {
      const unwrapped = unwrapLocations(child);
      const topic = extractTopicFromNode(unwrapped.base);
      return {
        base: unwrapped.base,
        location: unwrapped.location,
        topicId: topic.topicId,
        topicName: topic.topicName,
        topicStatus: topic.topicStatus,
        topicVersion: topic.topicVersion,
      };
    });

    const first = childResults[0];
    const sameTopic = childResults.every((c) =>
      isSameTopic(first.topicId, c.topicId)
    );

    if (sameTopic && first.topicId) {
      const location = childResults.reduce(
        (acc, cur) => mergeLocations(acc, cur.location),
        first.location
      );
      return {
        id: node.id ?? fallbackId,
        kind: "TOPIC_REF",
        negate: negatedFlag,
        explain: node.explain,
        payload: {
          topicId: first.topicId,
          topicName: first.topicName,
          topicStatus: first.topicStatus,
          topicVersion: first.topicVersion,
          location,
          useOriginalRule: false,
        },
      };
    }
  }

  const unwrapped = unwrapLocations(node);
  const topic = extractTopicFromNode(unwrapped.base);
  if (!topic.topicId) return null;
  const useOriginalRule =
    node.params?.useOriginalRule === true || node.type === "TOPIC_REF";
  const location = useOriginalRule ? emptyLocation() : unwrapped.location;

  return {
    id: node.id ?? fallbackId,
    kind: "TOPIC_REF",
    negate: negatedFlag,
    explain: node.explain,
    payload: {
      topicId: topic.topicId,
      topicName: topic.topicName,
      topicStatus: topic.topicStatus,
      topicVersion: topic.topicVersion,
      location,
      useOriginalRule,
    },
  };
}

export function ruleNodeToBusinessRule(root: RuleNode): BusinessRule {
  const rootOperator =
    root.type === "GROUP" && root.params?.role === "RULE"
      ? root.params?.operator
      : undefined;
  const ruleLogic =
    rootOperator === "ALL"
      ? "ALL"
      : rootOperator === "EXCLUDE"
      ? "EXCLUDE"
      : rootOperator === "ANY"
      ? "ANY"
      : undefined;
  const groups =
    root.type === "GROUP" && root.params?.role === "RULE"
      ? root.children ?? []
      : [root];

  return {
    logic: ruleLogic,
    groups: groups.map((group, groupIndex) => {
      const conditions =
        group.children?.map((child, index) => {
          const fallbackId = `${group.id ?? groupIndex}-${index}`;
          return (
            buildTopicCondition(child, fallbackId) ??
            buildConceptCondition(child, fallbackId)
          );
        }) ?? [];

      return {
        id: group.id ?? `group-${groupIndex}`,
        priority: group.priority ?? 100,
        explain: group.explain,
        conditions: conditions.filter(Boolean) as BusinessCondition[],
        operator: (() => {
          const rawOperator = group.params?.operator;
          const legacyLogsum =
            rawOperator === "ACCRUE" && group.params?.mode === "LOGSUM";
          const isLogsum = rawOperator === "LOGSUM" || legacyLogsum;
          const isAccrue = rawOperator === "ACCRUE" && !legacyLogsum;
          if (isLogsum || isAccrue) return "AND";
          return normalizeScenarioOperator(rawOperator);
        })(),
        score: (() => {
          const rawOperator = group.params?.operator;
          const legacyLogsum =
            rawOperator === "ACCRUE" && group.params?.mode === "LOGSUM";
          const isLogsum = rawOperator === "LOGSUM" || legacyLogsum;
          const importanceActive =
            rawOperator === "LOGSUM" &&
            group.params?.importanceMode === "IMPORTANCE" &&
            !legacyLogsum &&
            !hasTopicRef(group) &&
            (group.children?.length ?? 0) >= 2;
          const weights = importanceActive
            ? (group.children ?? []).reduce<Record<string, number>>(
                (acc, child, index) => {
                  const fallbackId = `${group.id ?? groupIndex}-${index}`;
                  const conditionId = child.id ?? fallbackId;
                  const level = normalizeImportance(
                    child.params?.importance
                  );
                  acc[conditionId] = importanceToWeight(level);
                  return acc;
                },
                {}
              )
            : undefined;
          if (isLogsum) {
            return {
              type: "WEIGHTED",
              mode: "LOGSUM",
              threshold: group.params?.threshold,
              weights,
            } as BusinessScore;
          }
          if (rawOperator === "ACCRUE") {
            return {
              type: "AT_LEAST",
            } as BusinessScore;
          }
          return undefined;
        })(),
        mode: undefined,
        threshold: undefined,
      };
    }),
  };
}

export function businessRuleToRuleNode(rule: BusinessRule): RuleNode {
  const groups = rule.groups.map((group, index) => {
    const hasWeights =
      group.score?.type === "WEIGHTED" &&
      group.score.weights &&
      Object.keys(group.score.weights).length > 0;
    const scenarioOperator = (() => {
      if (group.score?.type === "AT_LEAST") return "ACCRUE";
      if (group.score?.type === "WEIGHTED" && group.score?.mode === "LOGSUM") {
        return "LOGSUM";
      }
      const legacyOperator =
        group.operator === "ACCRUE" && group.mode === "LOGSUM"
          ? "LOGSUM"
          : group.operator;
      return legacyOperator === "ALL"
        ? "AND"
        : legacyOperator === "ANY"
        ? "OR"
        : legacyOperator === "ACCRUE"
        ? "ACCRUE"
        : legacyOperator === "LOGSUM"
        ? "LOGSUM"
        : legacyOperator ?? "AND";
    })();
    const scenarioMode =
      scenarioOperator === "ACCRUE" ? group.mode ?? "ACCRUE" : undefined;
    const scenarioThreshold =
      scenarioOperator === "LOGSUM"
        ? group.score?.type === "WEIGHTED" &&
          group.score.mode === "LOGSUM"
          ? group.score.threshold ?? group.threshold ?? 2
          : group.threshold ?? 2
        : undefined;
    const children = group.conditions
      .map((condition) => {
        const importance = hasWeights
          ? weightToImportance(group.score?.weights?.[condition.id])
          : "NORMAL";
        if (condition.kind === "CONCEPT") {
          const payload = condition.payload;
          const fallbackExplain =
            condition.explain?.text ??
            buildConceptExplainFromPayload(payload);
          const draft = {
            concept: {
              id: payload.conceptId,
              name: payload.conceptName ?? "",
              hasChildren: false,
            },
            scope: {
              mode: payload.scope,
              selectedChildIds: payload.selectedChildIds ?? [],
              selectedChildNames: payload.selectedChildNames ?? [],
            },
            location: payload.location,
            explainPreview: fallbackExplain,
            validation: { valid: true },
          };
          let node = buildConceptAstFromDraft(draft);
          node.id = condition.id;
          if (condition.explain) {
            node.explain = condition.explain;
          } else if (!node.explain?.text) {
            node.explain = { mode: "AUTO", text: fallbackExplain };
          }
          if (
            node.type === "CONCEPT_MATCH" &&
            payload.conceptName &&
            !node.params?.conceptName
          ) {
            node.params = {
              ...node.params,
              conceptName: payload.conceptName,
            };
          }
          if (condition.negate) {
            node.params = {
              ...node.params,
              negated: true,
            };
          }
          if (importance !== "NORMAL") {
            node.params = {
              ...node.params,
              importance,
            };
          }
          if (
            payload.useOriginalRule &&
            node.type === "TOPIC_REF" &&
            node.params
          ) {
            node.params = {
              ...node.params,
              useOriginalRule: true,
            };
          }
          return node;
        }
        if (condition.kind === "TOPIC_REF") {
          const payload = condition.payload;
          const fallbackExplain =
            condition.explain?.text ??
            buildTopicExplainFromPayload(payload);
          let node: RuleNode;
          if (payload.useOriginalRule) {
            node = {
              type: "TOPIC_REF",
              params: {
                topicId: payload.topicId,
                topicName: payload.topicName,
                topicStatus: payload.topicStatus,
                topicVersion: payload.topicVersion,
                useOriginalRule: true,
              },
            };
          } else {
            const draft = {
              topic: {
                id: payload.topicId,
                name: payload.topicName ?? "",
                status: payload.topicStatus,
                version: payload.topicVersion,
              },
              location: payload.location,
              rangeMode:
                payload.location.inBody && payload.location.inTitle
                  ? "ALL"
                  : "LIMITED",
              explainPreview: fallbackExplain,
              validation: { valid: true },
            };
            node = buildTopicAstFromDraft(draft);
          }
          node.id = condition.id;
          if (condition.explain) {
            node.explain = condition.explain;
          } else if (!node.explain?.text) {
            node.explain = { mode: "AUTO", text: fallbackExplain };
          }
          if (condition.negate) {
            node.params = {
              ...node.params,
              negated: true,
            };
          }
          if (importance !== "NORMAL") {
            node.params = {
              ...node.params,
              importance,
            };
          }
          return node;
        }
        return null;
      })
      .filter(Boolean) as RuleNode[];

    return {
      id: group.id,
      type: "GROUP",
      params: {
        operator: scenarioOperator,
        mode: scenarioMode,
        threshold: scenarioThreshold,
        importanceMode: hasWeights ? "IMPORTANCE" : undefined,
        role: "SCENARIO",
        sticky: true,
        title: `\u5224\u65ad\u573a\u666f ${index + 1}`,
      },
      priority: group.priority ?? 100,
      explain: group.explain,
      children,
    } as RuleNode;
  });

  return {
    type: "GROUP",
    params: {
      operator: rule.logic ?? "ANY",
      role: "RULE",
      sticky: true,
    },
    children: groups,
  };
}
