import { GovernanceEvent } from "./types";
import { DECISION_EVENTS } from "./event-types";

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
      return "Extracted by system";
    case "REQUEST_SUBMITTED":
      return "Submitted for review";
    case "APPROVED":
      return `Approved by ${event.operator}`;
    case "REJECTED":
      return `Rejected by ${event.operator}`;
    case "PUBLISHED":
      return "Published";
    case "ARCHIVED":
      return "Archived";
    default:
      return event.type;
  }
}
