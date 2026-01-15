import { GovernanceEvent } from "@/lib/glossary/types";
import { GovernanceTimeline } from "./governance-timeline";

export function TimelineSection({
  events,
}: {
  events: GovernanceEvent[];
}) {
  return (
    <div className="timeline-section">
      <GovernanceTimeline events={events} />
    </div>
  );
}
