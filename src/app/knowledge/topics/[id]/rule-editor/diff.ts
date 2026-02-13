import type { UiExpressionNode } from "./types";

export interface NodeDiffSummary {
  added: number;
  removed: number;
  changed: number;
}

export type NodeDiffStatus = "added" | "changed";

export interface NodeDiffDetail extends NodeDiffSummary {
  statusById: Record<string, NodeDiffStatus>;
  removedNodes: Array<{ id: string; signature: string }>;
}

export function buildNodeDiff(
  before: UiExpressionNode | null,
  after: UiExpressionNode | null
): NodeDiffSummary {
  const detail = buildNodeDiffDetail(before, after);
  return {
    added: detail.added,
    removed: detail.removed,
    changed: detail.changed,
  };
}

export function buildNodeDiffDetail(
  before: UiExpressionNode | null,
  after: UiExpressionNode | null
): NodeDiffDetail {
  const prev = flatten(before);
  const next = flatten(after);

  let added = 0;
  let removed = 0;
  let changed = 0;
  const statusById: Record<string, NodeDiffStatus> = {};
  const removedNodes: Array<{ id: string; signature: string }> = [];

  for (const id of next.keys()) {
    if (!prev.has(id)) {
      added += 1;
      statusById[id] = "added";
      continue;
    }
    if (prev.get(id) !== next.get(id)) {
      changed += 1;
      statusById[id] = "changed";
    }
  }

  for (const id of prev.keys()) {
    if (!next.has(id)) {
      removed += 1;
      removedNodes.push({ id, signature: prev.get(id) ?? "" });
    }
  }

  return { added, removed, changed, statusById, removedNodes };
}

function flatten(root: UiExpressionNode | null): Map<string, string> {
  const map = new Map<string, string>();
  if (!root) return map;
  visit(root, map);
  return map;
}

function visit(node: UiExpressionNode, map: Map<string, string>) {
  map.set(node.id, signature(node));
  switch (node.type) {
    case "LOGIC":
    case "PROXIMITY":
      node.children.forEach((child) => visit(child, map));
      return;
    case "FIELD":
    case "NOT":
    case "SCORE":
      if (node.child) visit(node.child, map);
      return;
    case "TERM_SET":
    case "TOPIC_REF":
      return;
  }
}

function signature(node: UiExpressionNode): string {
  switch (node.type) {
    case "LOGIC":
      return `${node.type}:${node.operator}:${node.children.length}`;
    case "PROXIMITY":
      return `${node.type}:${node.relation}:${node.ordered}:${node.distance ?? ""}:${node.children.length}`;
    case "FIELD":
      return `${node.type}:${node.field}:${node.child?.id ?? ""}`;
    case "TERM_SET":
      return `${node.type}:${node.matchMode}:${node.terms.map((item) => item.conceptId).join(",")}`;
    case "NOT":
      return `${node.type}:${node.child?.id ?? ""}`;
    case "SCORE":
      return `${node.type}:${node.weight}:${node.child?.id ?? ""}`;
    case "TOPIC_REF":
      return `${node.type}:${node.topicId}`;
  }
}

