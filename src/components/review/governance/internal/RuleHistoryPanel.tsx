import type { HistoryRecord } from "../types";

type RuleHistoryPanelProps = {
  expanded: boolean;
  onToggle: () => void;
  records: HistoryRecord[];
};

function formatDate(input?: string | null) {
  if (!input) return "-";
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return input;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

export function RuleHistoryPanel({ expanded, onToggle, records }: RuleHistoryPanelProps) {
  const latest = records[0];

  return (
    <section className="rounded-xl border bg-white p-4">
      <button type="button" className="flex w-full items-center justify-between text-left" onClick={onToggle}>
        <h3 className="text-sm font-semibold text-slate-900">历史变更记录（可折叠）</h3>
        <span className="text-xs text-slate-500">{expanded ? "收起" : "展开"}</span>
      </button>

      {latest ? (
        <div className="mt-3 text-sm text-slate-700">
          v{latest.fromRevision ?? Math.max(latest.revision - 1, 0)} {"->"} v{latest.revision} {latest.actor} {formatDate(latest.time)}
        </div>
      ) : (
        <div className="mt-3 text-sm text-slate-500">暂无历史记录</div>
      )}

      {expanded && records.length > 0 && (
        <div className="mt-3 space-y-2 border-t pt-3">
          {records.map((record) => (
            <div key={`history-${record.revision}`} className="rounded border p-3 text-sm">
              <div className="font-medium text-slate-800">
                v{record.fromRevision ?? Math.max(record.revision - 1, 0)} {"->"} v{record.revision}
              </div>
              <div className="mt-1 text-slate-600">修改人：{record.actor}</div>
              <div className="mt-1 text-slate-600">修改时间：{formatDate(record.time)}</div>
              <div className="mt-1 text-slate-600">修改摘要：{record.summary}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
