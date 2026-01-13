import PageHeader from "@/components/layout/page-header";

export default function TopicsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Topics"
        breadcrumb={["Knowledge Assets", "Topics"]}
        meta="Topic sets and GQL will ship in a future release."
      />
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-sm text-slate-300">
        Topics and topic sets are marked as Coming Soon for V1. Use Glossary to manage terms today.
      </div>
    </div>
  );
}
