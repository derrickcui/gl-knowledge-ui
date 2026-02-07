"use client";

import { RuleNode } from "./astTypes";
import { t } from "@/i18n";

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
      <span>{t("groupPriority.label")}</span>
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
      <span>{t("groupPriority.hint")}</span>
    </div>
  );
}
