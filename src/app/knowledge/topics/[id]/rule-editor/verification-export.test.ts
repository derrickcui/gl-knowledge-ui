import { describe, expect, it } from "vitest";
import { buildVerificationMarkdown } from "./verification-export";

describe("buildVerificationMarkdown", () => {
  it("renders key sections", () => {
    const md = buildVerificationMarkdown({
      topicName: "Test Topic",
      generatedAt: "2026-02-17 12:00:00",
      complexity: {
        score: 10,
        level: "SIMPLE",
        nodeCount: 3,
        depth: 2,
        proximityCount: 0,
        logsumCount: 0,
      },
      performance: {
        tookMs: 100,
        clauseCount: 5,
        nestedDepth: 2,
        riskScore: 12,
        riskLevel: "LOW",
      },
      risk: {
        score: 8,
        level: "LOW",
        reasons: ["ok"],
      },
      abTestResult: null,
      versionHistory: [],
    });
    expect(md).toContain("# Rule Verification Snapshot");
    expect(md).toContain("## Complexity");
    expect(md).toContain("## Performance");
    expect(md).toContain("## Risk Assessment");
    expect(md).toContain("## A/B Test");
    expect(md).toContain("## Version Timeline");
  });
});
