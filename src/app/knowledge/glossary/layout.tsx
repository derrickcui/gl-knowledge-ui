import { fetchApprovals, isServiceDownError } from "@/lib/api";
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
  const pendingCount = approvals.data?.total ?? 0;
  const serviceError = isServiceDownError(approvals.error)
    ? approvals.error
    : null;

  return (
    <div className="min-h-full">
      <div className="border-b bg-background p-3">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Glossary</div>
          <GlossaryTabs pendingCount={pendingCount} />
        </div>
      </div>

      <div className="space-y-4 p-4">
        {serviceError && (
          <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800">
            {serviceError}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
