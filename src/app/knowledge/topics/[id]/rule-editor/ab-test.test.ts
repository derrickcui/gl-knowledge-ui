import { describe, expect, it } from "vitest";
import { buildRuleAbTestResult } from "./ab-test";

describe("buildRuleAbTestResult", () => {
  it("computes delta/winner/overlap", () => {
    const result = buildRuleAbTestResult(
      {
        mode: "FULL",
        runtimeEnvironmentId: 1,
        total: 2,
        page: 1,
        size: 20,
        took: 120,
        items: [
          { id: "d1", title: "a", matchedReasons: [], highlightFragments: [] },
          { id: "d2", title: "b", matchedReasons: [], highlightFragments: [] },
        ],
        metadata: { engineVersion: "x", executionId: "e1" },
      },
      {
        mode: "FULL",
        runtimeEnvironmentId: 1,
        total: 3,
        page: 1,
        size: 20,
        took: 100,
        items: [
          { id: "d2", title: "b", matchedReasons: [], highlightFragments: [] },
          { id: "d3", title: "c", matchedReasons: [], highlightFragments: [] },
          { id: "d4", title: "d", matchedReasons: [], highlightFragments: [] },
        ],
        metadata: { engineVersion: "x", executionId: "e2" },
      }
    );

    expect(result.deltaHit).toBe(1);
    expect(result.winner).toBe("B");
    expect(result.overlapRate).toBeGreaterThan(0);
  });
});
