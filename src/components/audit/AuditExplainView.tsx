"use client";

import { AuditSnapshot } from "@/lib/audit/auditTypes";

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
            {`\u5224\u65ad\u573a\u666f ${idx + 1}\uff08\u4f18\u5148\u7ea7 ${
              group.priority
            }\uff09`}
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
