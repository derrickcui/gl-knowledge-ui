import { AuditRecord } from "@/types/audit";

export function AuditRecordSummary({
  record,
  onClick,
}: {
  record: AuditRecord;
  onClick: () => void;
}) {
  const timeLabel = new Date(record.actedAt).toLocaleTimeString(
    [],
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );

  return (
    <div
      onClick={onClick}
      className="flex cursor-pointer gap-4 px-4 py-3 hover:bg-muted"
    >
      <div className="w-12 shrink-0 text-xs text-muted-foreground">
        {timeLabel}
      </div>

      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2 text-xs font-medium">
          <span className="inline-block h-2 w-2 rounded-full bg-foreground" />
          <span>{record.action}</span>
        </div>
        <div className="text-sm font-medium">
          {record.conceptName}
        </div>
        <div className="text-xs text-muted-foreground">
          by {record.actor}
        </div>
      </div>
    </div>
  );
}
