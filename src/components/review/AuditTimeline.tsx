"use client";

import { AuditEvent } from "./auditTypes";

export default function AuditTimeline({
  events,
}: {
  events: AuditEvent[];
}) {
  return (
    <div className="rounded border p-3">
      <div className="mb-2 text-sm font-semibold">操作审计</div>
      {events.length === 0 ? (
        <div className="text-xs text-slate-500">暂无记录。</div>
      ) : (
        <ul className="space-y-2 text-sm">
          {events.map((event) => (
            <li key={event.id}>
              <div className="flex items-start justify-between gap-3">
                <span>
                  <strong>{humanizeAction(event.action)}</strong>{" "}
                  <span className="text-slate-600">
                    by {event.actor}
                  </span>
                </span>
                <span className="text-xs text-slate-500">
                  {new Date(event.createdAt).toLocaleString()}
                </span>
              </div>
              {(event.fromStatus || event.toStatus) && (
                <div className="text-xs text-slate-600">
                  状态：{event.fromStatus ?? "—"} →{" "}
                  {event.toStatus ?? "—"}
                </div>
              )}
              {event.reason && (
                <div className="mt-1 text-xs text-slate-700">
                  原因：{event.reason}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function humanizeAction(action: string) {
  switch (action) {
    case "SUBMIT_REVIEW":
      return "提交评审";
    case "APPROVE_REVIEW":
      return "通过评审";
    case "REJECT_REVIEW":
      return "拒绝评审";
    case "PUBLISH_TOPIC":
      return "发布规则";
    default:
      return action;
  }
}
