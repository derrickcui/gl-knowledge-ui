import PageHeader from "@/components/layout/page-header";

export default function SearchPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Search"
        breadcrumb={["Knowledge Assets", "Search"]}
        meta="Unified search across glossary, topics, and assets."
      />
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-sm text-slate-300">
        Global search results will appear here. Try wiring this up to your RAG or document index.
      </div>
    </div>
  );
}
