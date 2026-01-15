import { GovernanceEvent } from "@/lib/glossary/types";
import { sortEventsAsc } from "@/lib/glossary/event-utils";
import { TimelineItem } from "./timeline-item";

export function GovernanceTimeline({
  events,
  title = "Governance History",
}: {
  events: GovernanceEvent[];
  title?: string;
}) {
  if (!events || events.length === 0) return null;

  const sorted = sortEventsAsc(events);

  return (
    <section>
      <h3>{title}</h3>
      <ul className="timeline">
        {sorted.map(event => (
          <TimelineItem key={event.id} event={event} />
        ))}
      </ul>
    </section>
  );
}
