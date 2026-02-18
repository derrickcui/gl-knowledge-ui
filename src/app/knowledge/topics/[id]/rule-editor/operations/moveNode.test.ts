import { describe, expect, it } from "vitest";
import type { UiCapabilityViewModel, UiExpressionNode } from "../types";
import { moveNode } from "./moveNode";

const capability: UiCapabilityViewModel = {
  semantic: {
    allowModes: ["ALL", "ANY", "ACCRUE", "LOGSUM"],
    allowThreshold: true,
    allowWeighted: true,
    allowNested: true,
  },
  structure: {
    allowRelation: ["NONE", "NEAR", "SENTENCE", "PARAGRAPH", "ORDER"],
    allowOrder: true,
    allowDistance: true,
  },
  where: {
    allowFields: ["CONTENT", "TITLE", "COLUMN"],
    allowWhen: true,
  },
  advanced: {
    allowTopicRef: true,
    allowExcludeGroup: false,
    allowScore: true,
    allowExplainOverride: false,
    allowNot: true,
  },
};

function term(id: string): UiExpressionNode {
  return {
    id,
    type: "TERM_SET",
    terms: [{ source: "CONCEPT", conceptId: id, conceptName: id, includeDescendants: false }],
    matchMode: "ANY",
  };
}

describe("moveNode", () => {
  it("moves node inside same parent by index", () => {
    const root: UiExpressionNode = {
      id: "root",
      type: "LOGIC",
      operator: "AND",
      children: [term("a"), term("b"), term("c")],
    };
    const next = moveNode(root, "a", "root", 2, capability);
    if (next.type !== "LOGIC") return;
    expect(next.children.map((item) => item.id)).toEqual(["b", "c", "a"]);
  });

  it("rejects illegal target parent by matrix", () => {
    const root: UiExpressionNode = {
      id: "root",
      type: "LOGIC",
      operator: "AND",
      children: [
        {
          id: "prox",
          type: "POSITION_RELATION",
          mode: "PROXIMITY",
          relation: "NEAR",
          distance: 3,
          ordered: false,
          children: [term("x"), term("y")],
        },
        term("a"),
      ],
    };
    const next = moveNode(root, "prox", "a", 0, capability);
    expect(next).toEqual(root);
  });
});
