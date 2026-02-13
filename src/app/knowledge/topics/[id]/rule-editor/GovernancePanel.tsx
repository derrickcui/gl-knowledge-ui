import type { NodeDiffDetail } from "./diff";
import type { ValidationIssue } from "./validation";
import type { UiCapabilityViewModel } from "./types";

export function GovernancePanel({
  capability,
  issues,
  diff,
}: {
  capability: UiCapabilityViewModel;
  issues: ValidationIssue[];
  diff: NodeDiffDetail;
}) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="text-sm font-semibold">能力与校验状态区</div>
      <div className="mt-3 grid gap-4 md:grid-cols-3 text-sm">
        <div>
          <div className="font-medium">模板能力</div>
          <div className="mt-1 text-xs text-slate-700">
            组合方式：{capability.semantic.allowModes.join(" / ")}
          </div>
          <div className="text-xs text-slate-700">
            结构关系：{capability.structure.allowRelation.filter((r) => r !== "NONE").join(" / ") || "无"}
          </div>
          <div className="text-xs text-slate-700">
            位置范围：{capability.where.allowFields.join(" / ")}
          </div>
        </div>

        <div>
          <div className="font-medium">校验状态</div>
          {issues.length === 0 ? (
            <div className="mt-1 text-xs text-emerald-700">✓ 当前规则结构合法</div>
          ) : (
            issues.slice(0, 3).map((issue, idx) => (
              <div key={`${issue.nodeId}-${idx}`} className="mt-1 text-xs text-amber-700">
                ⚠ {issue.message}
              </div>
            ))
          )}
        </div>

        <div>
          <div className="font-medium">差异预览</div>
          <div className="mt-1 text-xs text-slate-700">+ 新增 {diff.added}</div>
          <div className="text-xs text-slate-700">- 删除 {diff.removed}</div>
          <div className="text-xs text-slate-700">~ 修改 {diff.changed}</div>
        </div>
      </div>
    </div>
  );
}

