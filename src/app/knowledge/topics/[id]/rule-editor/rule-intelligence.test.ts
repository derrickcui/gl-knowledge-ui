import { describe, expect, it } from "vitest";
import {
  assessRuleRisk,
  buildHeatLevelByNodeId,
  computeComplexityMetrics,
  computePerformanceMetrics,
} from "./rule-intelligence";
import type { UiExpressionNode } from "./types";

function term(id: string): UiExpressionNode {
  return {
    id,
    type: "TERM_SET",
    terms: [{ source: "CONCEPT", conceptId: id, conceptName: id, includeDescendants: false }],
    matchMode: "ANY",
  };
}

describe("rule-intelligence", () => {
  it("computes complexity/performance", () => {
    const root: UiExpressionNode = {
      id: "root",
      type: "LOGIC",
      operator: "AND",
      children: [term("a"), term("b")],
    };
    const complexity = computeComplexityMetrics(root);
    const perf = computePerformanceMetrics(
      root,
      {
        mode: "FULL",
        runtimeEnvironmentId: 1,
        total: 10,
        page: 1,
        size: 20,
        took: 123,
        items: [],
        metadata: { engineVersion: "x", executionId: "e1" },
      },
      null
    );
    expect(complexity.nodeCount).toBeGreaterThan(0);
    expect(perf.tookMs).toBe(123);
    expect(perf.clauseCount).toBeGreaterThan(0);
  });

  it("builds heat map from ranking fallback", () => {
    const map = buildHeatLevelByNodeId(
      null,
      [
        { nodeId: "n1", label: "a", totalWithoutNode: 0, contribution: 80, contributionRate: 0.8 },
        { nodeId: "n2", label: "b", totalWithoutNode: 0, contribution: 20, contributionRate: 0.2 },
      ],
      100
    );
    expect(map.n1).toBe("HIGH");
    expect(map.n2).toBe("LOW");
  });

  it("assesses risk with reasons", () => {
    const root: UiExpressionNode = {
      id: "root",
      type: "LOGIC",
      operator: "AND",
      children: [term("a")],
    };
    const risk = assessRuleRisk(root, 0, null, []);
    expect(risk.score).toBeGreaterThan(0);
    expect(risk.reasons.length).toBeGreaterThan(0);
  });
});
