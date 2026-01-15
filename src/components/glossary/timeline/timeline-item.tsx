import { GovernanceEvent } from "@/lib/glossary/types";
import { getEventLabel, isDecisionEvent } from "@/lib/glossary/event-utils";

export function TimelineItem({ event }: { event: GovernanceEvent }) {
  const isDecision = isDecisionEvent(event.type);

  return (
    <li className={`timeline-item ${isDecision ? "decision" : "system"}`}>
      <div className="timeline-header">
        <strong>{getEventLabel(event)}</strong>
        <span className="time">{event.timestamp}</span>
      </div>

      {event.reason && (
        <div className="timeline-reason">
          <strong>Reason</strong>
          <p>{event.reason}</p>
        </div>
      )}
    </li>
  );
}
