import type { UiCapabilityViewModel, UiExpressionNode, UiNodeType } from "./types";
import type { NodeDiffStatus } from "./diff";
import { getAllowedChildTypes } from "./tree-utils";
import { t } from "@/i18n";

export function ExpressionNodeRenderer({
  node,
  selectedNodeId,
  collapsed,
  depth,
  readOnly,
  capability,
  onSelect,
  onToggleCollapse,
  onAddChild,
  onDelete,
  onWrap,
  onMoveChild,
  onEditTermSet,
  diffMode,
  diffStatusById,
}: {
  node: UiExpressionNode;
  selectedNodeId: string | null;
  collapsed: Set<string>;
  depth: number;
  readOnly: boolean;
  capability: UiCapabilityViewModel;
  onSelect: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  onAddChild: (parentId: string, type: UiNodeType) => void;
  onDelete: (nodeId: string) => void;
  onWrap: (nodeId: string, wrapper: "LOGIC" | "NOT" | "PROXIMITY") => void;
  onMoveChild: (parentId: string, childId: string, direction: "up" | "down") => void;
  onEditTermSet: (nodeId: string) => void;
  diffMode: boolean;
  diffStatusById: Record<string, NodeDiffStatus>;
}) {
  const selected = selectedNodeId === node.id;
  const isCollapsed = collapsed.has(node.id);
  const canHaveChildren = node.type === "LOGIC" || node.type === "PROXIMITY";
  const canHaveSingleChild = node.type === "FIELD" || node.type === "NOT" || node.type === "SCORE";
  const accent = depthAccent(depth);
  const diffStatus = diffStatusById[node.id];
  const diffClass =
    diffMode && diffStatus === "added"
      ? "ring-2 ring-emerald-400"
      : diffMode && diffStatus === "changed"
      ? "ring-2 ring-amber-400"
      : "";

  const canWrapLogic = node.type !== "FIELD";
  const canWrapNot = Boolean(capability.advanced.allowNot) && node.type !== "NOT";
  const canWrapProximity = capability.structure.allowRelation.some((item) => item !== "NONE") && node.type === "LOGIC";

  return (
    <div className="space-y-2">
      <div
        className={`rounded-md border border-l-4 p-3 ${selected ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"} ${accent} ${diffClass}`}
        style={{ marginLeft: depth * 16 }}
      >
        <div className="flex items-center justify-between gap-2">
          <button type="button" className="text-left" onClick={() => onSelect(node.id)}>
            <div className="text-xs text-slate-500">{t("ruleEditor.tree.level", { level: depth + 1 })}</div>
            <div className="text-sm font-semibold">{nodeLabel(node)}</div>
          </button>
          <div className="flex items-center gap-2">
            {diffMode && diffStatus && (
              <span
                className={`rounded px-2 py-0.5 text-[11px] ${
                  diffStatus === "added" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {diffStatus === "added" ? t("ruleEditor.tree.diff.added") : t("ruleEditor.tree.diff.changed")}
              </span>
            )}
            {(canHaveChildren || canHaveSingleChild) && (
              <button
                type="button"
                className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
                onClick={() => onToggleCollapse(node.id)}
              >
                {isCollapsed ? t("drawer.expand") : t("drawer.collapse")}
              </button>
            )}
          </div>
        </div>

        {!readOnly && (
          <div className="mt-3 flex flex-wrap gap-2">
            {getAllowedChildTypes(node, capability).map((type) => (
              <button
                key={type}
                type="button"
                className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
                onClick={() => onAddChild(node.id, type)}
              >
                + {addButtonLabel(type)}
              </button>
            ))}

            {canWrapLogic && (
              <button
                type="button"
                className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
                onClick={() => onWrap(node.id, "LOGIC")}
              >
                {t("ruleEditor.tree.wrap.logic")}
              </button>
            )}

            {canWrapNot && (
              <button
                type="button"
                className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
                onClick={() => onWrap(node.id, "NOT")}
              >
                {t("ruleEditor.tree.wrap.not")}
              </button>
            )}

            {canWrapProximity && (
              <button
                type="button"
                className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
                onClick={() => onWrap(node.id, "PROXIMITY")}
              >
                {t("ruleEditor.tree.wrap.proximity")}
              </button>
            )}

            <button
              type="button"
              className="rounded border px-2 py-1 text-xs text-red-600 hover:bg-red-50"
              onClick={() => onDelete(node.id)}
            >
              {t("ruleEditor.condition.remove")}
            </button>
          </div>
        )}

        {!readOnly && node.type === "TERM_SET" && (
          <div className="mt-2">
            <button
              type="button"
              className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
              onClick={() => onEditTermSet(node.id)}
            >
              {t("ruleEditor.tree.term.select")}
            </button>
          </div>
        )}

        {node.type === "TERM_SET" && (
          <div className="mt-2 rounded border bg-slate-50 p-2 text-xs text-slate-700">
            {node.terms.length === 0 ? (
              <div>{t("ruleEditor.tree.term.empty")}</div>
            ) : (
              <div className="space-y-1">
                <div>{t("ruleEditor.tree.term.label")}</div>
                {node.terms.map((item) => (
                  <div key={item.conceptId} className="pl-2">
                    - {item.conceptName}
                    {item.includeDescendants ? t("ruleEditor.tree.term.withDescendants") : ""}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {!isCollapsed && canHaveChildren && (
        <div className="space-y-2">
          {node.children.map((child, index) => (
            <div key={child.id} className="space-y-1">
              {!readOnly && (
                <div className="ml-6 flex gap-2">
                  <button
                    type="button"
                    className="rounded border px-2 py-0.5 text-[11px] hover:bg-slate-50"
                    onClick={() => onMoveChild(node.id, child.id, "up")}
                    disabled={index === 0}
                  >
                    {t("ruleEditor.tree.move.up")}
                  </button>
                  <button
                    type="button"
                    className="rounded border px-2 py-0.5 text-[11px] hover:bg-slate-50"
                    onClick={() => onMoveChild(node.id, child.id, "down")}
                    disabled={index === node.children.length - 1}
                  >
                    {t("ruleEditor.tree.move.down")}
                  </button>
                </div>
              )}
              <ExpressionNodeRenderer
                node={child}
                selectedNodeId={selectedNodeId}
                collapsed={collapsed}
                depth={depth + 1}
                readOnly={readOnly}
                capability={capability}
                onSelect={onSelect}
                onToggleCollapse={onToggleCollapse}
                onAddChild={onAddChild}
                onDelete={onDelete}
                onWrap={onWrap}
                onMoveChild={onMoveChild}
                onEditTermSet={onEditTermSet}
                diffMode={diffMode}
                diffStatusById={diffStatusById}
              />
            </div>
          ))}
          {node.children.length === 0 && <div className="ml-6 text-xs text-slate-500">{t("ruleEditor.tree.children.empty")}</div>}
        </div>
      )}

      {!isCollapsed && canHaveSingleChild && (
        <div>
          {node.child ? (
            <ExpressionNodeRenderer
              node={node.child}
              selectedNodeId={selectedNodeId}
              collapsed={collapsed}
              depth={depth + 1}
              readOnly={readOnly}
              capability={capability}
              onSelect={onSelect}
              onToggleCollapse={onToggleCollapse}
              onAddChild={onAddChild}
              onDelete={onDelete}
              onWrap={onWrap}
              onMoveChild={onMoveChild}
              onEditTermSet={onEditTermSet}
              diffMode={diffMode}
              diffStatusById={diffStatusById}
            />
          ) : (
            <div className="ml-6 text-xs text-slate-500">{t("ruleEditor.tree.child.unset")}</div>
          )}
        </div>
      )}
    </div>
  );
}

function nodeLabel(node: UiExpressionNode): string {
  switch (node.type) {
    case "LOGIC":
      if (node.operator === "AND" || node.operator === "ALL") {
        return t("ruleEditor.tree.node.logic", { mode: t("ruleBuilder.all") });
      }
      if (node.operator === "OR" || node.operator === "ANY") {
        return t("ruleEditor.tree.node.logic", { mode: t("ruleBuilder.any") });
      }
      return t("ruleEditor.tree.node.logic", { mode: t("scenario.accrueSoft") });
    case "PROXIMITY":
      if (node.relation === "SENTENCE") return t("ruleEditor.tree.node.proximity.sentence");
      if (node.relation === "PARAGRAPH") return t("ruleEditor.tree.node.proximity.paragraph");
      return t("ruleEditor.tree.node.proximity.near", {
        distance: node.distance ?? 3,
        ordered: node.ordered ? t("ruleEditor.tree.node.proximity.orderedSuffix") : "",
      });
    case "FIELD":
      if (node.field === "TITLE") return t("ruleEditor.tree.node.field.title");
      if (node.field === "COLUMN") return t("ruleEditor.tree.node.field.column");
      return t("ruleEditor.tree.node.field.content");
    case "TERM_SET":
      return t("ruleEditor.tree.node.termSet", { count: node.terms.length });
    case "NOT":
      return t("ruleEditor.tree.node.not");
    case "SCORE":
      return t("ruleEditor.tree.node.score", { weight: node.weight });
    case "TOPIC_REF":
      return t("ruleEditor.tree.node.topicRef", {
        topicId: node.topicId || t("ruleEditor.tree.topic.unselected"),
      });
  }
}

function addButtonLabel(type: UiNodeType): string {
  switch (type) {
    case "LOGIC":
      return t("ruleEditor.tree.add.logic");
    case "PROXIMITY":
      return t("ruleEditor.tree.add.proximity");
    case "FIELD":
      return t("ruleEditor.tree.add.field");
    case "TERM_SET":
      return t("ruleEditor.tree.add.termSet");
    case "NOT":
      return t("ruleEditor.tree.add.not");
    case "SCORE":
      return t("ruleEditor.tree.add.score");
    case "TOPIC_REF":
      return t("ruleEditor.tree.add.topicRef");
  }
}

function depthAccent(depth: number): string {
  const mod = depth % 4;
  if (mod === 0) return "border-l-sky-500";
  if (mod === 1) return "border-l-emerald-500";
  if (mod === 2) return "border-l-amber-500";
  return "border-l-rose-500";
}
