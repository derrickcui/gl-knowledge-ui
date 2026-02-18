import { describe, expect, it } from "vitest";
import type { UiCapabilityViewModel, UiExpressionNode } from "../types";
import { validateTreeByMatrix } from "./validateTree";

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

describe("validateTreeByMatrix", () => {
  it("passes a legal nested expression tree", () => {
    const root: UiExpressionNode = {
      id: "r",
      type: "LOGIC",
      operator: "ANY",
      children: [
        {
          id: "f",
          type: "FIELD",
          field: "TITLE",
          child: {
            id: "l2",
            type: "LOGIC",
            operator: "AND",
            children: [term("a"), term("b")],
          },
        },
        term("c"),
      ],
    };
    expect(validateTreeByMatrix(root, capability)).toEqual([]);
  });

  it("rejects illegal parent-child edge", () => {
    const root: UiExpressionNode = {
      id: "r",
      type: "PROXIMITY",
      relation: "NEAR",
      ordered: false,
      distance: 3,
      children: [
        {
          id: "bad-logic",
          type: "LOGIC",
          operator: "AND",
          children: [term("a"), term("b")],
        },
        term("c"),
      ],
    };
    const issues = validateTreeByMatrix(root, capability);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]?.message).toContain("PROXIMITY 不能包含 LOGIC");
  });

  it("rejects PROXIMITY/POSITION_RELATION with more than 5 children", () => {
    const root: UiExpressionNode = {
      id: "r2",
      type: "POSITION_RELATION",
      mode: "PROXIMITY",
      relation: "NEAR",
      ordered: false,
      distance: 3,
      children: [term("a"), term("b"), term("c"), term("d"), term("e"), term("f")] as any,
    };
    const issues = validateTreeByMatrix(root, capability);
    expect(issues.some((item) => item.message.includes("最多允许 5"))).toBe(true);
  });
});
