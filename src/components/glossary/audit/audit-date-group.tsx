import { AuditRecord } from "@/types/audit";
import { AuditRecordItem } from "./audit-record-item";

export function AuditDateGroup({
  date,
  records,
}: {
  date: string;
  records: AuditRecord[];
}) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-medium text-muted-foreground">
        {date}
      </h3>
      <div className="space-y-2">
        {records.map((r) => (
          <AuditRecordItem key={r.id} record={r} />
        ))}
      </div>
    </section>
  );
}
