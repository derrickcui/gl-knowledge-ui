import RuleNodeView from "@/components/rule-builder/RuleNodeView";
import { RuleNode } from "@/components/rule-builder/astTypes";
import { ActivePath } from "@/components/rule-builder/pathUtils";

interface Props {
  rule: RuleNode;
  activePath: ActivePath;
  hoverPath?: ActivePath | null;
  onSelect: (path: ActivePath) => void;
  readOnly?: boolean;
}

export function RuleBuilder({
  rule,
  activePath,
  hoverPath,
  onSelect,
  readOnly = false,
}: Props) {
  const hasChildren = Array.isArray(rule.children) && rule.children.length > 0;
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">规则结构</div>
        {readOnly && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
            只读
          </span>
        )}
      </div>
      <div className="mt-3">
        {hasChildren ? (
          <RuleNodeView
            node={rule}
            path={[]}
            activePath={activePath}
            hoverPath={hoverPath}
            onSelect={readOnly ? () => {} : onSelect}
          />
        ) : (
          <div className="rounded-md border border-dashed p-4 text-sm text-slate-500">
            <div>你还没有定义规则</div>
            <div className="mt-1 text-slate-600">
              👉 从左侧选择一个「业务条件入口」开始，例如：
              「涉及什么内容」
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
