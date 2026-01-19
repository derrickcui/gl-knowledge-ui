import { RuleNode } from "../rule-builder/astTypes";
import { BusinessOperatorId } from "./paletteDefinition";

export function operatorToAst(
  operator: BusinessOperatorId,
  payload?: any
): {
  node?: RuleNode;
  wrap?: (child: RuleNode) => RuleNode;
  root?: RuleNode;
} {
  switch (operator) {
    case "what.concept":
      return {
        node: {
          type: "CONCEPT_MATCH",
          params: {
            conceptId: payload?.conceptId,
            conceptName: payload?.conceptName,
            relation: payload?.relation ?? "DESCENDANT",
          },
        },
      };

    case "what.topicRef":
      return {
        node: {
          type: "TOPIC_REF",
          params: {
            topicId: payload?.topicId,
            topicName: payload?.topicName,
          },
        },
      };

    case "where.title":
      return {
        wrap: (child) => ({
          type: "FIELD_CONDITION",
          params: { field: "TITLE" },
          children: [child],
        }),
      };

    case "where.paragraph":
      return {
        wrap: (child) => ({
          type: "PROXIMITY",
          params: { mode: "PARAGRAPH" },
          children: [child],
        }),
      };

    case "where.sentence":
      return {
        wrap: (child) => ({
          type: "PROXIMITY",
          params: { mode: "SENTENCE" },
          children: [child],
        }),
      };

    case "how.all":
      return {
        root: {
          type: "GROUP",
          params: { operator: "ALL" },
          children: [],
        },
      };

    case "how.any":
      return {
        root: {
          type: "GROUP",
          params: { operator: "ANY" },
          children: [],
        },
      };

    case "how.exclude":
      return {
        wrap: (child) => ({
          type: "LOGIC",
          params: { operator: "NOT" },
          children: [child],
        }),
      };

    case "score.atLeast":
      return {
        root: {
          type: "ACCUMULATE",
          params: { threshold: payload?.threshold ?? 2 },
          children: [],
        },
      };

    case "score.weighted":
      return {
        root: {
          type: "ACCUMULATE",
          params: { mode: "WEIGHTED" },
          children: [],
        },
      };

    default:
      return {};
  }
}
