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
  it("allows only LOGIC node under FIELD", () => {
    const field: UiExpressionNode = { id: "field", type: "FIELD", field: "CONTENT", child: null };
    expect(getAllowedChildTypes(field, capability)).toEqual(["LOGIC"]);
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
});
