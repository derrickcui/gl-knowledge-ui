import { describe, expect, it } from "vitest";
import { getAllowedChildNodeTypesByMatrix, isChildAllowedByMatrix } from "./nesting-matrix";
import type { UiCapabilityViewModel, UiExpressionNode } from "./types";

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
    allowTopicRef: false,
    allowExcludeGroup: false,
    allowScore: false,
    allowExplainOverride: false,
    allowNot: false,
  },
};

const advancedCapability: UiCapabilityViewModel = {
  ...baseCapability,
  advanced: {
    ...baseCapability.advanced,
    allowTopicRef: true,
    allowScore: true,
    allowNot: true,
  },
};

describe("nesting matrix (frozen v1)", () => {
  it("matches allowed children for each parent in base capability", () => {
    expect(getAllowedChildNodeTypesByMatrix("LOGIC", baseCapability)).toEqual([
      "LOGIC",
      "FIELD",
      "POSITION_RELATION",
      "TERM_SET",
    ]);
    expect(getAllowedChildNodeTypesByMatrix("FIELD", baseCapability)).toEqual([
      "LOGIC",
      "POSITION_RELATION",
      "TERM_SET",
      "STRUCTURE",
    ]);
    expect(getAllowedChildNodeTypesByMatrix("STRUCTURE", baseCapability)).toEqual(["LOGIC"]);
    expect(getAllowedChildNodeTypesByMatrix("POSITION_RELATION", baseCapability)).toEqual(["TERM_SET"]);
    expect(getAllowedChildNodeTypesByMatrix("PROXIMITY", baseCapability)).toEqual(["TERM_SET"]);
    expect(getAllowedChildNodeTypesByMatrix("NOT", baseCapability)).toEqual([
      "LOGIC",
      "FIELD",
      "POSITION_RELATION",
      "TERM_SET",
    ]);
    expect(getAllowedChildNodeTypesByMatrix("SCORE", baseCapability)).toEqual(["FIELD", "TERM_SET"]);
    expect(getAllowedChildNodeTypesByMatrix("TERM_SET", baseCapability)).toEqual([]);
    expect(getAllowedChildNodeTypesByMatrix("TOPIC_REF", baseCapability)).toEqual([]);
  });

  it("enables NOT/SCORE/TOPIC_REF under LOGIC when advanced capability is on", () => {
    expect(getAllowedChildNodeTypesByMatrix("LOGIC", advancedCapability)).toEqual([
      "LOGIC",
      "FIELD",
      "POSITION_RELATION",
      "TERM_SET",
      "NOT",
      "SCORE",
      "TOPIC_REF",
    ]);
  });

  it("blocks illegal edges from frozen matrix", () => {
    const parent: UiExpressionNode["type"] = "PROXIMITY";
    expect(isChildAllowedByMatrix(parent, "LOGIC", advancedCapability)).toBe(false);
    expect(isChildAllowedByMatrix(parent, "FIELD", advancedCapability)).toBe(false);
    expect(isChildAllowedByMatrix("FIELD", "FIELD", advancedCapability)).toBe(false);
    expect(isChildAllowedByMatrix("SCORE", "LOGIC", advancedCapability)).toBe(false);
    expect(isChildAllowedByMatrix("NOT", "NOT", advancedCapability)).toBe(false);
    expect(isChildAllowedByMatrix("TERM_SET", "TERM_SET", advancedCapability)).toBe(false);
  });
});
