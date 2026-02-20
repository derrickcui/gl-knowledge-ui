import type { ComplexityMetrics } from "../types";

type RuleComplexityPanelProps = {
  metrics: ComplexityMetrics;
};

export function RuleComplexityPanel({ metrics }: RuleComplexityPanelProps) {
  return (
    <section className="rounded-xl border bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">结构与复杂度分析</h3>
      <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-5">
        <div>逻辑深度：{metrics.logicDepth}</div>
        <div>条件数量：{metrics.conditionCount}</div>
        <div>OR数量：{metrics.orCount}</div>
        <div>排除条件：{metrics.excludeCount > 0 ? metrics.excludeCount : "无"}</div>
        <div>结构健康度：{metrics.health}</div>
      </div>
    </section>
  );
}
