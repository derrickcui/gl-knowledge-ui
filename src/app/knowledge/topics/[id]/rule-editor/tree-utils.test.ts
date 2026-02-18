import { describe, expect, it } from "vitest";
import { getAllowedChildTypes } from "./tree-utils";
import type { UiCapabilityViewModel, UiExpressionNode } from "./types";

const capability: UiCapabilityViewModel = {
  semantic: {
    allowModes: ["ALL", "ANY"],
    allowThreshold: false,
    allowWeighted: false,
    allowNested: true,
  },
  structure: {
    allowRelation: ["NONE", "SENTENCE", "PARAGRAPH", "NEAR"],
    allowOrder: true,
    allowDistance: true,
  },
  where: {
    allowFields: ["CONTENT"],
    allowWhen: false,
  },
  advanced: {
    allowTopicRef: false,
    allowExcludeGroup: false,
    allowScore: false,
    allowExplainOverride: false,
    allowNot: false,
  },
};

describe("getAllowedChildTypes", () => {
  it("allows expression nodes under FIELD", () => {
    const field: UiExpressionNode = { id: "field", type: "FIELD", field: "CONTENT", child: null };
    expect(getAllowedChildTypes(field, capability)).toEqual([
      "LOGIC",
      "POSITION_RELATION",
      "TERM_SET",
      "STRUCTURE",
    ]);
  });

  it("allows only LOGIC under STRUCTURE", () => {
    const structure: UiExpressionNode = { id: "s", type: "STRUCTURE", scope: "PARAGRAPH", child: null };
    expect(getAllowedChildTypes(structure, capability)).toEqual(["LOGIC"]);
  });

  it("allows only TERM_SET under POSITION_RELATION", () => {
    const relation: UiExpressionNode = {
      id: "p",
      type: "POSITION_RELATION",
      mode: "PROXIMITY",
      ordered: false,
      distance: 5,
      children: [],
    };
    expect(getAllowedChildTypes(relation, capability)).toEqual(["TERM_SET"]);
  });

  it("allows advanced children in LOGIC when capability enables them", () => {
    const advanced = {
      ...capability,
      where: { ...capability.where, allowWhen: true },
      advanced: {
        ...capability.advanced,
        allowNot: true,
        allowScore: true,
        allowTopicRef: true,
      },
    };
    const logic: UiExpressionNode = { id: "l", type: "LOGIC", operator: "ANY", children: [] };
    expect(getAllowedChildTypes(logic, advanced)).toEqual([
      "LOGIC",
      "FIELD",
      "POSITION_RELATION",
      "TERM_SET",
      "NOT",
      "SCORE",
      "TOPIC_REF",
    ]);
  });

  it("allows one child under NOT/SCORE wrappers", () => {
    const advanced = {
      ...capability,
      where: { ...capability.where, allowWhen: true },
      advanced: {
        ...capability.advanced,
        allowNot: true,
        allowScore: true,
        allowTopicRef: true,
      },
    };
    const notNode: UiExpressionNode = { id: "n", type: "NOT", child: null };
    const scoreNode: UiExpressionNode = { id: "s", type: "SCORE", weight: 1, child: null };

    expect(getAllowedChildTypes(notNode, advanced)).toEqual([
      "LOGIC",
      "FIELD",
      "POSITION_RELATION",
      "TERM_SET",
    ]);
    expect(getAllowedChildTypes(scoreNode, advanced)).toEqual([
      "FIELD",
      "TERM_SET",
    ]);
  });
});
