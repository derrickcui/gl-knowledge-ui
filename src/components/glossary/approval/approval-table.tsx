import { ApprovalDTO } from "@/lib/api";
import { ApprovalRow } from "./approval-row";
import { t } from "@/i18n";

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
            <th className="border-b px-3 py-2 text-left">
              {t("glossary.approvals.table.term")}
            </th>
            <th className="border-b px-3 py-2 text-left">
              {t("glossary.approvals.table.status")}
            </th>
            <th className="border-b px-3 py-2 text-left">
              {t("glossary.approvals.table.submittedAt")}
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
                {t("glossary.approvals.table.empty")}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
