import { RuleStructureView } from "./internal/RuleStructureView";
import type { LogicNode } from "./types";

type LogicStructureCardProps = {
  tree: LogicNode | null;
};

export function LogicStructureCard({ tree }: LogicStructureCardProps) {
  return <RuleStructureView root={tree} />;
}
