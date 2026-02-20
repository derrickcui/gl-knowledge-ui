import { RuleRiskPanel } from "./internal/RuleRiskPanel";
import type { RiskSummary } from "./types";

type RiskCardProps = {
  risk: RiskSummary;
  complexityLevel: "低" | "中" | "高";
  expanded: boolean;
  onToggleExpanded: () => void;
};

export function RiskCard({
  risk,
  complexityLevel,
  expanded,
  onToggleExpanded,
}: RiskCardProps) {
  return (
    <RuleRiskPanel
      summary={risk}
      complexityLevel={complexityLevel}
      expanded={expanded}
      onToggleExpanded={onToggleExpanded}
    />
  );
}
