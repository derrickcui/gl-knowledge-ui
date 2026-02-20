import { RuleHeader } from "./internal/RuleHeader";

type ReviewHeaderProps = {
  topicId: string;
  ruleName: string;
  revision: number;
  status: string;
  templateText: string;
  submitter: string;
  submittedAt?: string | null;
};

export function ReviewHeader(props: ReviewHeaderProps) {
  return <RuleHeader {...props} />;
}
