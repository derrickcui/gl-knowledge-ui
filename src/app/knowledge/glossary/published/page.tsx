import PageHeader from "@/components/layout/page-header";
import Toolbar from "@/components/layout/toolbar";

export default function PublishedPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Glossary Published"
        breadcrumb={["Knowledge Assets", "Glossary", "Published"]}
        meta="Live terms available across teams."
      />
      <Toolbar />
      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <div className="text-sm font-semibold">Published glossary entries</div>
        <div className="mt-4 grid gap-3">
          {["Service Level Objective", "Data Retention", "Incident Response"].map((term) => (
            <div
              key={term}
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 p-3"
            >
              <div className="text-sm font-semibold text-slate-100">{term}</div>
              <div className="text-xs text-slate-500">Updated this week</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
