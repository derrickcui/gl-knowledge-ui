import { describe, expect, it } from "vitest";
import { generateRuleCandidatesFromRuntime } from "./rule-auto-generate";

describe("generateRuleCandidatesFromRuntime", () => {
  it("builds candidates from real hit items", () => {
    const candidates = generateRuleCandidatesFromRuntime(
      {
        mode: "FULL",
        runtimeEnvironmentId: 1,
        total: 10,
        page: 1,
        size: 20,
        took: 100,
        metadata: { engineVersion: "x", executionId: "e1" },
        items: [
          {
            id: "d1",
            title: "doc1",
            matchedReasons: [
              { field: "CONTENT", label: "博士", matchedTerms: ["博士"] },
              { field: "CONTENT", label: "出站", matchedTerms: ["出站"] },
            ],
            highlightFragments: [],
          },
          {
            id: "d2",
            title: "doc2",
            matchedReasons: [
              { field: "CONTENT", label: "博士", matchedTerms: ["博士"] },
              { field: "CONTENT", label: "出站", matchedTerms: ["出站"] },
            ],
            highlightFragments: [],
          },
        ],
      },
      {
        mode: "IMPACT",
        runtimeEnvironmentId: 1,
        fullTotal: 10,
        conditionCount: 2,
        took: 88,
        metadata: { engineVersion: "x", executionId: "e2" },
        analysis: [
          {
            nodeId: "n1",
            label: "条件1",
            removedTotal: 10,
            contribution: 0,
            impactLevel: "NONE",
          },
        ],
      }
    );
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.some((item) => item.action.type === "APPLY_PROXIMITY_HINT")).toBe(true);
  });
});
