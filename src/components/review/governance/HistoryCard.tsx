import { RuleHistoryPanel } from "./internal/RuleHistoryPanel";
import type { HistoryRecord } from "./types";

type HistoryCardProps = {
  expanded: boolean;
  onToggle: () => void;
  records: HistoryRecord[];
};

export function HistoryCard({ expanded, onToggle, records }: HistoryCardProps) {
  return <RuleHistoryPanel expanded={expanded} onToggle={onToggle} records={records} />;
}
