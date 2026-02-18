import type { RuleAbTestResult } from "./ab-test";
import type { ComplexityMetrics, PerformanceMetrics, RiskAssessment } from "./rule-intelligence";
import type { RuleVersionEntry } from "./RuleVersionTimelinePanel";

export type VerificationSnapshotInput = {
  topicName: string;
  generatedAt: string;
  complexity: ComplexityMetrics;
  performance: PerformanceMetrics;
  risk: RiskAssessment;
  abTestResult: RuleAbTestResult | null;
  versionHistory: RuleVersionEntry[];
};

export function buildVerificationMarkdown(input: VerificationSnapshotInput): string {
  const lines: string[] = [];
  lines.push(`# Rule Verification Snapshot`);
  lines.push("");
  lines.push(`- Topic: ${input.topicName}`);
  lines.push(`- Generated At: ${input.generatedAt}`);
  lines.push("");
  lines.push("## Complexity");
  lines.push(
    `- Score: ${input.complexity.score} (${input.complexity.level}), nodes=${input.complexity.nodeCount}, depth=${input.complexity.depth}, proximity=${input.complexity.proximityCount}, logsum=${input.complexity.logsumCount}`
  );
  lines.push("");
  lines.push("## Performance");
  lines.push(
    `- tookMs: ${input.performance.tookMs ?? "-"}, clauseCount: ${input.performance.clauseCount}, nestedDepth: ${input.performance.nestedDepth}`
  );
  lines.push(`- riskScore: ${input.performance.riskScore} (${input.performance.riskLevel})`);
  lines.push("");
  lines.push("## Risk Assessment");
  lines.push(`- Score: ${input.risk.score}, Level: ${input.risk.level}`);
  if (input.risk.reasons.length === 0) {
    lines.push("- Reasons: none");
  } else {
    input.risk.reasons.forEach((reason) => lines.push(`- ${reason}`));
  }
  lines.push("");
  lines.push("## A/B Test");
  if (!input.abTestResult) {
    lines.push("- No A/B result yet");
  } else {
    lines.push(`- Winner: ${input.abTestResult.winner}`);
    lines.push(
      `- Hit A/B: ${input.abTestResult.ruleA.total} / ${input.abTestResult.ruleB.total}, delta=${input.abTestResult.deltaHit} (${(input.abTestResult.deltaHitRate * 100).toFixed(1)}%)`
    );
    lines.push(
      `- Took A/B: ${input.abTestResult.ruleA.took}ms / ${input.abTestResult.ruleB.took}ms, overlap=${(
        input.abTestResult.overlapRate * 100
      ).toFixed(1)}%`
    );
  }
  lines.push("");
  lines.push("## Version Timeline");
  if (input.versionHistory.length === 0) {
    lines.push("- No version records");
  } else {
    input.versionHistory.forEach((entry) => {
      lines.push(
        `- ${entry.version} | ${entry.action} | +${entry.added}/-${entry.removed}/~${entry.changed} | risk=${entry.riskLevel} (${entry.complexityScore}) | ${entry.at}`
      );
      if (entry.abSummary) {
        lines.push(
          `  - AB: winner=${entry.abSummary.winner}, delta=${entry.abSummary.deltaHit} (${(
            entry.abSummary.deltaHitRate * 100
          ).toFixed(1)}%)`
        );
      }
    });
  }
  lines.push("");
  return lines.join("\n");
}

export function downloadVerificationMarkdown(filename: string, markdown: string) {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
