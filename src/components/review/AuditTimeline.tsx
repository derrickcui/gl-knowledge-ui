"use client";

import { AuditEvent } from "./auditTypes";
import { t } from "@/i18n";

export default function AuditTimeline({
  events,
}: {
  events: AuditEvent[];
}) {
  return (
    <div className="rounded border p-3">
      <div className="mb-2 text-sm font-semibold">
        {t("review.audit.title")}
      </div>
      {events.length === 0 ? (
        <div className="text-xs text-slate-500">
          {t("review.audit.empty")}
        </div>
      ) : (
        <ul className="space-y-2 text-sm">
          {events.map((event) => (
            <li key={event.id}>
              <div className="flex items-start justify-between gap-3">
                <span>
                  <strong>{humanizeAction(event.action)}</strong>{" "}
                  <span className="text-slate-600">
                    {t("review.audit.by", { actor: event.actor })}
                  </span>
                </span>
                <span className="text-xs text-slate-500">
                  {new Date(event.createdAt).toLocaleString()}
                </span>
              </div>
              {(event.fromStatus || event.toStatus) && (
                <div className="text-xs text-slate-600">
                  {t("review.audit.statusTransition", {
                    from:
                      event.fromStatus ??
                      t("review.audit.statusPlaceholder"),
                    to:
                      event.toStatus ??
                      t("review.audit.statusPlaceholder"),
                  })}
                </div>
              )}
              {event.reason && (
                <div className="mt-1 text-xs text-slate-700">
                  {t("review.audit.reason", { reason: event.reason })}
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
      return t("review.audit.action.submit");
    case "APPROVE_REVIEW":
      return t("review.audit.action.approve");
    case "REJECT_REVIEW":
      return t("review.audit.action.reject");
    case "PUBLISH_TOPIC":
      return t("review.audit.action.publish");
    default:
      return action;
  }
}
