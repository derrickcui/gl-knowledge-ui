import { RuleComplexityPanel } from "./internal/RuleComplexityPanel";
import type { ComplexityMetrics } from "./types";

type ComplexityCardProps = {
  complexity: ComplexityMetrics;
};

export function ComplexityCard({ complexity }: ComplexityCardProps) {
  return <RuleComplexityPanel metrics={complexity} />;
}
