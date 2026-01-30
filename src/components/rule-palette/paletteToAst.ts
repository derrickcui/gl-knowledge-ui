import { RuleNode } from "../rule-builder/astTypes";
import { BusinessOperatorId } from "./paletteDefinition";

function cloneNode<T>(node: T): T {
  return JSON.parse(JSON.stringify(node));
}

function wrapForLocation(node: RuleNode, location: string) {
  if (location === "TITLE") {
    return {
      type: "FIELD_CONDITION",
      params: { field: "TITLE" },
      children: [node],
    } as RuleNode;
  }
  if (location === "PARAGRAPH") {
    return {
      type: "PROXIMITY",
      params: { mode: "PARAGRAPH" },
      children: [node],
    } as RuleNode;
  }
  if (location === "SENTENCE") {
    return {
      type: "PROXIMITY",
      params: { mode: "SENTENCE" },
      children: [node],
    } as RuleNode;
  }
  return node;
}

function applyLocations(baseNode: RuleNode, payload?: any) {
  const location = payload?.location;
  const locations: string[] = [];
  if (location?.inBody) locations.push("BODY");
  if (location?.inTitle) locations.push("TITLE");
  if (location?.inParagraph) locations.push("PARAGRAPH");
  if (location?.inSentence) locations.push("SENTENCE");

  if (locations.length === 0 || locations.includes("BODY")) {
    if (locations.length <= 1) return baseNode;
  }

  if (locations.length <= 1) {
    return wrapForLocation(baseNode, locations[0]);
  }

  const children = locations.map((loc) =>
    wrapForLocation(cloneNode(baseNode), loc)
  );

  return {
    type: "GROUP",
    params: { operator: "ANY" },
    children,
  } as RuleNode;
}

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
      if (Array.isArray(payload?.conceptIds) && payload.conceptIds.length > 1) {
        const children = payload.conceptIds.map(
          (conceptId: string, index: number) => ({
            type: "CONCEPT_MATCH",
            params: {
              conceptId,
              conceptName: payload?.conceptNames?.[index],
              relation: "SELF",
            },
          })
        );
        const grouped: RuleNode = {
          type: "GROUP",
          params: { operator: "ANY" },
          children,
        };
        return { node: applyLocations(grouped, payload) };
      }
      const conceptNode: RuleNode = {
        type: "CONCEPT_MATCH",
        params: {
          conceptId: payload?.conceptId ?? payload?.conceptIds?.[0],
          conceptName: payload?.conceptName ?? payload?.conceptNames?.[0],
          relation: payload?.relation ?? "DESCENDANT",
        },
      };
      return { node: applyLocations(conceptNode, payload) };

    case "what.topicRef":
      const topicNode: RuleNode = {
        type: "TOPIC_REF",
        params: {
          topicId: payload?.topicId,
          topicName: payload?.topicName,
          topicStatus: payload?.topicStatus,
          topicVersion: payload?.topicVersion,
          useOriginalRule: payload?.useOriginalRule,
        },
      };
      return {
        node: payload?.useOriginalRule
          ? topicNode
          : payload?.location
          ? applyLocations(topicNode, payload)
          : topicNode,
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
          params: { operator: "AND" },
          children: [],
        },
      };

    case "how.any":
      return {
        root: {
          type: "GROUP",
          params: { operator: "OR" },
          children: [],
        },
      };

    case "how.exclude":
      return {
        root: {
          type: "GROUP",
          params: { operator: "EXCLUDE" },
          children: [],
        },
      };

    case "score.atLeast":
    case "score.minCount":
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
