import { AuditRecord } from "@/types/audit";
import { AuditDateGroup } from "./audit-date-group";
import { AuditEmptyState } from "./audit-empty-state";

function groupByDate(records: AuditRecord[]) {
  const map = new Map<string, AuditRecord[]>();

  records.forEach((r) => {
    const date = r.actedAt.slice(0, 10); // YYYY-MM-DD
    if (!map.has(date)) {
      map.set(date, []);
    }
    map.get(date)!.push(r);
  });

  return Array.from(map.entries()).map(([date, records]) => ({
    date,
    records,
  }));
}

export function AuditTimeline({
  records,
  hasMore,
  loading,
  onLoadMore,
}: {
  records: AuditRecord[];
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
}) {
  if (!records.length) {
    return <AuditEmptyState />;
  }

  const groups = groupByDate(records);

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <AuditDateGroup
          key={g.date}
          date={g.date}
          records={g.records}
        />
      ))}

      {/* Load more */}
      <div className="flex justify-center pt-4">
        {hasMore ? (
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="text-sm underline disabled:opacity-50"
          >
            {loading ? "Loading…" : "Load earlier records"}
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">
            No more records
          </span>
        )}
      </div>
    </div>
  );
}
