import { GovernanceEvent } from "@/lib/glossary/types";
import { sortEventsAsc } from "@/lib/glossary/event-utils";
import { TimelineItem } from "./timeline-item";
import { t } from "@/i18n";

export function GovernanceTimeline({
  events,
  title,
}: {
  events: GovernanceEvent[];
  title?: string;
}) {
  if (!events || events.length === 0) return null;

  const sorted = sortEventsAsc(events);
  const resolvedTitle = title ?? t("glossary.timeline.title");

  return (
    <section>
      <h3>{resolvedTitle}</h3>
      <ul className="timeline">
        {sorted.map((event) => (
          <TimelineItem key={event.id} event={event} />
        ))}
      </ul>
    </section>
  );
}
