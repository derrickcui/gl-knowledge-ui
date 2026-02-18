import { describe, expect, it } from "vitest";
import type { UiCapabilityViewModel, UiExpressionNode } from "../types";
import { wrapNodesInField } from "./wrapNodes";

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

describe("wrapNodesInField", () => {
  it("wraps selected siblings into FIELD under the same LOGIC parent", () => {
    const root: UiExpressionNode = {
      id: "root",
      type: "LOGIC",
      operator: "AND",
      children: [term("a"), term("b"), term("c")],
    };

    const next = wrapNodesInField(root, "root", ["a", "b"], capability);
    expect(next.type).toBe("LOGIC");
    if (next.type !== "LOGIC") return;
    expect(next.children.length).toBe(2);
    expect(next.children[0]?.type).toBe("FIELD");
    const wrapped = next.children[0];
    if (!wrapped || wrapped.type !== "FIELD") return;
    expect(wrapped.child?.type).toBe("LOGIC");
  });

  it("keeps tree unchanged when parent does not exist", () => {
    const root: UiExpressionNode = {
      id: "root",
      type: "LOGIC",
      operator: "AND",
      children: [term("a"), term("b")],
    };
    const next = wrapNodesInField(root, "missing", ["a", "b"], capability);
    expect(next).toEqual(root);
  });
});

