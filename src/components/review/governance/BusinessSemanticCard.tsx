import { RuleSemanticSummary } from "./internal/RuleSemanticSummary";

type BusinessSemanticCardProps = {
  title: string;
  summary: string;
};

export function BusinessSemanticCard({ title, summary }: BusinessSemanticCardProps) {
  return <RuleSemanticSummary titleText={title} summaryText={summary} />;
}
