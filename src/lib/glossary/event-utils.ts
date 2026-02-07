import { GovernanceEvent } from "./types";
import { DECISION_EVENTS } from "./event-types";
import { t } from "@/i18n";

export function sortEventsAsc(events: GovernanceEvent[]) {
  return [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

export function isDecisionEvent(type: string) {
  return DECISION_EVENTS.includes(type as any);
}

export function getEventLabel(event: GovernanceEvent): string {
  switch (event.type) {
    case "EXTRACTED":
      return t("glossary.timeline.extracted");
    case "REQUEST_SUBMITTED":
      return t("glossary.timeline.submitted");
    case "APPROVED":
      return t("glossary.timeline.approved", {
        operator: event.operator ?? "",
      });
    case "REJECTED":
      return t("glossary.timeline.rejected", {
        operator: event.operator ?? "",
      });
    case "PUBLISHED":
      return t("glossary.timeline.published");
    case "ARCHIVED":
      return t("glossary.timeline.archived");
    default:
      return event.type;
  }
}
