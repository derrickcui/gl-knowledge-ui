"use client";

import { RuleNode } from "./astTypes";
import { ActivePath, isSamePath } from "./pathUtils";

interface Props {
  node: RuleNode;
  path: ActivePath;
  activePath: ActivePath;
  hoverPath?: ActivePath | null;
  onSelect: (path: ActivePath) => void;
}

export default function RuleNodeView({
  node,
  path,
  activePath,
  hoverPath,
  onSelect,
}: Props) {
  const selected = isSamePath(path, activePath);
  const highlighted =
    !!hoverPath && isSamePath(path, hoverPath);
  const pathKey = path.join("-") || "root";

  return (
    <div className="ml-3">
      <div
        id={`rule-node-${pathKey}`}
        data-path={pathKey}
        className={`cursor-pointer rounded border px-2 py-1 text-sm ${
          selected
            ? "border-blue-500 bg-blue-50"
            : highlighted
            ? "border-amber-400 bg-amber-50"
            : "border-slate-300"
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(path);
        }}
      >
        <NodeLabel node={node} />
      </div>

      {node.children &&
        node.children.map((child, idx) => (
          <RuleNodeView
            key={`${path.join(".")}-${idx}`}
            node={child}
            path={[...path, idx]}
            activePath={activePath}
            hoverPath={hoverPath}
            onSelect={onSelect}
          />
        ))}
    </div>
  );
}

function NodeLabel({ node }: { node: RuleNode }) {
  switch (node.type) {
    case "GROUP":
      return <span>条件组合</span>;
    case "ACCUMULATE":
      return <span>命中与评分</span>;
    case "CONCEPT_MATCH":
      return (
        <span>
          涉及概念：{node.params?.conceptName ?? "未选择"}
        </span>
      );
    case "TOPIC_REF":
      return (
        <span>
          符合主题：{node.params?.topicName ?? "未选择"}
        </span>
      );
    case "PROXIMITY":
      return <span>上下文约束</span>;
    case "LOGIC":
      return <span>排除条件</span>;
    default:
      return <span>规则条件</span>;
  }
}
