import { describe, expect, it } from "vitest";
import { normalizeExpressionTree } from "./expression-normalizer";
import type { UiExpressionNode } from "./types";

function term(id: string): UiExpressionNode {
  return {
    id,
    type: "TERM_SET",
    terms: [{ source: "CONCEPT", conceptId: id, conceptName: id, includeDescendants: false }],
    matchMode: "ANY",
  };
}

describe("normalizeExpressionTree", () => {
  it("hoists same-field wrappers from PROXIMITY", () => {
    const root: UiExpressionNode = {
      id: "root",
      type: "LOGIC",
      operator: "ANY",
      children: [
        {
          id: "p1",
          type: "PROXIMITY",
          relation: "NEAR",
          ordered: false,
          distance: 3,
          children: [
            { id: "f1", type: "FIELD", field: "TITLE", child: term("a") },
            { id: "f2", type: "FIELD", field: "TITLE", child: term("b") },
          ],
        },
      ],
    };

    const result = normalizeExpressionTree(root);
    expect(result.issues).toEqual([]);
    expect(result.root?.type).toBe("FIELD");
    if (!result.root || result.root.type !== "FIELD") return;
    expect(result.root.field).toBe("TITLE");
    expect(result.root.child?.type).toBe("LOGIC");
    const logic = result.root.child;
    if (!logic || logic.type !== "LOGIC") return;
    expect(logic.children[0]?.type).toBe("PROXIMITY");
  });

  it("reports mixed FIELD in PROXIMITY", () => {
    const root: UiExpressionNode = {
      id: "root",
      type: "FIELD",
      field: "CONTENT",
      child: {
        id: "p1",
        type: "PROXIMITY",
        relation: "NEAR",
        ordered: false,
        distance: 3,
        children: [
          { id: "f1", type: "FIELD", field: "TITLE", child: term("a") },
          { id: "f2", type: "FIELD", field: "CONTENT", child: term("b") },
        ],
      },
    };
    const result = normalizeExpressionTree(root);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("reports FIELD containing FIELD", () => {
    const root: UiExpressionNode = {
      id: "root",
      type: "FIELD",
      field: "CONTENT",
      child: {
        id: "f2",
        type: "FIELD",
        field: "TITLE",
        child: term("a"),
      },
    };
    const result = normalizeExpressionTree(root);
    expect(result.issues.some((item) => item.message.includes("FIELD"))).toBe(true);
  });

  it("hoists same-field wrappers from LOGIC", () => {
    const root: UiExpressionNode = {
      id: "root",
      type: "LOGIC",
      operator: "ANY",
      children: [
        { id: "f1", type: "FIELD", field: "TITLE", child: term("a") },
        { id: "f2", type: "FIELD", field: "TITLE", child: term("b") },
      ],
    };
    const result = normalizeExpressionTree(root);
    expect(result.issues).toEqual([]);
    expect(result.root?.type).toBe("FIELD");
    if (!result.root || result.root.type !== "FIELD") return;
    expect(result.root.field).toBe("TITLE");
    expect(result.root.child?.type).toBe("LOGIC");
  });
});
