import type { LogicNode } from "../types";

type RuleStructureViewProps = {
  root: LogicNode | null;
};

function TreeNode({ node, depth }: { node: LogicNode; depth: number }) {
  const isLeaf = node.kind === "TERM";

  return (
    <div style={{ marginLeft: depth * 14 }}>
      <div
        className={`mb-2 rounded border px-3 py-2 text-left text-sm ${
          isLeaf
            ? "border-slate-200 bg-slate-50 text-slate-800"
            : "border-sky-200 bg-sky-50 text-sky-900"
        } ${isLeaf ? "w-full" : "font-semibold"}`}
      >
        {node.label}
      </div>
      {node.children.map((child) => (
        <TreeNode key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export function RuleStructureView({ root }: RuleStructureViewProps) {
  return (
    <section className="rounded-xl border bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">逻辑结构视图</h3>
      <div className="mt-3">
        {root ? (
          <TreeNode node={root} depth={0} />
        ) : (
          <div className="rounded border border-dashed p-3 text-sm text-slate-500">暂无结构条件</div>
        )}
      </div>
    </section>
  );
}
