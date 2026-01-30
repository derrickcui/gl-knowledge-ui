import { ConceptConditionDraft } from "@/components/glossary/conceptConditionDraft";
import { RuleNode } from "./astTypes";
import { createNodeId } from "./nodeId";

function cloneNode<T>(node: T): T {
  return JSON.parse(JSON.stringify(node));
}

function wrapForLocation(node: RuleNode, location: string) {
  if (location === "TITLE") {
    return {
      type: "FIELD_CONDITION",
      params: { field: "TITLE" },
      children: [node],
      id: node.id,
      explain: node.explain,
    } as RuleNode;
  }
  if (location === "PARAGRAPH") {
    return {
      type: "PROXIMITY",
      params: { mode: "PARAGRAPH" },
      children: [node],
      id: node.id,
      explain: node.explain,
    } as RuleNode;
  }
  if (location === "SENTENCE") {
    return {
      type: "PROXIMITY",
      params: { mode: "SENTENCE" },
      children: [node],
      id: node.id,
      explain: node.explain,
    } as RuleNode;
  }
  return node;
}

function stripConditionMeta(node: RuleNode): RuleNode {
  const clone = cloneNode(node);
  delete clone.id;
  delete clone.explain;
  return clone;
}

function applyLocations(baseNode: RuleNode, draft: ConceptConditionDraft) {
  const locations: string[] = [];
  if (draft.location.inBody) locations.push("BODY");
  if (draft.location.inTitle) locations.push("TITLE");
  if (draft.location.inParagraph) locations.push("PARAGRAPH");
  if (draft.location.inSentence) locations.push("SENTENCE");

  if (locations.length <= 1) {
    if (locations.length === 0 || locations[0] === "BODY") {
      return baseNode;
    }
    return wrapForLocation(baseNode, locations[0]);
  }

  const base = stripConditionMeta(baseNode);
  const children = locations.map((loc) => {
    if (loc === "BODY") return cloneNode(base);
    return wrapForLocation(cloneNode(base), loc);
  });

  return {
    type: "GROUP",
    params: { operator: "ANY" },
    children,
    id: baseNode.id,
    explain: baseNode.explain,
  } as RuleNode;
}

export function buildConceptAstFromDraft(
  draft: ConceptConditionDraft
): RuleNode {
  const explain = {
    mode: "AUTO",
    text: draft.explainPreview,
  };
  const conditionId = createNodeId();

  if (
    draft.scope.mode === "PARTIAL_DESCENDANT" &&
    draft.scope.selectedChildIds &&
    draft.scope.selectedChildIds.length > 0
  ) {
    const nameMap = new Map<string, string>();
    draft.scope.selectedChildIds.forEach((id, index) => {
      const name = draft.scope.selectedChildNames?.[index];
      if (name) nameMap.set(id, name);
    });
    const children = [
      {
        id: createNodeId(),
        type: "CONCEPT_MATCH",
        params: {
          conceptId: draft.concept.id,
          conceptName: draft.concept.name,
          relation: "SELF",
        },
      },
      ...draft.scope.selectedChildIds.map((conceptId) => ({
        id: createNodeId(),
        type: "CONCEPT_MATCH",
        params: {
          conceptId,
          conceptName: nameMap.get(conceptId),
          relation: "SELF",
        },
      })),
    ];
    const grouped: RuleNode = {
      id: conditionId,
      type: "GROUP",
      params: { operator: "ANY" },
      children,
      explain,
    };
    return applyLocations(grouped, draft);
  }

  const conceptNode: RuleNode = {
    id: conditionId,
    type: "CONCEPT_MATCH",
    params: {
      conceptId: draft.concept.id,
      conceptName: draft.concept.name,
      relation: draft.scope.mode === "SELF" ? "SELF" : "DESCENDANT",
    },
    explain,
  };

  return applyLocations(conceptNode, draft);
}
