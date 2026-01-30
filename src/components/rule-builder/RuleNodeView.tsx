"use client";

import { RuleNode } from "./astTypes";
import { ActivePath, isSamePath } from "./pathUtils";

interface Props {
  node: RuleNode;
  path: ActivePath;
  activePath: ActivePath;
  hoverPath?: ActivePath | null;
  onSelect: (path: ActivePath) => void;
  highlighted?: boolean;
  /**
   * Compact mode: used when embedding inside a ScenarioCard.
   */
  compact?: boolean;
  hideChildren?: boolean;
}

export default function RuleNodeView({
  node,
  path,
  activePath,
  hoverPath,
  onSelect,
  highlighted = false,
  compact = false,
  hideChildren = false,
}: Props) {
  const selected = isSamePath(path, activePath);
  const hovered = !!hoverPath && isSamePath(path, hoverPath);
  const pathKey = path.join("-") || "root";

  return (
    <div className={compact ? "" : "ml-3"}>
      <div
        id={`rule-node-${pathKey}`}
        data-path={pathKey}
        className={`cursor-pointer rounded px-2 py-1 text-sm ${
          selected
            ? "border border-blue-500 bg-blue-50"
            : hovered || highlighted
            ? "border border-amber-400 bg-amber-50"
            : compact
            ? "border border-slate-200 bg-white"
            : "border border-slate-300"
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(path);
        }}
      >
        <NodeLabel node={node} />
        {compact && (
          <div className="mt-1 text-xs text-slate-500">
            {"\u70b9\u51fb\u53ef\u7f16\u8f91"}
          </div>
        )}
      </div>

      {!hideChildren &&
        node.children &&
        node.children.map((child, idx) => (
          <RuleNodeView
            key={`${path.join(".")}-${idx}`}
            node={child}
            path={[...path, idx]}
            activePath={activePath}
            hoverPath={hoverPath}
            onSelect={onSelect}
            compact={compact}
          />
        ))}
    </div>
  );
}

function NodeLabel({ node }: { node: RuleNode }) {
  if (node.explain?.text) {
    return <span>{node.explain.text}</span>;
  }
  switch (node.type) {
    case "GROUP":
      return <span>{"\u6761\u4ef6\u7ec4\u5408"}</span>;
    case "ACCUMULATE":
      return <span>{"\u547d\u4e2d\u4e0e\u8bc4\u5206"}</span>;
    case "CONCEPT_MATCH":
      return (
        <span>
          {"\u6d89\u53ca\u5185\u5bb9\uff1a"}
          {node.params?.conceptName ?? "\u672a\u9009\u62e9"}
        </span>
      );
    case "TOPIC_REF":
      return (
        <span>
          {"\u7b26\u5408\u4e3b\u9898\uff1a"}
          {node.params?.topicName ?? "\u672a\u9009\u62e9"}
        </span>
      );
    case "PROXIMITY":
      return <span>{"\u5185\u5bb9\u4f4d\u7f6e\u7ea6\u675f"}</span>;
    case "LOGIC":
      return <span>{"\u6392\u9664\u6761\u4ef6"}</span>;
    default:
      return <span>{"\u89c4\u5219\u6761\u4ef6"}</span>;
  }
}
