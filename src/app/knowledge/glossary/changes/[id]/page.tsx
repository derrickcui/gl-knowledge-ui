import ChangeDiff from "@/components/glossary/change-diff";
import PageHeader from "@/components/layout/page-header";

export default function ChangeDetailPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Change Request"
        breadcrumb={["Knowledge Assets", "Glossary", "Changes", "Detail"]}
        meta="Review diffs and approval context."
      />
      <ChangeDiff />
    </div>
  );
}
