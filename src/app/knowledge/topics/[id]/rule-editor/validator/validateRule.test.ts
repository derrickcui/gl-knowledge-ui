import { describe, expect, it } from "vitest";
import type { UiCapabilityViewModel, UiRuleViewModel } from "../types";
import { validateRule } from "./validateRule";

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

describe("validateRule", () => {
  it("returns root error when rule has no root", () => {
    const rule: UiRuleViewModel = { root: null };
    const issues = validateRule(rule, capability);
    expect(issues.length).toBe(1);
    expect(issues[0]?.nodeId).toBe("root");
  });
});

