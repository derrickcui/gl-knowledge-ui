import { describe, expect, it } from "vitest";
import { detectProximitySuggestion } from "./suggestion-engine";
import type { UiExpressionNode } from "./types";

function term(id: string): UiExpressionNode {
  return {
    id,
    type: "TERM_SET",
    terms: [{ source: "CONCEPT", conceptId: id, conceptName: id, includeDescendants: false }],
    matchMode: "ANY",
  };
}

describe("detectProximitySuggestion", () => {
  it("returns suggestion for LOGIC with >=2 term children and no relation node", () => {
    const root: UiExpressionNode = {
      id: "root",
      type: "LOGIC",
      operator: "AND",
      children: [term("a"), term("b"), term("c")],
    };
    const suggestion = detectProximitySuggestion(root);
    expect(suggestion).not.toBeNull();
    expect(suggestion?.logicNodeId).toBe("root");
    expect(suggestion?.termNodeIds).toEqual(["a", "b"]);
  });

  it("returns null when relation node already exists", () => {
    const root: UiExpressionNode = {
      id: "root",
      type: "LOGIC",
      operator: "AND",
      children: [
        term("a"),
        {
          id: "r1",
          type: "POSITION_RELATION",
          mode: "PROXIMITY",
          relation: "NEAR",
          ordered: false,
          distance: 5,
          children: [
            term("b") as Extract<UiExpressionNode, { type: "TERM_SET" }>,
            term("c") as Extract<UiExpressionNode, { type: "TERM_SET" }>,
          ],
        },
      ],
    };
    const suggestion = detectProximitySuggestion(root);
    expect(suggestion).toBeNull();
  });
});
