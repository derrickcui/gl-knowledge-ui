import { ApprovalDTO } from "@/lib/api";
import { ApprovalRow } from "./approval-row";

export function ApprovalTable({
  items,
}: {
  items: ApprovalDTO[];
}) {
  return (
    <div className="overflow-auto rounded-md border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border-b px-3 py-2 text-left">Term</th>
            <th className="border-b px-3 py-2 text-left">Status</th>
            <th className="border-b px-3 py-2 text-left">
              Submitted At
            </th>
            <th className="border-b px-3 py-2 text-right" />
          </tr>
        </thead>
        <tbody>
          {items.map((candidate) => (
            <ApprovalRow
              key={candidate.id}
              candidate={candidate}
            />
          ))}
          {!items.length && (
            <tr>
              <td
                colSpan={4}
                className="px-3 py-6 text-center text-sm opacity-60"
              >
                No approvals waiting
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
