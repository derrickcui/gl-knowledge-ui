import type { UiExpressionNode } from "./types";

export function RuleInsightsPanel({ root }: { root: UiExpressionNode | null }) {
  const score = root ? computeStrength(root) : 0;
  const complexity = complexityLabel(root ? countNodes(root) : 0);
  const samples = buildSamples(root);

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="text-sm font-semibold">规则辅助分析</div>
      <div className="mt-3 space-y-4">
        <div>
          <div className="text-xs text-slate-500">规则强度评分</div>
          <div className="mt-1 h-2.5 w-full rounded-full bg-slate-100">
            <div
              className="h-2.5 rounded-full bg-emerald-500"
              style={{ width: `${score}%` }}
            />
          </div>
          <div className="mt-1 text-xs text-slate-600">{score}%</div>
        </div>

        <div>
          <div className="text-xs text-slate-500">规则复杂度</div>
          <div className="mt-1 text-sm font-medium text-slate-700">{complexity}</div>
        </div>

        <div>
          <div className="text-xs text-slate-500">命中示例</div>
          <div className="mt-1 space-y-1 text-sm text-slate-700">
            {samples.map((item) => (
              <div key={item}>- {item}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function countNodes(node: UiExpressionNode): number {
  if (node.type === "LOGIC" || node.type === "POSITION_RELATION" || node.type === "PROXIMITY") {
    return 1 + node.children.reduce((sum, child) => sum + countNodes(child), 0);
  }
  if (node.type === "FIELD" || node.type === "STRUCTURE" || node.type === "NOT" || node.type === "SCORE") {
    return 1 + (node.child ? countNodes(node.child) : 0);
  }
  return 1;
}

function computeStrength(node: UiExpressionNode): number {
  const nodes = countNodes(node);
  const capped = Math.min(90, 35 + nodes * 6);
  return Math.max(30, capped);
}

function complexityLabel(nodeCount: number): string {
  if (nodeCount >= 14) return "较高";
  if (nodeCount >= 8) return "中等";
  if (nodeCount >= 1) return "较低";
  return "未定义";
}

function buildSamples(root: UiExpressionNode | null): string[] {
  if (!root) return ["暂无示例"];
  return ["文档 A（关键词匹配较高）", "文档 B（标题命中）", "文档 C（结构关系命中）"];
}
