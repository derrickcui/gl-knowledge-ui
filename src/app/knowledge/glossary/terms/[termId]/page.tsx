import { GovernanceTimeline } from "@/components/glossary/timeline/governance-timeline";
import { GovernanceEvent } from "@/lib/glossary/types";
import { fetchGlossaryConcept } from "@/lib/glossary-api";

export default async function TermPage({ params }: { params: Promise<{ termId: string }> }) {
  const { termId: termIdRaw } = await params;
  const termId = Number(termIdRaw);
  const term = Number.isFinite(termId) ? await fetchGlossaryConcept(termId) : null;
  const events = (term?.evidence as GovernanceEvent[] | undefined) ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{term?.canonical ?? termIdRaw}</h1>
        <p className="mt-1 text-sm text-slate-400">Glossary term detail</p>
        <GovernanceTimeline events={events} />
      </div>
    </div>
  );
}

