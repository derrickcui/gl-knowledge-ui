import { describe, expect, it } from "vitest";
import { compileToGql, compileUiTreeToGql } from "./gql-compiler";
import type { UiExpressionNode } from "./types";

function term(id: string, name: string): UiExpressionNode {
  return {
    id,
    type: "TERM_SET",
    terms: [
      {
        source: "CONCEPT",
        conceptId: id,
        conceptName: name,
        includeDescendants: false,
      },
    ],
    matchMode: "ANY",
  };
}

describe("compileUiTreeToGql", () => {
  it("maps ANY/ALL to <or>/<and>", () => {
    const root: UiExpressionNode = {
      id: "root",
      type: "LOGIC",
      operator: "ANY",
      children: [
        {
          id: "a",
          type: "TERM_SET",
          terms: [{ source: "CONCEPT", conceptId: "a", conceptName: "a", includeDescendants: false }],
          matchMode: "ANY",
        },
        {
          id: "b",
          type: "LOGIC",
          operator: "ALL",
          children: [term("c", "c"), term("d", "d")],
        },
      ],
    };
    expect(compileToGql(root)).toBe("<or>(a,<and>(c,d))");
  });

  it("compiles nested FIELD under LOGIC", () => {
    const root: UiExpressionNode = {
      id: "root",
      type: "FIELD",
      field: "CONTENT",
      child: {
        id: "logic",
        type: "LOGIC",
        operator: "ANY",
        children: [
          {
            id: "f2",
            type: "FIELD",
            field: "TITLE",
            child: {
              id: "inner",
              type: "LOGIC",
              operator: "ALL",
              children: [term("t1", "人工智能")],
            },
          },
          term("t2", "算法"),
        ],
      },
    };

    const result = compileUiTreeToGql(root);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.gql).toContain("<in/content>");
    expect(result.gql).toContain("<in/title>");
    expect(result.gql).toContain("<or>(");
  });

  it("compiles LOGSUM threshold and proximity", () => {
    const root: UiExpressionNode = {
      id: "root",
      type: "FIELD",
      field: "CONTENT",
      child: {
        id: "logic",
        type: "LOGIC",
        operator: "LOGSUM",
        threshold: 2,
        children: [
          {
            id: "p",
            type: "POSITION_RELATION",
            mode: "PROXIMITY",
            relation: "NEAR",
            distance: 5,
            ordered: true,
            children: [
              {
                id: "a",
                type: "TERM_SET",
                terms: [{ source: "CONCEPT", conceptId: "a", conceptName: "机器学习", includeDescendants: false }],
                matchMode: "ANY",
              },
              {
                id: "b",
                type: "TERM_SET",
                terms: [{ source: "CONCEPT", conceptId: "b", conceptName: "算法", includeDescendants: false }],
                matchMode: "ANY",
              },
            ],
          },
          term("t2", "神经网络"),
        ],
      },
    };
    const result = compileUiTreeToGql(root);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.gql).toContain("<logsum/2>(");
    expect(result.gql).toContain("<order/5>(");
  });

  it("returns error on invalid empty term set", () => {
    const root: UiExpressionNode = {
      id: "root",
      type: "FIELD",
      field: "CONTENT",
      child: {
        id: "logic",
        type: "LOGIC",
        operator: "ANY",
        children: [{ id: "x", type: "TERM_SET", terms: [], matchMode: "ANY" }],
      },
    };
    const result = compileUiTreeToGql(root);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("compiles single weighted term inline", () => {
    const root: UiExpressionNode = {
      id: "root",
      type: "FIELD",
      field: "TITLE",
      child: {
        id: "n1",
        type: "TERM_SET",
        terms: [{ source: "CONCEPT", conceptId: "n1", conceptName: "神经网络", includeDescendants: false }],
        matchMode: "ANY",
        weight: 5,
      },
    };
    expect(compileToGql(root)).toBe("<in/title>[5]神经网络");
  });
});
