import { fetchApprovals } from "@/lib/api";
import { ApprovalTable } from "@/components/glossary/approval/approval-table";

export default async function ApprovalsPage() {
  const approvals = await fetchApprovals({
    status: "PENDING",
    limit: 50,
    offset: 0,
  });

  return (
    <div className="space-y-4">
      <div>
        <div className="text-lg font-semibold">Approvals</div>
        <p className="mt-2 text-sm opacity-70">
          Terms under review that require your decision.
        </p>
      </div>

      <ApprovalTable items={approvals.items} />
    </div>
  );
}
