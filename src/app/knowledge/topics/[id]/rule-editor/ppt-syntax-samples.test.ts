import { describe, expect, it } from "vitest";
import { compileUiTreeToGql } from "./gql-compiler";
import { isChildAllowedByMatrix } from "./nesting-matrix";
import type { UiCapabilityViewModel, UiExpressionNode, UiNodeType } from "./types";

function term(id: string, name = id): UiExpressionNode {
  return {
    id,
    type: "TERM_SET",
    terms: [{ source: "CONCEPT", conceptId: id, conceptName: name, includeDescendants: false }],
    matchMode: "ANY",
  };
}

function fieldRoot(child: UiExpressionNode, field: "CONTENT" | "TITLE" | "COLUMN" = "CONTENT"): UiExpressionNode {
  return { id: `root-${field}`, type: "FIELD", field, child };
}

const capability: UiCapabilityViewModel = {
  semantic: {
    allowModes: ["ALL", "ANY", "ACCRUE", "AT_LEAST", "LOGSUM", "WEIGHTED"],
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
    allowExcludeGroup: true,
    allowScore: true,
    allowExplainOverride: true,
    allowNot: true,
  },
};

describe("PPT legal syntax samples (20)", () => {
  const legalCases: Array<{ name: string; root: UiExpressionNode }> = [
    { name: "single term", root: fieldRoot({ id: "l1", type: "LOGIC", operator: "ANY", children: [term("a")] }) },
    { name: "any two terms", root: fieldRoot({ id: "l2", type: "LOGIC", operator: "ANY", children: [term("a"), term("b")] }) },
    { name: "all two terms", root: fieldRoot({ id: "l3", type: "LOGIC", operator: "ALL", children: [term("a"), term("b")] }) },
    { name: "accrue", root: fieldRoot({ id: "l4", type: "LOGIC", operator: "ACCRUE", children: [term("a"), term("b")] }) },
    { name: "logsum", root: fieldRoot({ id: "l5", type: "LOGIC", operator: "LOGSUM", threshold: 2, children: [term("a"), term("b")] }) },
    { name: "at least", root: fieldRoot({ id: "l6", type: "LOGIC", operator: "AT_LEAST", threshold: 2, children: [term("a"), term("b"), term("c")] }) },
    { name: "weighted", root: fieldRoot({ id: "l7", type: "LOGIC", operator: "WEIGHTED", threshold: 2, children: [term("a"), term("b")] }) },
    { name: "title field", root: fieldRoot({ id: "l8", type: "LOGIC", operator: "ANY", children: [term("a")] }, "TITLE") },
    { name: "structure sentence", root: fieldRoot({ id: "s1", type: "STRUCTURE", scope: "SENTENCE", child: { id: "l9", type: "LOGIC", operator: "ANY", children: [term("a"), term("b")] } }) },
    { name: "structure paragraph", root: fieldRoot({ id: "s2", type: "STRUCTURE", scope: "PARAGRAPH", child: { id: "l10", type: "LOGIC", operator: "ANY", children: [term("a"), term("b")] } }) },
    { name: "near relation", root: fieldRoot({ id: "l11", type: "LOGIC", operator: "ANY", children: [{ id: "p1", type: "POSITION_RELATION", mode: "PROXIMITY", relation: "NEAR", distance: 5, ordered: false, children: [term("a") as any, term("b") as any] }] }) },
    { name: "near ordered", root: fieldRoot({ id: "l12", type: "LOGIC", operator: "ANY", children: [{ id: "p2", type: "POSITION_RELATION", mode: "PROXIMITY", relation: "NEAR", distance: 3, ordered: true, children: [term("a") as any, term("b") as any] }] }) },
    { name: "sentence relation", root: fieldRoot({ id: "l13", type: "LOGIC", operator: "ANY", children: [{ id: "p3", type: "POSITION_RELATION", mode: "PROXIMITY", relation: "SENTENCE", ordered: false, children: [term("a") as any, term("b") as any] }] }) },
    { name: "paragraph relation", root: fieldRoot({ id: "l14", type: "LOGIC", operator: "ANY", children: [{ id: "p4", type: "POSITION_RELATION", mode: "PROXIMITY", relation: "PARAGRAPH", ordered: false, children: [term("a") as any, term("b") as any] }] }) },
    { name: "not wrapper", root: fieldRoot({ id: "l15", type: "LOGIC", operator: "ANY", children: [{ id: "n1", type: "NOT", child: term("a") }] }) },
    { name: "score wrapper", root: fieldRoot({ id: "l16", type: "LOGIC", operator: "ANY", children: [{ id: "w1", type: "SCORE", weight: 2, child: term("a") }] }) },
    { name: "topic ref", root: fieldRoot({ id: "l17", type: "LOGIC", operator: "ANY", children: [{ id: "tref1", type: "TOPIC_REF", topicId: "财经" }] }) },
    { name: "nested field in logic", root: fieldRoot({ id: "l18", type: "LOGIC", operator: "ANY", children: [{ id: "f2", type: "FIELD", field: "TITLE", child: { id: "l18n", type: "LOGIC", operator: "ANY", children: [term("a")] } }, term("b")] }) },
    { name: "nested field under not", root: fieldRoot({ id: "l19", type: "LOGIC", operator: "ANY", children: [{ id: "n2", type: "NOT", child: { id: "f3", type: "FIELD", field: "TITLE", child: { id: "l19n", type: "LOGIC", operator: "ANY", children: [term("a")] } } }] }) },
    { name: "mixed logsum + near + topic", root: fieldRoot({ id: "l20", type: "LOGIC", operator: "LOGSUM", threshold: 2, children: [{ id: "p5", type: "POSITION_RELATION", mode: "PROXIMITY", relation: "NEAR", distance: 4, ordered: false, children: [term("a") as any, term("b") as any] }, { id: "tref2", type: "TOPIC_REF", topicId: "算法" }] }) },
  ];

  it("all legal samples should compile", () => {
    expect(legalCases).toHaveLength(20);
    legalCases.forEach((item) => {
      const result = compileUiTreeToGql(item.root);
      expect(result.ok, item.name).toBe(true);
    });
  });
});

describe("PPT illegal syntax samples (20)", () => {
  const compileInvalid: Array<{ name: string; root: UiExpressionNode | null }> = [
    { name: "null root", root: null },
    { name: "field missing child", root: { id: "r1", type: "FIELD", field: "CONTENT", child: null } },
    { name: "structure missing child", root: fieldRoot({ id: "s1", type: "STRUCTURE", scope: "PARAGRAPH", child: null }) },
    { name: "logic empty", root: fieldRoot({ id: "l1", type: "LOGIC", operator: "ANY", children: [] }) },
    { name: "position one child", root: fieldRoot({ id: "l2", type: "LOGIC", operator: "ANY", children: [{ id: "p1", type: "POSITION_RELATION", mode: "PROXIMITY", relation: "NEAR", distance: 2, ordered: false, children: [term("a") as any] }] }) },
    { name: "empty term set", root: fieldRoot({ id: "l3", type: "LOGIC", operator: "ANY", children: [{ id: "t1", type: "TERM_SET", terms: [], matchMode: "ANY" }] }) },
    { name: "topic ref empty", root: fieldRoot({ id: "l4", type: "LOGIC", operator: "ANY", children: [{ id: "tp1", type: "TOPIC_REF", topicId: "" }] }) },
    { name: "not missing child", root: fieldRoot({ id: "l5", type: "LOGIC", operator: "ANY", children: [{ id: "n1", type: "NOT", child: null }] }) },
    { name: "score missing child", root: fieldRoot({ id: "l6", type: "LOGIC", operator: "ANY", children: [{ id: "s1", type: "SCORE", weight: 1, child: null }] }) },
    { name: "legacy proximity", root: fieldRoot({ id: "l7", type: "LOGIC", operator: "ANY", children: [{ id: "legacy", type: "PROXIMITY", relation: "NEAR", ordered: false, distance: 3, children: [] }] as UiExpressionNode[] }) },
  ];

  const matrixInvalid: Array<{ parent: UiExpressionNode["type"]; child: UiNodeType }> = [
    { parent: "TERM_SET", child: "LOGIC" },
    { parent: "TOPIC_REF", child: "FIELD" },
    { parent: "POSITION_RELATION", child: "LOGIC" },
    { parent: "POSITION_RELATION", child: "TOPIC_REF" },
    { parent: "POSITION_RELATION", child: "FIELD" },
    { parent: "STRUCTURE", child: "TERM_SET" },
    { parent: "STRUCTURE", child: "FIELD" },
    { parent: "STRUCTURE", child: "TOPIC_REF" },
    { parent: "FIELD", child: "FIELD" },
    { parent: "TERM_SET", child: "SCORE" },
  ];

  it("all compile-invalid samples should fail", () => {
    expect(compileInvalid).toHaveLength(10);
    compileInvalid.forEach((item) => {
      const result = compileUiTreeToGql(item.root);
      expect(result.ok, item.name).toBe(false);
    });
  });

  it("all matrix-invalid samples should be rejected", () => {
    expect(matrixInvalid).toHaveLength(10);
    matrixInvalid.forEach((item) => {
      expect(isChildAllowedByMatrix(item.parent, item.child, capability), `${item.parent}->${item.child}`).toBe(false);
    });
  });
});
