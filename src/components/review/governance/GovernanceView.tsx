import type { ComplexityMetrics, RiskSummary, TemplateCheckItem } from "./types";

type GovernanceViewProps = {
  risk: RiskSummary;
  complexity: ComplexityMetrics;
  templateChecks: TemplateCheckItem[];
  onRiskSignalClick: (targetNodeId?: string | null) => void;
};

function scoreTone(score: number) {
  if (score >= 70) return "text-red-700";
  if (score >= 40) return "text-amber-700";
  return "text-emerald-700";
}

export function GovernanceView({
  risk,
  complexity,
  templateChecks,
  onRiskSignalClick,
}: GovernanceViewProps) {
  const fillPercent = Math.max(0, Math.min(100, complexity.score));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-xl border bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">风险评估</h3>
        <div className={`mt-3 text-lg font-semibold ${scoreTone(risk.score)}`}>
          {risk.score} / 100
        </div>
        <div className="text-sm text-slate-600">风险等级：{risk.level}</div>
        <div className="mt-3 space-y-2">
          {risk.findings.length > 0 ? (
            risk.findings.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onRiskSignalClick(item.targetNodeId)}
                className="w-full rounded border border-amber-200 bg-amber-50 px-3 py-2 text-left text-sm text-amber-800 hover:bg-amber-100"
              >
                ⚠ {item.text}
                {item.scoreImpact > 0 ? ` (+${item.scoreImpact})` : ""}
              </button>
            ))
          ) : (
            <div className="text-sm text-emerald-700">未发现风险信号</div>
          )}
        </div>
      </section>

      <section className="rounded-xl border bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">复杂度分析</h3>
        <div className="mt-3 text-sm text-slate-700">复杂度评分：{complexity.score}</div>
        <div className="mt-2 h-2 overflow-hidden rounded bg-slate-100">
          <div className="h-full bg-slate-900" style={{ width: `${fillPercent}%` }} />
        </div>
        <div className="mt-3 grid gap-2 text-sm text-slate-700">
          <div>深度：{complexity.logicDepth}</div>
          <div>子句数：{complexity.conditionCount}</div>
          <div>逻辑组数：{complexity.orCount + complexity.excludeCount + 1}</div>
          <div>复杂度等级：{complexity.level}</div>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-4 lg:col-span-2">
        <h3 className="text-sm font-semibold text-slate-900">模板校验</h3>
        <ul className="mt-3 space-y-2 text-sm">
          {templateChecks.map((item) => (
            <li key={item.id} className={item.passed ? "text-emerald-700" : "text-red-700"}>
              {item.passed ? "✔" : "✖"} {item.text}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
