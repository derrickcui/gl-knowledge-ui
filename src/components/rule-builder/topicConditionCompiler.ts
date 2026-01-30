import { RuleNode } from "./astTypes";
import { createNodeId } from "./nodeId";
import { TopicConditionDraft } from "@/components/topics/topicConditionDraft";

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

function applyLocations(baseNode: RuleNode, draft: TopicConditionDraft) {
  const location = draft.location;
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

  const base = stripConditionMeta(baseNode);
  const children = locations.map((loc) =>
    wrapForLocation(cloneNode(base), loc)
  );

  return {
    type: "GROUP",
    params: { operator: "ANY" },
    children,
    id: baseNode.id,
    explain: baseNode.explain,
  } as RuleNode;
}

export function buildTopicAstFromDraft(
  draft: TopicConditionDraft
): RuleNode {
  const explain = {
    mode: "AUTO",
    text: draft.explainPreview,
  };
  const conditionId = createNodeId();
  const topicNode: RuleNode = {
    id: conditionId,
    type: "TOPIC_REF",
    params: {
      topicId: draft.topic.id,
      topicName: draft.topic.name,
      topicStatus: draft.topic.status,
      topicVersion: draft.topic.version,
      useOriginalRule: draft.useOriginalRule,
    },
    explain,
  };

  if (draft.useOriginalRule) return topicNode;
  return applyLocations(topicNode, draft);
}
