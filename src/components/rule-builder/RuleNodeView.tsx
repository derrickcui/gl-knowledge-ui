"use client";

import { RuleNode } from "./astTypes";
import { ActivePath, isSamePath } from "./pathUtils";
import { t } from "@/i18n";

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
            {t("ruleNodeView.hint.edit")}
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
      return <span>{t("ruleNodeView.label.group")}</span>;
    case "ACCUMULATE":
      return <span>{t("ruleNodeView.label.accumulate")}</span>;
    case "CONCEPT_MATCH":
      return (
        <span>
          {t("ruleNodeView.label.conceptPrefix")}
          {node.params?.conceptName ?? t("ruleNodeView.label.unselected")}
        </span>
      );
    case "TOPIC_REF":
      return (
        <span>
          {t("ruleNodeView.label.topicPrefix")}
          {node.params?.topicName ?? t("ruleNodeView.label.unselected")}
        </span>
      );
    case "PROXIMITY":
      return <span>{t("ruleNodeView.label.proximity")}</span>;
    case "LOGIC":
      return <span>{t("ruleNodeView.label.logic")}</span>;
    default:
      return <span>{t("ruleNodeView.label.default")}</span>;
  }
}
