"use client";

import { ChecklistSummary } from "./checklistTypes";

export default function ReviewerChecklist({
  summary,
}: {
  summary: ChecklistSummary;
}) {
  const statusColor = summary.decision.canApprove
    ? "border-green-400 bg-green-50"
    : "border-red-400 bg-red-50";
  const importanceScenarios = summary.importance?.scenarios ?? [];

  return (
    <div className={`rounded border p-3 ${statusColor}`}>
      <div className="text-sm font-semibold">
        评审清单（Review Checklist）
      </div>

      <div className="mt-2 text-sm">
        <div className="font-medium">1. 规则语义变更</div>
        <ul className="ml-4 list-disc text-xs text-slate-700">
          <li>新增：{summary.explain.added} 项</li>
          <li>修改：{summary.explain.modified} 项</li>
          <li>删除：{summary.explain.removed} 项</li>
        </ul>
      </div>

      <div className="mt-2 text-sm">
        <div className="font-medium">2. 规则质量与风险</div>
        <ul className="ml-4 list-disc text-xs text-slate-700">
          <li>严重问题：{summary.antiPattern.errors}</li>
          <li>潜在问题：{summary.antiPattern.warnings}</li>
          <li>提示：{summary.antiPattern.infos}</li>
        </ul>
      </div>

      <div className="mt-2 text-sm">
        <div className="font-medium">3. 条件重要性</div>
        {importanceScenarios.length ? (
          <div className="mt-1 space-y-2 text-xs text-slate-700">
            {importanceScenarios.map((scenario) => (
              <div key={scenario.title}>
                <div className="font-medium text-slate-800">
                  {scenario.title}
                </div>
                <div className="mt-1">
                  判断方式：满足条件并综合重要性判断
                </div>
                <div className="mt-1">条件重要性分布：</div>
                <ul className="ml-4 list-disc text-xs text-slate-700">
                  <li>重要：{scenario.counts.high}</li>
                  <li>一般：{scenario.counts.normal}</li>
                  <li>次要：{scenario.counts.low}</li>
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-1 text-xs text-slate-500">未启用</div>
        )}
      </div>

      <div className="mt-2 text-sm">
        <div className="font-medium">4. 评审结论</div>
        {summary.decision.canApprove ? (
          <div className="text-xs text-green-700">
            ✅ 当前规则满足发布条件
          </div>
        ) : (
          <div className="text-xs text-red-700">
            ❌ 当前规则不满足发布条件
            <div>原因：{summary.decision.reason}</div>
          </div>
        )}
      </div>
    </div>
  );
}
