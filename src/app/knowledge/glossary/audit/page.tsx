import PageHeader from "@/components/layout/page-header";
import Toolbar from "@/components/layout/toolbar";

export default function AuditPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Glossary Audit"
        breadcrumb={["Knowledge Assets", "Glossary", "Audit"]}
        meta="Track diffs, approvals, and review decisions."
      />
      <Toolbar />
      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-300">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-100">Change queue</span>
          <button className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-200">
            Review diffs
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {["Definition update", "Owner reassignment", "Deprecated term"].map((item) => (
            <div key={item} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <div className="text-sm font-semibold text-slate-100">{item}</div>
              <div className="text-xs text-slate-400">Pending approval · 3 reviewers</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
