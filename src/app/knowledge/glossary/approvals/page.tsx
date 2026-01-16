import { fetchApprovals } from "@/lib/api";
import { ApprovalsView } from "./approvals-view";

export default async function ApprovalsPage() {
  const response = await fetchApprovals({
    status: "PENDING",
    limit: 50,
    offset: 0,
  });
  const approvals = response.data ?? { items: [], total: 0 };

  return <ApprovalsView initialItems={approvals.items} />;
}
