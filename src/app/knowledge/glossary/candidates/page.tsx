import PageHeader from "@/components/layout/page-header";
import Toolbar from "@/components/layout/toolbar";

const rows = [
  { term: "User Journey Map", owner: "Product Ops", status: "Candidate", time: "2h ago" },
  { term: "Risk Register", owner: "Compliance", status: "Candidate", time: "5h ago" },
  { term: "Onboarding Checklist", owner: "People Ops", status: "Candidate", time: "1d ago" },
  { term: "Incident Severity", owner: "SRE", status: "Candidate", time: "2d ago" },
];

export default function CandidatesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Glossary Candidates"
        breadcrumb={["Knowledge Assets", "Glossary", "Candidates"]}
        meta="Review, enrich, and promote glossary terms."
      />
      <Toolbar />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">Candidate terms</span>
            <span className="text-xs text-slate-400">Last updated 5 min ago</span>
          </div>
          <div className="mt-4 grid gap-3">
            {rows.map((row) => (
              <div
                key={row.term}
                className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 p-3"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-100">{row.term}</div>
                  <div className="text-xs text-slate-400">
                    {row.owner} · {row.status}
                  </div>
                </div>
                <div className="text-xs text-slate-500">{row.time}</div>
              </div>
            ))}
          </div>
        </section>
        <aside className="hidden flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-300 lg:flex">
          <div className="text-xs uppercase tracking-wide text-slate-500">Evidence / Doc Preview</div>
          <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/60 p-4 text-xs">
            Select a term to preview supporting documents, usage metrics, and related impact.
          </div>
        </aside>
      </div>
    </div>
  );
}
