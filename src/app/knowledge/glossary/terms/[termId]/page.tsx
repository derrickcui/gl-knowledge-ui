import { fetchTerm } from "@/lib/glossary/api";
import { GovernanceTimeline } from "@/components/glossary/timeline/governance-timeline";

export default async function TermPage({ params }) {
  const term = await fetchTerm(params.termId);

  return (
    <div className="page two-col">
      <div>
        {/* 你已有的 TermHeader / Content */}

        <GovernanceTimeline
          events={term.events}   // ← 后端返回 unified events
        />
      </div>

      {/* GovernanceActionPanel 保持不变 */}
    </div>
  );
}
