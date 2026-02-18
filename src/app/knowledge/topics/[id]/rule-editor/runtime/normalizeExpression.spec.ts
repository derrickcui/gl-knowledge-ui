import { describe, expect, it } from "vitest";
import { normalizeExpression } from "./normalizeExpression";
import type { UiExpressionNode } from "../types";

function term(id: string): UiExpressionNode {
  return {
    id,
    type: "TERM_SET",
    terms: [{ source: "CONCEPT", conceptId: id, conceptName: id, includeDescendants: false }],
    matchMode: "ANY",
  };
}

function field(field: "CONTENT" | "TITLE" | "COLUMN", child: UiExpressionNode, id?: string): UiExpressionNode {
  return { id: id ?? `f-${field}`, type: "FIELD", field, child };
}

function logic(
  operator: "AND" | "OR" | "ANY" | "ALL" | "ACCRUE" | "AT_LEAST" | "LOGSUM" | "WEIGHTED",
  children: UiExpressionNode[],
  id = "logic",
  threshold?: number
): UiExpressionNode {
  return { id, type: "LOGIC", operator, children, threshold };
}

function proximity(children: UiExpressionNode[], id = "prox"): UiExpressionNode {
  return { id, type: "PROXIMITY", relation: "NEAR", ordered: false, distance: 3, children };
}

function not(child: UiExpressionNode | null, id = "not1"): UiExpressionNode {
  return { id, type: "NOT", child };
}

function score(child: UiExpressionNode | null, id = "score1"): UiExpressionNode {
  return { id, type: "SCORE", weight: 1, child };
}

function topic(id: string): UiExpressionNode {
  return { id: `topic-${id}`, type: "TOPIC_REF", topicId: id };
}

function expectOk(node: UiExpressionNode): UiExpressionNode {
  return normalizeExpression(node);
}

function expectFail(node: UiExpressionNode, msg?: string) {
  if (msg) {
    expect(() => normalizeExpression(node)).toThrow(msg);
    return;
  }
  expect(() => normalizeExpression(node)).toThrow();
}

describe("合法结构（20）", () => {
  it("1) 单 TERM_SET", () => {
    const out = expectOk(term("a"));
    expect(out.type).toBe("TERM_SET");
  });

  it("2) FIELD + TERM_SET", () => {
    const out = expectOk(field("TITLE", term("a")));
    expect(out.type).toBe("FIELD");
  });

  it("3) LOGIC + TERM_SET", () => {
    const out = expectOk(logic("AND", [term("a"), term("b")]));
    expect(out.type).toBe("LOGIC");
  });

  it("4) PROXIMITY + TERM_SET", () => {
    const out = expectOk(proximity([term("a"), term("b")]));
    expect(out.type).toBe("PROXIMITY");
  });

  it("5) LOGIC 包两个 FIELD(title) 自动提升", () => {
    const out = expectOk(logic("OR", [field("TITLE", term("a")), field("TITLE", term("b"))]));
    expect(out.type).toBe("FIELD");
    if (out.type !== "FIELD") return;
    expect(out.field).toBe("TITLE");
  });

  it("6) PROXIMITY 包两个 FIELD(content) 自动提升", () => {
    const out = expectOk(proximity([field("CONTENT", term("a")), field("CONTENT", term("b"))]));
    expect(out.type).toBe("FIELD");
    if (out.type !== "FIELD") return;
    expect(out.field).toBe("CONTENT");
  });

  it("7) LOGIC 包 3 个 FIELD(title) 自动提升", () => {
    const out = expectOk(logic("OR", [field("TITLE", term("a")), field("TITLE", term("b")), field("TITLE", term("c"))]));
    expect(out.type).toBe("FIELD");
  });

  it("8) PROXIMITY 包 3 个 FIELD(title) 自动提升", () => {
    const out = expectOk(proximity([field("TITLE", term("a")), field("TITLE", term("b")), field("TITLE", term("c"))]));
    expect(out.type).toBe("FIELD");
  });

  it("9) FIELD(title) 包 LOGIC", () => {
    const out = expectOk(field("TITLE", logic("ANY", [term("a"), term("b")])));
    expect(out.type).toBe("FIELD");
  });

  it("10) FIELD(title) 包 PROXIMITY", () => {
    const out = expectOk(field("TITLE", proximity([term("a"), term("b")])));
    expect(out.type).toBe("FIELD");
  });

  it("11) LOGIC 包 PROXIMITY", () => {
    const out = expectOk(logic("ANY", [proximity([term("a"), term("b")]), term("c")]));
    expect(out.type).toBe("LOGIC");
  });

  it("12) PROXIMITY 包 LOGIC", () => {
    const out = expectOk(proximity([logic("ANY", [term("a"), term("b")]), logic("ANY", [term("c"), term("d")])]));
    expect(out.type).toBe("PROXIMITY");
  });

  it("13) LOGIC 包 PROXIMITY 包 FIELD(title)", () => {
    const out = expectOk(
      logic("ANY", [
        proximity([field("TITLE", term("a")), field("TITLE", term("b"))]),
        term("c"),
      ])
    );
    expect(out.type).toBe("LOGIC");
  });

  it("14) NOT 包 TERM_SET", () => {
    const out = expectOk(not(term("a")));
    expect(out.type).toBe("NOT");
  });

  it("15) NOT 包 LOGIC", () => {
    const out = expectOk(not(logic("ANY", [term("a"), term("b")])));
    expect(out.type).toBe("NOT");
  });

  it("16) SCORE 包 TERM_SET", () => {
    const out = expectOk(score(term("a")));
    expect(out.type).toBe("SCORE");
  });

  it("17) LOGIC(AT_LEAST 2) 3 children", () => {
    const out = expectOk(logic("AT_LEAST", [term("a"), term("b"), term("c")], "l17", 2));
    expect(out.type).toBe("LOGIC");
  });

  it("18) 多层嵌套混合", () => {
    const out = expectOk(
      logic("ANY", [
        field("TITLE", proximity([term("a"), term("b")])),
        term("c"),
      ])
    );
    expect(out.type).toBe("LOGIC");
  });

  it("19) PROXIMITY 包 LOGIC 包 TERM_SET", () => {
    const out = expectOk(
      proximity([
        logic("ANY", [term("a"), term("b")]),
        logic("ANY", [term("c"), term("d")]),
      ])
    );
    expect(out.type).toBe("PROXIMITY");
  });

  it("20) FIELD(title) 包 LOGIC 包 PROXIMITY", () => {
    const out = expectOk(
      field(
        "TITLE",
        logic("ANY", [proximity([term("a"), term("b")]), term("c")])
      )
    );
    expect(out.type).toBe("FIELD");
  });
});

describe("非法结构（20）", () => {
  it("1) LOGIC 无 children", () => {
    expectFail(logic("ANY", []), "LOGIC node must contain at least one child");
  });

  it("2) PROXIMITY 少于 2 children", () => {
    expectFail(proximity([term("a")]), "PROXIMITY requires at least two children");
  });

  it("3) FIELD 无 child", () => {
    expectFail({ id: "f3", type: "FIELD", field: "TITLE", child: null }, "FIELD must contain one child expression");
  });

  it("4) FIELD 嵌套 FIELD", () => {
    expectFail(field("TITLE", field("CONTENT", term("a"))), "FIELD cannot nest FIELD");
  });

  it("5) LOGIC 混合不同 FIELD", () => {
    expectFail(logic("ANY", [field("TITLE", term("a")), field("CONTENT", term("b"))]), "FIELD scope conflict");
  });

  it("6) PROXIMITY 混合不同 FIELD", () => {
    expectFail(proximity([field("TITLE", term("a")), field("CONTENT", term("b"))]), "FIELD scope conflict");
  });

  it("7) LOGIC 1 child 且 threshold=2", () => {
    expectFail(logic("AT_LEAST", [term("a")], "l7", 2), "threshold exceeds");
  });

  it("8) PROXIMITY children 含 null", () => {
    expectFail({ id: "p8", type: "PROXIMITY", relation: "NEAR", ordered: false, distance: 3, children: [term("a"), null as any] }, "PROXIMITY children contain invalid");
  });

  it("9) NOT 无 child", () => {
    expectFail(not(null), "NOT must contain one child expression");
  });

  it("10) SCORE 无 child", () => {
    expectFail(score(null), "SCORE must contain at least one child expression");
  });

  it("11) PROXIMITY FIELD+nonFIELD+不一致", () => {
    expectFail(proximity([field("TITLE", term("a")), term("b"), field("CONTENT", term("c"))]), "FIELD scope conflict");
  });

  it("12) FIELD 包空 LOGIC", () => {
    expectFail(field("TITLE", logic("ANY", [])), "LOGIC node must contain at least one child");
  });

  it("13) LOGIC children 含 undefined", () => {
    expectFail({ id: "l13", type: "LOGIC", operator: "ANY", children: [term("a"), undefined as any] }, "LOGIC children contain invalid");
  });

  it("14) PROXIMITY 只有一个 child", () => {
    expectFail(proximity([term("a")]), "PROXIMITY requires at least two children");
  });

  it("15) LOGIC threshold > children.length", () => {
    expectFail(logic("LOGSUM", [term("a"), term("b")], "l15", 3), "threshold exceeds");
  });

  it("16) FIELD field=null", () => {
    expectFail({ id: "f16", type: "FIELD", field: null as any, child: term("a") }, "FIELD field is required");
  });

  it("17) TERM_SET 无 terms", () => {
    expectFail({ id: "t17", type: "TERM_SET", terms: [], matchMode: "ANY" }, "TERM_SET must contain at least one term");
  });

  it("18) PROXIMITY children 为空数组", () => {
    expectFail({ id: "p18", type: "PROXIMITY", relation: "NEAR", ordered: false, distance: 3, children: [] }, "PROXIMITY requires at least two children");
  });

  it("19) NOT child 为 null", () => {
    expectFail({ id: "n19", type: "NOT", child: null }, "NOT must contain one child expression");
  });

  it("20) LOGIC children 出现非法类型", () => {
    expectFail({ id: "l20", type: "LOGIC", operator: "ANY", children: [{ id: "x", type: "UNKNOWN" } as any, term("a")] }, "invalid node type");
  });
});

