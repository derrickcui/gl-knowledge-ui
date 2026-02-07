import { fetchApprovals, isServiceDownError } from "@/lib/api";
import { GlossaryHeader } from "@/components/glossary/glossary-header";

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
        <GlossaryHeader pendingCount={pendingCount} />
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
