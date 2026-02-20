import type { RiskSummary } from "../types";

type RuleRiskPanelProps = {
  summary: RiskSummary;
  complexityLevel: "低" | "中" | "高";
  expanded: boolean;
  onToggleExpanded: () => void;
};

function riskTone(level: RiskSummary["level"]) {
  if (level === "高风险") return "text-red-700 bg-red-50 border-red-200";
  if (level === "中风险") return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-emerald-700 bg-emerald-50 border-emerald-200";
}

export function RuleRiskPanel({
  summary,
  complexityLevel,
  expanded,
  onToggleExpanded,
}: RuleRiskPanelProps) {
  return (
    <div className="space-y-4">
      <section className={`rounded-xl border p-4 ${riskTone(summary.level)}`}>
        <button
          type="button"
          className="w-full text-left"
          onClick={onToggleExpanded}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">风险评估卡片</h3>
            <span className="text-xs">{expanded ? "收起" : "展开详情"}</span>
          </div>
          <div className="mt-2 text-sm">风险评分：{summary.score} / 100</div>
          <div className="mt-1 text-sm">风险等级：{summary.level}</div>
          <div className="mt-1 text-sm">复杂度：{complexityLevel}</div>
        </button>
        {expanded && (
          <ul className="mt-3 space-y-1 border-t border-current/20 pt-3 text-sm">
            {summary.findings.length > 0 ? (
              summary.findings.map((item) => (
                <li key={item.id}>
                  - {item.text} +{item.scoreImpact}
                </li>
              ))
            ) : (
              <li>- 未发现额外风险项</li>
            )}
          </ul>
        )}
      </section>

      <section className="rounded-xl border bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">风险提示</h3>
        {summary.findings.length > 0 ? (
          <ul className="mt-2 space-y-1 text-sm text-amber-700">
            {summary.findings.map((item) => (
              <li key={`warn-${item.id}`}>⚠ {item.text}</li>
            ))}
          </ul>
        ) : (
          <div className="mt-2 text-sm text-emerald-700">未发现结构风险提示</div>
        )}
      </section>
    </div>
  );
}
