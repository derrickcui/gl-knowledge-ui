import { t } from "@/i18n";
import type { RuntimeImpactCondition } from "@/lib/api/ruleRuntime";

export function ImpactPanel({
  analysis,
  onSelectNode,
}: {
  analysis: RuntimeImpactCondition[];
  onSelectNode?: (nodeId: string) => void;
}) {
  const max = Math.max(1, ...analysis.map((item) => Math.max(0, item.contribution)));

  return (
    <div className="min-h-0 rounded border bg-white p-3">
      <div className="mb-2 text-xs font-semibold text-rose-700">IMPACT</div>
      <div className="space-y-2 overflow-auto">
        {analysis.length === 0 ? (
          <div className="rounded border border-dashed p-3 text-xs text-slate-500">
            {t("ruleEditor.preview.impact.ranking.empty")}
          </div>
        ) : (
          analysis.map((item, index) => (
            <button
              key={`${item.nodeId}-${index}`}
              type="button"
              className="w-full rounded border px-2 py-2 text-left text-xs hover:bg-slate-50"
              onClick={() => onSelectNode?.(item.nodeId)}
              title={`${t("ruleEditor.preview.impact.ranking.col.removedTotal")}: ${item.removedTotal}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium text-slate-800">{item.label}</span>
                <span className={impactLevelClass(item.impactLevel)}>{item.impactLevel}</span>
              </div>
              <div className="mt-1 text-slate-600">
                {t("ruleEditor.preview.impact.ranking.col.contribution")}: {item.contribution}
              </div>
              <div className="mt-1 h-2 rounded bg-slate-100">
                <div className="h-full rounded bg-rose-500" style={{ width: `${(Math.max(0, item.contribution) / max) * 100}%` }} />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function impactLevelClass(level: RuntimeImpactCondition["impactLevel"]) {
  if (level === "HIGH") return "text-red-600";
  if (level === "MEDIUM") return "text-amber-600";
  if (level === "LOW") return "text-sky-600";
  return "text-slate-500";
}
