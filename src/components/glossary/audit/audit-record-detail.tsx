import { AuditRecord } from "@/types/audit";

export function AuditRecordDetail({
  record,
  onViewSnapshot,
}: {
  record: AuditRecord;
  onViewSnapshot: () => void;
}) {
  return (
    <div className="border-t bg-muted px-4 py-3 text-sm">
      {record.reason && (
        <div className="mb-2">
          <div className="font-medium">Reason</div>
          <div className="text-muted-foreground">{record.reason}</div>
        </div>
      )}

      {record.version && (
        <div className="mb-2">
          <div className="font-medium">Version</div>
          <div className="text-muted-foreground">{record.version}</div>
        </div>
      )}

      <div className="flex gap-4 pt-2 text-sm">
        <button
          className="underline"
          onClick={onViewSnapshot}
        >
          View Snapshot
        </button>

        <button className="underline">
          View Current
        </button>
      </div>
    </div>
  );
}
