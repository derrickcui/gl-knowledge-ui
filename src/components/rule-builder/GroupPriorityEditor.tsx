"use client";

import { RuleNode } from "./astTypes";

interface Props {
  group: RuleNode;
  onChange: (next: RuleNode) => void;
  readOnly?: boolean;
}

export function GroupPriorityEditor({
  group,
  onChange,
  readOnly = false,
}: Props) {
  return (
    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
      <span>{"\u4f18\u5148\u7ea7"}</span>
      <input
        type="number"
        className="w-16 rounded border px-1 py-0.5"
        value={group.priority ?? 100}
        onChange={(e) =>
          onChange({
            ...group,
            priority: Number(e.target.value),
          })
        }
        disabled={readOnly}
      />
      <span>{"\uff08\u6570\u503c\u8d8a\u5927\u8d8a\u91cd\u8981\uff09"}</span>
    </div>
  );
}
