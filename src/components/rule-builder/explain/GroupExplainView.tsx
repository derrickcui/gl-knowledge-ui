"use client";

import { RuleNode } from "../astTypes";
import { buildGroupExplainModel } from "./groupExplain";

interface Props {
  group: RuleNode;
  activeConditionId?: string;
  onHoverCondition?: (id?: string) => void;
  onClickCondition?: (id?: string) => void;
}

export function GroupExplainView({
  group,
  activeConditionId,
  onHoverCondition,
  onClickCondition,
}: Props) {
  const model = buildGroupExplainModel(group);

  return (
    <div className="text-sm mt-2">
      <div className="text-slate-600 mb-1">{model.header}</div>
      <ul className="space-y-1">
        {model.lines.map((line) => {
          const active = line.conditionId === activeConditionId;
          return (
            <li
              key={line.conditionId}
              className={`cursor-pointer border-l-2 pl-2 ${
                active
                  ? "border-blue-500 bg-blue-50"
                  : "border-transparent"
              }`}
              onMouseEnter={() => onHoverCondition?.(line.conditionId)}
              onMouseLeave={() => onHoverCondition?.(undefined)}
              onClick={() => onClickCondition?.(line.conditionId)}
            >
              {line.text}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
