import { describe, expect, it } from "vitest";
import { applyAutoFix } from "./auto-fix";
import type { UiExpressionNode } from "./types";
import type { ValidationIssue } from "./validation";

function term(id: string): UiExpressionNode {
  return {
    id,
    type: "TERM_SET",
    terms: [{ source: "CONCEPT", conceptId: id, conceptName: id, includeDescendants: false }],
    matchMode: "ANY",
  };
}

describe("applyAutoFix", () => {
  it("wraps STRUCTURE with FIELD for STRUCTURE_UNDER_FIELD issue", () => {
    const root: UiExpressionNode = {
      id: "root",
      type: "LOGIC",
      operator: "AND",
      children: [
        {
          id: "s1",
          type: "STRUCTURE",
          scope: "SENTENCE",
          child: {
            id: "l1",
            type: "LOGIC",
            operator: "AND",
            children: [term("a"), term("b")],
          },
        },
      ],
    };
    const issues: ValidationIssue[] = [
      { nodeId: "s1", message: "x", severity: "error", type: "STRUCTURE_UNDER_FIELD" },
    ];
    const fixed = applyAutoFix(root, issues);
    expect(fixed.fixed).toBe(true);
    expect(fixed.root.type).toBe("LOGIC");
    if (fixed.root.type !== "LOGIC") return;
    expect(fixed.root.children[0]?.type).toBe("FIELD");
  });

  it("downgrades LOGIC mode to ANY for MODE_NEED_TWO_CHILDREN issue", () => {
    const root: UiExpressionNode = {
      id: "root",
      type: "LOGIC",
      operator: "AT_LEAST",
      threshold: 2,
      children: [term("a")],
    };
    const issues: ValidationIssue[] = [
      { nodeId: "root", message: "x", severity: "error", type: "MODE_NEED_TWO_CHILDREN" },
    ];
    const fixed = applyAutoFix(root, issues);
    expect(fixed.fixed).toBe(true);
    expect(fixed.root.type).toBe("LOGIC");
    if (fixed.root.type !== "LOGIC") return;
    expect(fixed.root.operator).toBe("ANY");
    expect(fixed.root.threshold).toBeUndefined();
  });
});
