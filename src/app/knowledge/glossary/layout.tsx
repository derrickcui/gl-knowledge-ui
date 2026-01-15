import { fetchApprovals } from "@/lib/api";
import { GlossaryTabs } from "@/components/glossary/glossary-tabs";

export default async function GlossaryLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const approvals = await fetchApprovals({
    status: "PENDING",
    limit: 50,
    offset: 0,
  });
  const pendingCount = approvals.total;

  return (
    <div className="min-h-full">
      <div className="border-b bg-background p-3">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Glossary</div>
          <GlossaryTabs pendingCount={pendingCount} />
        </div>
      </div>

      <div className="p-4">{children}</div>
    </div>
  );
}
