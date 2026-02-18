import { describe, expect, it } from "vitest";
import { validateTree } from "./validation";
import type { UiCapabilityViewModel, UiExpressionNode, UiTermSetNode } from "./types";

const baseCapability: UiCapabilityViewModel = {
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

function term(id: string): UiTermSetNode {
  return {
    id,
    type: "TERM_SET",
    terms: [
      {
        source: "CONCEPT",
        conceptId: `${id}-c`,
        conceptName: `${id}-name`,
        includeDescendants: false,
      },
    ],
    matchMode: "ANY",
  };
}

describe("validateTree advanced syntax alignment", () => {
  it("allows nested FIELD under LOGIC (<in/field> nesting)", () => {
    const root: UiExpressionNode = {
      id: "root",
      type: "LOGIC",
      operator: "ANY",
      children: [
        {
          id: "nested-field",
          type: "FIELD",
          field: "TITLE",
          child: {
            id: "nested-logic",
            type: "LOGIC",
            operator: "ANY",
            children: [term("t1")],
          },
        },
        term("t2"),
      ],
    };
    const issues = validateTree(root, baseCapability).filter((item) => item.severity === "error");
    expect(issues).toEqual([]);
  });

  it("allows POSITION_RELATION and TERM_SET in the same LOGIC group", () => {
    const root: UiExpressionNode = {
      id: "root",
      type: "LOGIC",
      operator: "ANY",
      children: [
        {
          id: "pos",
          type: "POSITION_RELATION",
          mode: "PROXIMITY",
          relation: "NEAR",
          ordered: false,
          distance: 3,
          children: [term("p1"), term("p2")],
        },
        term("t3"),
      ],
    };
    const issues = validateTree(root, baseCapability).filter((item) => item.severity === "error");
    expect(issues).toEqual([]);
  });

  it("supports ORDER mode in POSITION_RELATION", () => {
    const root: UiExpressionNode = {
      id: "root",
      type: "LOGIC",
      operator: "ANY",
      children: [
        {
          id: "pos-order",
          type: "POSITION_RELATION",
          mode: "ORDER",
          relation: "SENTENCE",
          strict: true,
          children: [term("o1"), term("o2")],
        },
      ],
    };
    const issues = validateTree(root, baseCapability).filter((item) => item.severity === "error");
    expect(issues).toEqual([]);
  });

  it("allows NOT and TOPIC_REF when capability enables them", () => {
    const root: UiExpressionNode = {
      id: "root",
      type: "LOGIC",
      operator: "ANY",
      children: [
        {
          id: "not-1",
          type: "NOT",
          child: term("n1"),
        },
        {
          id: "topic-1",
          type: "TOPIC_REF",
          topicId: "topic-id-1",
        },
      ],
    };
    const issues = validateTree(root, baseCapability).filter((item) => item.severity === "error");
    expect(issues).toEqual([]);
  });

  it("rejects NOT when capability disables it", () => {
    const cap: UiCapabilityViewModel = {
      ...baseCapability,
      advanced: { ...baseCapability.advanced, allowNot: false },
    };
    const root: UiExpressionNode = {
      id: "root",
      type: "LOGIC",
      operator: "ANY",
      children: [{ id: "not-1", type: "NOT", child: term("n1") }],
    };
    const issues = validateTree(root, cap).filter((item) => item.severity === "error");
    expect(issues.some((item) => item.message.includes("排除") || item.message.includes("Exclusion"))).toBe(true);
  });
});
