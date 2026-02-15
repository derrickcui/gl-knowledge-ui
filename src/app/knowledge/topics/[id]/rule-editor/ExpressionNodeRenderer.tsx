import { Search } from "lucide-react";
import type { ImportanceLevel, UiCapabilityViewModel, UiExpressionNode, UiNodeType } from "./types";
import type { NodeDiffStatus } from "./diff";
import { canCreatePositionMode, getAllowedChildTypes } from "./tree-utils";
import { useCapability } from "./CapabilityContext";
import { t } from "@/i18n";

export function ExpressionNodeRenderer({
  node,
  selectedNodeId,
  collapsed,
  depth,
  readOnly,
  capability: capabilityProp,
  onSelect,
  onToggleCollapse,
  onAddChild,
  onSetPositionRelation,
  onEditPositionRelation,
  onCancelPositionRelation,
  onPatchNode,
  onDelete,
  onMoveChild,
  onEditTermSet,
  activePreviewNodeId,
  onDebugNode,
  diffMode,
  diffStatusById,
  parentWeighted = false,
  moveContext,
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
  onSetPositionRelation: (parentId: string) => void;
  onEditPositionRelation: (parentId: string) => void;
  onCancelPositionRelation: (parentId: string) => void;
  onPatchNode: (nodeId: string, updater: (node: UiExpressionNode) => UiExpressionNode) => void;
  onDelete: (nodeId: string) => void;
  onMoveChild: (parentId: string, childId: string, direction: "up" | "down") => void;
  onEditTermSet: (nodeId: string) => void;
  activePreviewNodeId: string | undefined;
  onDebugNode: (nodeId: string) => void;
  diffMode: boolean;
  diffStatusById: Record<string, NodeDiffStatus>;
  parentWeighted?: boolean;
  moveContext?: {
    parentId: string;
    index: number;
    siblingCount: number;
  };
}) {
  const capability = useCapability();
  const selected = selectedNodeId === node.id;
  const isPreviewActive = activePreviewNodeId === node.id;
  const isCollapsed = collapsed.has(node.id);
  const canHaveChildren =
    node.type === "LOGIC" || node.type === "POSITION_RELATION" || node.type === "PROXIMITY";
  const canHaveSingleChild =
    node.type === "FIELD" || node.type === "STRUCTURE" || node.type === "NOT" || node.type === "SCORE";
  const accent = depthAccent(depth);
  const diffStatus = diffStatusById[node.id];
  const diffClass =
    diffMode && diffStatus === "added"
      ? "ring-2 ring-emerald-400"
      : diffMode && diffStatus === "changed"
      ? "ring-2 ring-amber-400"
      : "";
  const allowedChildren = getAllowedChildTypes(node, capability);
  const logicTermCount =
    node.type === "LOGIC" ? node.children.filter((child) => child.type === "TERM_SET").length : 0;
  const hasPositionChild =
    node.type === "LOGIC" && node.children.some((child) => child.type === "POSITION_RELATION");
  const existingPositionChild =
    node.type === "LOGIC" ? node.children.find((child) => child.type === "POSITION_RELATION") : undefined;
  const canSetPositionRelation =
    node.type === "LOGIC" &&
    allowedChildren.includes("POSITION_RELATION") &&
    logicTermCount >= 2 &&
    !hasPositionChild &&
    canCreatePositionMode(capability, "PROXIMITY");
  const showImportanceSelector =
    parentWeighted && node.type === "TERM_SET";
  const showModeNeedTwoWarning =
    node.type === "LOGIC" &&
    node.children.length < 2 &&
    needsTwoChildren(node.operator);
  const importanceLevel = getImportanceLevel(node);
  const importanceWeight = levelToWeight(importanceLevel);

  return (
    <div className="space-y-2">
      <div
        className={`group relative rounded-md border border-l-4 p-3 ${
          selected
            ? "border-blue-500 bg-blue-50"
            : isPreviewActive
            ? "border-sky-300 bg-sky-50"
            : "border-slate-200 bg-white"
        } ${isPreviewActive ? "border-l-sky-500" : accent} ${diffClass}`}
        style={{ marginLeft: depth * 16 }}
      >
        <div className="flex items-center justify-between gap-2">
          <button type="button" className="text-left" onClick={() => onSelect(node.id)}>
            <div className="text-xs text-slate-500">{t("ruleEditor.tree.level", { level: depth + 1 })}</div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span>{nodeLabel(node)}</span>
              {showModeNeedTwoWarning && (
                <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-xs font-normal text-amber-700">
                  {t("ruleEditor.logic.modeNeedTwoWarningShort")}
                </span>
              )}
            </div>
          </button>
          <div className="flex items-center gap-2">
            {!readOnly && moveContext && (
              <>
                <button
                  type="button"
                  className="rounded border px-2 py-0.5 text-[11px] hover:bg-slate-50"
                  onClick={() => onMoveChild(moveContext.parentId, node.id, "up")}
                  disabled={moveContext.index === 0}
                >
                  {t("ruleEditor.tree.move.up")}
                </button>
                <button
                  type="button"
                  className="rounded border px-2 py-0.5 text-[11px] hover:bg-slate-50"
                  onClick={() => onMoveChild(moveContext.parentId, node.id, "down")}
                  disabled={moveContext.index === moveContext.siblingCount - 1}
                >
                  {t("ruleEditor.tree.move.down")}
                </button>
              </>
            )}
            <button
              type="button"
              className="rounded border px-1.5 py-1 text-xs opacity-0 transition hover:bg-slate-50 focus:opacity-100 group-hover:opacity-100"
              onClick={() => onDebugNode(node.id)}
              title={t("ruleEditor.tree.debugNode")}
              aria-label={t("ruleEditor.tree.debugNode")}
            >
              <Search className="h-3.5 w-3.5" />
            </button>
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
        {showImportanceSelector && (
          <div className="mt-2 rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
            <div className="flex items-center gap-2">
              <span>{t("conditionCard.importanceLabel")}（[{importanceWeight}]）</span>
              {readOnly ? (
                <span>{importanceLabel(importanceLevel)}</span>
              ) : (
                <select
                  className="h-7 rounded border border-amber-300 bg-white px-2 text-xs"
                  value={importanceLevel}
                  onChange={(event) => {
                    const level = event.target.value as ImportanceLevel;
                    onPatchNode(node.id, (n) => patchImportance(n, level));
                  }}
                >
                  <option value="HIGH">{importanceLabel("HIGH")}（[10]）</option>
                  <option value="NORMAL">{importanceLabel("NORMAL")}（[5]）</option>
                  <option value="LOW">{importanceLabel("LOW")}（[2]）</option>
                </select>
              )}
            </div>
          </div>
        )}

        {!readOnly && (
          <div className="mt-3 flex flex-wrap gap-2">
            {allowedChildren
              .filter((type) => type !== "POSITION_RELATION")
              .map((type) => (
                <button
                  key={type}
                  type="button"
                  className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
                  onClick={() => onAddChild(node.id, type)}
                >
                  + {addButtonLabel(type)}
                </button>
              ))}

            {canSetPositionRelation && (
              <button
                type="button"
                className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
                onClick={() => onSetPositionRelation(node.id)}
              >
                + {t("ruleEditor.tree.add.positionRelation")}
              </button>
            )}
            {node.type === "LOGIC" && existingPositionChild?.type === "POSITION_RELATION" && (
              <>
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
                  onClick={() => onEditPositionRelation(node.id)}
                >
                  {t("ruleEditor.tree.edit.positionRelation")}
                </button>
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                  onClick={() => onCancelPositionRelation(node.id)}
                >
                  {t("ruleEditor.tree.cancel.positionRelation")}
                </button>
              </>
            )}
            {node.type === "TERM_SET" && (
              <button
                type="button"
                className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
                onClick={() => onEditTermSet(node.id)}
              >
                {t("ruleEditor.tree.term.select")}
              </button>
            )}

            {node.type !== "FIELD" &&
              node.type !== "STRUCTURE" &&
              !(node.type === "LOGIC" && !moveContext) && (
              <button
                type="button"
                className="rounded border px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                onClick={() => onDelete(node.id)}
              >
                {t("ruleEditor.condition.remove")}
              </button>
            )}
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
              <ExpressionNodeRenderer
                node={child}
                selectedNodeId={selectedNodeId}
                collapsed={collapsed}
                depth={depth + 1}
                readOnly={readOnly}
                capability={capabilityProp}
                onSelect={onSelect}
                onToggleCollapse={onToggleCollapse}
                onAddChild={onAddChild}
                onSetPositionRelation={onSetPositionRelation}
                onEditPositionRelation={onEditPositionRelation}
                onCancelPositionRelation={onCancelPositionRelation}
                onPatchNode={onPatchNode}
                onDelete={onDelete}
                onMoveChild={onMoveChild}
                onEditTermSet={onEditTermSet}
                activePreviewNodeId={activePreviewNodeId}
                onDebugNode={onDebugNode}
                diffMode={diffMode}
                diffStatusById={diffStatusById}
                parentWeighted={node.type === "LOGIC" && isWeightedLogic(node.operator)}
                moveContext={{ parentId: node.id, index, siblingCount: node.children.length }}
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
              capability={capabilityProp}
              onSelect={onSelect}
              onToggleCollapse={onToggleCollapse}
              onAddChild={onAddChild}
              onSetPositionRelation={onSetPositionRelation}
              onEditPositionRelation={onEditPositionRelation}
              onCancelPositionRelation={onCancelPositionRelation}
              onPatchNode={onPatchNode}
              onDelete={onDelete}
              onMoveChild={onMoveChild}
              onEditTermSet={onEditTermSet}
              activePreviewNodeId={activePreviewNodeId}
              onDebugNode={onDebugNode}
              diffMode={diffMode}
              diffStatusById={diffStatusById}
              parentWeighted={false}
              moveContext={undefined}
            />
          ) : (
            <div className="ml-6 text-xs text-slate-500">{t("ruleEditor.tree.child.unset")}</div>
          )}
        </div>
      )}
    </div>
  );
}

export function nodeLabel(node: UiExpressionNode): string {
  switch (node.type) {
    case "LOGIC":
      if (node.operator === "AND" || node.operator === "ALL") {
        return t("ruleEditor.tree.node.logic", { mode: t("ruleBuilder.all") });
      }
      if (node.operator === "OR" || node.operator === "ANY") {
        return t("ruleEditor.tree.node.logic", { mode: t("ruleBuilder.any") });
      }
      if (node.operator === "AT_LEAST") {
        return t("ruleEditor.tree.node.logic", {
          mode: t("ruleEditor.logic.atLeastWithCount", {
            count: node.threshold ?? defaultThreshold(node.children.length),
          }),
        });
      }
      if (node.operator === "LOGSUM" || node.operator === "WEIGHTED") {
        return t("ruleEditor.tree.node.logic", {
          mode: t("ruleEditor.capability.mode.weighted"),
        });
      }
      return t("ruleEditor.tree.node.logic", { mode: t("ruleEditor.capability.mode.accrue") });
    case "STRUCTURE":
      if (node.scope === "SENTENCE") return t("ruleEditor.tree.node.proximity.sentence");
      if (node.scope === "PARAGRAPH") return t("ruleEditor.tree.node.proximity.paragraph");
      return t("ruleEditor.tree.node.structure.none");
    case "POSITION_RELATION":
      if (node.relation === "SENTENCE") {
        return t("ruleEditor.tree.node.positionRelation.sentence", {
          ordered: node.ordered ? t("ruleEditor.tree.node.positionRelation.orderedSuffix") : "",
        });
      }
      if (node.relation === "PARAGRAPH") {
        return t("ruleEditor.tree.node.positionRelation.paragraph", {
          ordered: node.ordered ? t("ruleEditor.tree.node.positionRelation.orderedSuffix") : "",
        });
      }
      return t("ruleEditor.tree.node.positionRelation.near", {
        distance: node.distance ?? 5,
        ordered: node.ordered ? t("ruleEditor.tree.node.positionRelation.orderedSuffix") : "",
      });
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
    case "STRUCTURE":
      return t("ruleEditor.tree.add.structure");
    case "POSITION_RELATION":
      return t("ruleEditor.tree.add.positionRelation");
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

function defaultThreshold(childCount: number) {
  return childCount >= 2 ? 2 : 1;
}

function isWeightedLogic(operator: string) {
  return operator === "LOGSUM" || operator === "WEIGHTED";
}

function needsTwoChildren(operator: string) {
  return operator === "AT_LEAST" || operator === "ACCRUE" || operator === "LOGSUM" || operator === "WEIGHTED";
}

function importanceLabel(level: ImportanceLevel) {
  if (level === "HIGH") return t("conditionCard.importance.high");
  if (level === "LOW") return t("conditionCard.importance.low");
  return t("conditionCard.importance.normal");
}

function levelToWeight(level: ImportanceLevel): number {
  if (level === "HIGH") return 10;
  if (level === "LOW") return 2;
  return 5;
}

function weightToLevel(weight?: number): ImportanceLevel {
  if (weight == null) return "NORMAL";
  if (weight >= 8) return "HIGH";
  if (weight <= 3) return "LOW";
  return "NORMAL";
}

function getImportanceLevel(node: UiExpressionNode): ImportanceLevel {
  if (node.type !== "TERM_SET") {
    return "NORMAL";
  }
  if (node.importance) return node.importance;
  return weightToLevel(node.importanceWeight ?? node.weight);
}

function patchImportance(node: UiExpressionNode, level: ImportanceLevel): UiExpressionNode {
  if (node.type !== "TERM_SET") {
    return node;
  }
  return {
    ...node,
    importance: level,
    importanceWeight: levelToWeight(level),
    weight: levelToWeight(level),
  };
}

