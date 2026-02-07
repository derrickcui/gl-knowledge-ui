"use client";

import { AuditSnapshot } from "@/lib/audit/auditTypes";
import { t } from "@/i18n";

export function AuditExplainView({
  snapshot,
}: {
  snapshot: AuditSnapshot;
}) {
  return (
    <div className="space-y-4">
      <div className="whitespace-pre-wrap text-sm text-slate-700">
        {snapshot.ruleExplain}
      </div>

      {snapshot.groups.map((group, idx) => (
        <div
          key={group.groupId}
          className={`rounded border p-3 ${
            group.matched
              ? "border-green-500 bg-green-50"
              : "opacity-60"
          }`}
        >
          <div className="mb-1 font-medium">
            {t("audit.explain.groupTitle", {
              index: idx + 1,
              priority: group.priority,
            })}
          </div>

          <div className="mb-2 text-sm text-slate-600">
            {group.explainHeader}
          </div>

          <ul className="space-y-1 text-sm">
            {group.conditions.map((condition) => (
              <li
                key={condition.conditionId}
                className={`border-l-2 pl-2 ${
                  condition.matched
                    ? "border-green-500"
                    : "border-transparent"
                }`}
              >
                {condition.explain}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
