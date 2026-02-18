import { describe, expect, it } from "vitest";
import { formatExpressionTree } from "./format-expression-tree";
import type { UiExpressionNode } from "./types";

function term(id: string): UiExpressionNode {
  return {
    id,
    type: "TERM_SET",
    terms: [{ source: "CONCEPT", conceptId: id, conceptName: id, includeDescendants: false }],
    matchMode: "ANY",
  };
}

describe("formatExpressionTree", () => {
  it("flattens nested LOGIC with same operator", () => {
    const root: UiExpressionNode = {
      id: "root",
      type: "LOGIC",
      operator: "AND",
      children: [
        term("a"),
        {
          id: "inner",
          type: "LOGIC",
          operator: "AND",
          children: [term("b"), term("c")],
        },
      ],
    };

    const next = formatExpressionTree(root);
    expect(next?.type).toBe("LOGIC");
    if (!next || next.type !== "LOGIC") return;
    expect(next.children.map((child) => child.id)).toEqual(["a", "b", "c"]);
  });

  it("keeps root LOGIC even with one child", () => {
    const root: UiExpressionNode = {
      id: "root",
      type: "LOGIC",
      operator: "ANY",
      children: [term("a")],
    };
    const next = formatExpressionTree(root);
    expect(next?.type).toBe("LOGIC");
    if (!next || next.type !== "LOGIC") return;
    expect(next.children.length).toBe(1);
    expect(next.children[0]?.type).toBe("TERM_SET");
  });

  it("collapses non-root single-child LOGIC", () => {
    const root: UiExpressionNode = {
      id: "root",
      type: "LOGIC",
      operator: "ANY",
      children: [
        {
          id: "inner",
          type: "LOGIC",
          operator: "ANY",
          children: [term("a")],
        },
      ],
    };
    const next = formatExpressionTree(root);
    expect(next?.type).toBe("LOGIC");
    if (!next || next.type !== "LOGIC") return;
    expect(next.children[0]?.type).toBe("TERM_SET");
  });

  it("dedupes identical TERM_SET under same parent", () => {
    const t1 = term("a");
    const t2 = {
      ...term("a"),
      id: "a2",
    };
    const root: UiExpressionNode = {
      id: "root",
      type: "LOGIC",
      operator: "OR",
      children: [t1, t2, term("b")],
    };
    const next = formatExpressionTree(root);
    expect(next?.type).toBe("LOGIC");
    if (!next || next.type !== "LOGIC") return;
    expect(next.children.length).toBe(2);
  });
});
