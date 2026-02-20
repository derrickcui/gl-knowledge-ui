import { RuleTemplateCheck } from "./internal/RuleTemplateCheck";
import type { TemplateCheckItem } from "./types";

type TemplateValidationCardProps = {
  checks: TemplateCheckItem[];
};

export function TemplateValidationCard({ checks }: TemplateValidationCardProps) {
  return <RuleTemplateCheck checks={checks} />;
}
