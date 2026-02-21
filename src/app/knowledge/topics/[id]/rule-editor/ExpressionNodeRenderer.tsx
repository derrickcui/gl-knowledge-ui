import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import type { NodeDiffStatus } from "./diff";
import { useCapability } from "./CapabilityContext";
import { canCreatePositionMode, getAllowedChildTypes } from "./tree-utils";
import type { ImportanceLevel, RuleField, UiCapabilityViewModel, UiExpressionNode, UiNodeType } from "./types";
import { t } from "@/i18n";
import { AddNodeButtons } from "./AddNodeButtons";
import { validateParentChild } from "./validator/validateParentChild";
import type { HeatLevel } from "./rule-intelligence";

type DebugState = "NODE_ACTIVE" | "IMPACT_HIGH" | "IMPACT_MEDIUM";

export function ExpressionNodeRenderer({
  node,
  selectedNodeId,
  collapsed,
  compact,
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
  onWrapChildren,
  draggingNodeId,
  draggingNodeType,
  onDragStartNode,
  onDragEndNode,
  onDropOnNode,
  canDropAt,
  activePreviewNodeId,
  onDebugNode,
  diffMode,
  diffStatusById,
  conflictNodeIds,
  nodeErrorById,
  debugStateByNodeId,
  heatLevelByNodeId,
  parentWeighted = false,
  inheritedField,
  moveContext,
}: {
  node: UiExpressionNode;
  selectedNodeId: string | null;
  collapsed: Set<string>;
  compact: Set<string>;
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
  onWrapChildren: (
    parentId: string,
    childIds: string[],
    mode: "FIELD" | "STRUCTURE" | "PROXIMITY" | "LOGIC"
  ) => void;
  draggingNodeId: string | null;
  draggingNodeType: UiExpressionNode["type"] | null;
  onDragStartNode: (nodeId: string) => void;
  onDragEndNode: () => void;
  onDropOnNode: (targetParentId: string, targetIndex: number) => void;
  canDropAt: (targetParentId: string, targetIndex: number) => boolean;
  activePreviewNodeId: string | undefined;
  onDebugNode: (nodeId: string) => void;
  diffMode: boolean;
  diffStatusById: Record<string, NodeDiffStatus>;
  conflictNodeIds: Set<string>;
  nodeErrorById: Record<string, string[]>;
  debugStateByNodeId: Record<string, DebugState>;
  heatLevelByNodeId?: Record<string, HeatLevel>;
  parentWeighted?: boolean;
  inheritedField?: RuleField;
  moveContext?: {
    parentId: string;
    index: number;
    siblingCount: number;
  };
}) {
  const capability = useCapability();
  const selected = selectedNodeId === node.id;
  const isRoot = depth === 0;
  const isPreviewActive = activePreviewNodeId === node.id;
  const isCollapsed = collapsed.has(node.id);
  const isCompact = compact.has(node.id);
  const isFolded = isCollapsed || isCompact;
  const debugState = debugStateByNodeId[node.id];
  const heatLevel = heatLevelByNodeId?.[node.id] ?? "NONE";
  const hasFieldConflict = conflictNodeIds.has(node.id);
  const nodeErrors = nodeErrorById[node.id] ?? [];

  const canHaveChildren = node.type === "LOGIC" || node.type === "POSITION_RELATION" || node.type === "PROXIMITY";
  const canHaveSingleChild = node.type === "FIELD" || node.type === "STRUCTURE" || node.type === "NOT" || node.type === "SCORE";
  const childCount = childNodeCount(node);
  const accent = depthAccent(depth);

  const diffStatus = diffStatusById[node.id];
  const heatBgClass =
    heatLevel === "HIGH"
      ? "bg-red-50/70"
      : heatLevel === "MEDIUM"
      ? "bg-orange-50/70"
      : heatLevel === "LOW"
      ? "bg-yellow-50/70"
      : "";
  const diffClass =
    diffMode && diffStatus === "added"
      ? "ring-2 ring-emerald-400"
      : diffMode && diffStatus === "changed"
      ? "ring-2 ring-amber-400"
      : "";

  const debugClass =
    debugState === "NODE_ACTIVE"
      ? "ring-2 ring-blue-400"
      : debugState === "IMPACT_HIGH"
      ? "ring-2 ring-purple-500 shadow-[0_0_0_2px_rgba(168,85,247,0.2)]"
      : debugState === "IMPACT_MEDIUM"
      ? "ring-1 ring-purple-300"
      : "";

  const allowedChildren = getAllowedChildTypes(node, capability);
  const logicTermCount = node.type === "LOGIC" ? node.children.filter((child) => child.type === "TERM_SET").length : 0;
  const hasPositionChild = node.type === "LOGIC" && node.children.some((child) => child.type === "POSITION_RELATION");
  const existingPositionChild = node.type === "LOGIC" ? node.children.find((child) => child.type === "POSITION_RELATION") : undefined;
  const canSetPositionRelation =
    node.type === "LOGIC" &&
    allowedChildren.includes("POSITION_RELATION") &&
    logicTermCount >= 2 &&
    !hasPositionChild &&
    canCreatePositionMode(capability, "PROXIMITY");

  const showImportanceSelector = parentWeighted && node.type === "TERM_SET";
  const showModeNeedTwoWarning = node.type === "LOGIC" && node.children.length < 2 && needsTwoChildren(node.operator);
  const importanceLevel = getImportanceLevel(node);
  const importanceWeight = levelToWeight(importanceLevel);

  const scopeField = node.type === "FIELD" ? node.field : inheritedField;
  const showScopeBadge = Boolean(scopeField && (node.type === "FIELD" || depth === 0));
  const relationHeader = relationHeaderText(node);
  const [showAllChildren, setShowAllChildren] = useState(false);
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
  const [hoverInsert, setHoverInsert] = useState<"before" | "after" | "inside" | null>(null);
  const isDragging = Boolean(draggingNodeId);
  const singleSlotOccupied = canHaveSingleChild && "child" in node && Boolean(node.child);
  const canDropInside =
    draggingNodeType != null &&
    draggingNodeId !== node.id &&
    validateParentChild(node.type, draggingNodeType, capability) &&
    !singleSlotOccupied &&
    canDropAt(
      node.id,
      canHaveChildren && "children" in node && Array.isArray(node.children) ? node.children.length : 0
    );
  const canDropBefore =
    Boolean(moveContext) && canDropAt(moveContext!.parentId, moveContext!.index);
  const canDropAfter =
    Boolean(moveContext) && canDropAt(moveContext!.parentId, moveContext!.index + 1);

  useEffect(() => {
    if (node.type !== "LOGIC") {
      if (selectedChildIds.length > 0) setSelectedChildIds([]);
      return;
    }
    const allowed = new Set(node.children.map((child) => child.id));
    setSelectedChildIds((prev) => {
      const next = prev.filter((id) => allowed.has(id));
      if (next.length === prev.length && next.every((id, index) => id === prev[index])) {
        return prev;
      }
      return next;
    });
  }, [node, selectedChildIds]);

  const summary = buildNodeSummary(node);
  const compactText = isCompact ? buildCompactPreview(node) : "";

  return (
    <div className="space-y-2">
      {isDragging && moveContext && (
        <div
          className={`ml-2 h-1 rounded ${
            canDropBefore ? "bg-blue-300" : "bg-red-300"
          } ${hoverInsert === "before" ? "opacity-100" : "opacity-40"}`}
          style={{ marginLeft: depth * 12 }}
          onDragOver={(event) => {
            event.preventDefault();
            setHoverInsert("before");
            event.dataTransfer.dropEffect = canDropBefore ? "move" : "none";
          }}
          onDragLeave={() => setHoverInsert((prev) => (prev === "before" ? null : prev))}
          onDrop={(event) => {
            event.preventDefault();
            setHoverInsert(null);
            onDropOnNode(moveContext.parentId, moveContext.index);
          }}
        />
      )}

      <div
        className={`group relative rounded-md border border-l-4 p-3 ${
          selected
            ? "border-blue-500 bg-blue-50"
            : isPreviewActive
            ? "border-sky-300 bg-sky-50"
            : "border-slate-200 bg-white"
        } ${isPreviewActive ? "border-l-sky-500" : accent} ${heatBgClass} ${diffClass} ${debugClass} ${
          hasFieldConflict ? "border-red-300 bg-red-50" : ""
        } ${isDragging && canDropInside ? "ring-1 ring-blue-300 bg-blue-50/40" : ""} ${
          isDragging && !canDropInside && draggingNodeId !== node.id ? "ring-1 ring-red-300 bg-red-50/30" : ""
        }`}
        style={{ marginLeft: depth * 12 }}
        title={nodeErrors.length > 0 ? nodeErrors.join("\n") : undefined}
        draggable={!readOnly && Boolean(moveContext)}
        onDragStart={(event) => {
          if (readOnly || !moveContext) return;
          event.dataTransfer.effectAllowed = "move";
          onDragStartNode(node.id);
        }}
        onDragEnd={() => onDragEndNode()}
        onDragOver={(event) => {
          if (!isDragging) return;
          event.preventDefault();
          setHoverInsert("inside");
          event.dataTransfer.dropEffect = canDropInside ? "move" : "none";
        }}
        onDragLeave={() => setHoverInsert((prev) => (prev === "inside" ? null : prev))}
        onDrop={(event) => {
          if (!isDragging) return;
          event.preventDefault();
          setHoverInsert(null);
          onDropOnNode(node.id, canHaveChildren && "children" in node && Array.isArray(node.children) ? node.children.length : 0);
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div
            className="text-left"
            role="button"
            tabIndex={0}
            onClick={() => onSelect(node.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(node.id);
              }
            }}
          >
            {showScopeBadge && scopeField && (
              <div className="mt-1 inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] text-sky-700">
                {t("ruleEditor.structure.scopeBadge", { scope: fieldLabel(scopeField) })}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm font-semibold">
              {(canHaveChildren || canHaveSingleChild) && (
                <button
                  type="button"
                  className="rounded px-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleCollapse(node.id);
                  }}
                  aria-label={isFolded ? t("drawer.expand") : t("drawer.collapse")}
                >
                  {isFolded ? ">" : "v"}
                </button>
              )}
              <span>{nodeLabel(node)}</span>
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  heatLevel === "HIGH"
                    ? "bg-red-500"
                    : heatLevel === "MEDIUM"
                    ? "bg-orange-500"
                    : heatLevel === "LOW"
                    ? "bg-yellow-400"
                    : "bg-slate-200"
                }`}
                title={t("ruleEditor.intel.heat.dot")}
              />
              {isRoot && (
                <span className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                  {t("ruleEditor.tree.rootBadge")}
                </span>
              )}
              {isDragging && !canDropInside && draggingNodeId !== node.id && (
                <span className="text-xs text-red-600">x</span>
              )}
              {hasFieldConflict && <span className="text-xs text-red-600">[!]</span>}
              {showModeNeedTwoWarning && (
                <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-xs font-normal text-amber-700">
                  {t("ruleEditor.logic.modeNeedTwoWarningShort")}
                </span>
              )}
            </div>
            {isRoot && (
              <div className="mt-1 text-[11px] font-normal text-slate-500">
                {t("ruleEditor.tree.rootHint")}
              </div>
            )}
          </div>

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
          </div>
        </div>

        {isFolded && (
          <div className="mt-2 space-y-1 text-xs text-slate-600">
            <div>{summary}</div>
            {compactText ? <div className="text-slate-500">{compactText}</div> : null}
          </div>
        )}

        {relationHeader && !isCollapsed && (
          <div className="mt-2 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">
            {relationHeader}
          </div>
        )}

        {showImportanceSelector && (
          <div className="mt-2 rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
            <div className="flex items-center gap-2">
              <span>{t("conditionCard.importanceLabel")}([{importanceWeight}])</span>
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
                  <option value="HIGH">{importanceLabel("HIGH")}([10])</option>
                  <option value="NORMAL">{importanceLabel("NORMAL")}([5])</option>
                  <option value="LOW">{importanceLabel("LOW")}([2])</option>
                </select>
              )}
            </div>
          </div>
        )}

        {!readOnly && (
          <div className="mt-3 flex flex-wrap gap-2">
            <AddNodeButtons
              parentType={node.type}
              parentId={node.id}
              allowedChildren={allowedChildren}
              onAdd={onAddChild}
              hiddenTypes={["POSITION_RELATION"]}
              disabledTypes={
                (node.type === "POSITION_RELATION" || node.type === "PROXIMITY") && childCount >= 5
                  ? ["TERM_SET"]
                  : []
              }
            />

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

            {node.type === "LOGIC" && selectedChildIds.length >= 1 && (
              <>
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
                  onClick={() => onWrapChildren(node.id, selectedChildIds, "LOGIC")}
                >
                  {t("ruleEditor.tree.wrap.logic", { count: selectedChildIds.length })}
                </button>
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
                  onClick={() => onWrapChildren(node.id, selectedChildIds, "FIELD")}
                >
                  {t("ruleEditor.tree.wrap.field", { count: selectedChildIds.length })}
                </button>
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
                  onClick={() => onWrapChildren(node.id, selectedChildIds, "STRUCTURE")}
                >
                  {t("ruleEditor.tree.wrap.structure", { count: selectedChildIds.length })}
                </button>
                {selectedChildIds.length >= 2 &&
                  selectedChildIds.every((id) =>
                    node.children.some((child) => child.id === id && child.type === "TERM_SET")
                  ) && (
                    <button
                      type="button"
                      className="rounded border border-violet-300 bg-violet-50 px-2 py-1 text-xs text-violet-700 hover:bg-violet-100"
                      onClick={() => onWrapChildren(node.id, selectedChildIds, "PROXIMITY")}
                    >
                      {t("ruleEditor.tree.wrap.proximity", { count: selectedChildIds.length })}
                    </button>
                  )}
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                  onClick={() => setSelectedChildIds([])}
                >
                  {t("ruleEditor.tree.wrap.clearSelection")}
                </button>
              </>
            )}
          </div>
        )}

        {node.type === "TERM_SET" && (
          <div className="mt-2 rounded border bg-slate-50 p-2 text-xs text-slate-700">
            {node.terms.length > 1 && (
              <div className="mb-2 flex items-center gap-2">
                <span>{t("ruleEditor.nodeInspector.term.matchMode")}</span>
                <select
                  className="h-7 rounded border bg-white px-2 text-xs"
                  value={node.matchMode}
                  onChange={(event) => {
                    const value = event.target.value as "ANY" | "ALL";
                    onPatchNode(node.id, (n) => (n.type === "TERM_SET" ? { ...n, matchMode: value } : n));
                  }}
                  disabled={readOnly}
                >
                  <option value="ANY">{t("ruleEditor.nodeInspector.term.mode.any")}</option>
                  <option value="ALL">{t("ruleEditor.nodeInspector.term.mode.all")}</option>
                </select>
              </div>
            )}

            {node.terms.length > 0 && (
              <div className="mb-2 flex items-center gap-2">
                <span>{t("ruleEditor.tree.term.weight")}</span>
                {readOnly ? (
                  <span className="rounded border bg-white px-1.5 py-0.5 font-mono">
                    [{Math.max(0, Math.round(Number(node.weight ?? node.importanceWeight ?? 5)))}]
                  </span>
                ) : (
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className="h-7 w-20 rounded border bg-white px-2 text-xs"
                    value={Math.max(0, Math.round(Number(node.weight ?? node.importanceWeight ?? 5)))}
                    onChange={(event) => {
                      const parsed = Number(event.target.value);
                      const nextWeight = Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 5;
                      onPatchNode(node.id, (n) =>
                        n.type === "TERM_SET"
                          ? {
                              ...n,
                              weight: nextWeight,
                              importanceWeight: nextWeight,
                            }
                          : n
                      );
                    }}
                  />
                )}
              </div>
            )}
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

      <div
        className={`overflow-hidden transition-all duration-200 ${
          isFolded || !canHaveChildren ? "max-h-0 opacity-0" : "max-h-[2000px] opacity-100"
        }`}
      >
        {canHaveChildren && (
          <div className="space-y-2">
            {(shouldClipChildren(node, isFolded, showAllChildren) ? node.children.slice(0, 3) : node.children).map((child, index) => (
              <div key={child.id} className="space-y-1">
                {!readOnly && node.type === "LOGIC" && (
                  <label className="ml-6 flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={selectedChildIds.includes(child.id)}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setSelectedChildIds((prev) =>
                          checked ? [...prev, child.id] : prev.filter((id) => id !== child.id)
                        );
                      }}
                    />
                    {t("ruleEditor.tree.wrap.selectChild")}
                  </label>
                )}
                <ExpressionNodeRenderer
                  node={child}
                  selectedNodeId={selectedNodeId}
                  collapsed={collapsed}
                  compact={compact}
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
                  onWrapChildren={onWrapChildren}
                  draggingNodeId={draggingNodeId}
                  draggingNodeType={draggingNodeType}
                  onDragStartNode={onDragStartNode}
                  onDragEndNode={onDragEndNode}
                  onDropOnNode={onDropOnNode}
                  canDropAt={canDropAt}
                  activePreviewNodeId={activePreviewNodeId}
                  onDebugNode={onDebugNode}
                  diffMode={diffMode}
                  diffStatusById={diffStatusById}
                  conflictNodeIds={conflictNodeIds}
                  nodeErrorById={nodeErrorById}
                  debugStateByNodeId={debugStateByNodeId}
                  heatLevelByNodeId={heatLevelByNodeId}
                  parentWeighted={node.type === "LOGIC" && isWeightedLogic(node.operator)}
                  inheritedField={scopeField}
                  moveContext={{ parentId: node.id, index, siblingCount: node.children.length }}
                />
              </div>
            ))}
            {shouldClipChildren(node, isFolded, showAllChildren) && (
              <button
                type="button"
                className="ml-6 text-xs text-slate-600 underline underline-offset-2 hover:text-slate-900"
                onClick={() => setShowAllChildren(true)}
              >
                {t("ruleEditor.tree.showAllChildren", { count: node.children.length - 3 })}
              </button>
            )}
            {node.children.length === 0 && <div className="ml-6 text-xs text-slate-500">{t("ruleEditor.tree.children.empty")}</div>}
          </div>
        )}
      </div>

      <div
        className={`overflow-hidden transition-all duration-200 ${
          isFolded || !canHaveSingleChild ? "max-h-0 opacity-0" : "max-h-[1200px] opacity-100"
        }`}
      >
        {canHaveSingleChild && (
          <div>
            {node.child ? (
              <ExpressionNodeRenderer
                node={node.child}
                selectedNodeId={selectedNodeId}
                collapsed={collapsed}
                compact={compact}
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
                onWrapChildren={onWrapChildren}
                draggingNodeId={draggingNodeId}
                draggingNodeType={draggingNodeType}
                onDragStartNode={onDragStartNode}
                onDragEndNode={onDragEndNode}
                onDropOnNode={onDropOnNode}
                canDropAt={canDropAt}
                activePreviewNodeId={activePreviewNodeId}
                onDebugNode={onDebugNode}
                diffMode={diffMode}
                diffStatusById={diffStatusById}
                conflictNodeIds={conflictNodeIds}
                nodeErrorById={nodeErrorById}
                debugStateByNodeId={debugStateByNodeId}
                heatLevelByNodeId={heatLevelByNodeId}
                parentWeighted={false}
                inheritedField={scopeField}
                moveContext={undefined}
              />
            ) : (
              <div className="ml-6 text-xs text-slate-500">{t("ruleEditor.tree.child.unset")}</div>
            )}
          </div>
        )}
      </div>

      {isDragging && moveContext && (
        <div
          className={`ml-2 h-1 rounded ${
            canDropAfter ? "bg-blue-300" : "bg-red-300"
          } ${hoverInsert === "after" ? "opacity-100" : "opacity-40"}`}
          style={{ marginLeft: depth * 12 }}
          onDragOver={(event) => {
            event.preventDefault();
            setHoverInsert("after");
            event.dataTransfer.dropEffect = canDropAfter ? "move" : "none";
          }}
          onDragLeave={() => setHoverInsert((prev) => (prev === "after" ? null : prev))}
          onDrop={(event) => {
            event.preventDefault();
            setHoverInsert(null);
            onDropOnNode(moveContext.parentId, moveContext.index + 1);
          }}
        />
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

function buildNodeSummary(node: UiExpressionNode): string {
  if (node.type === "LOGIC") {
    const count = node.children.length;
    if (node.operator === "AT_LEAST") {
      return t("ruleEditor.tree.summary.logic.atLeast", { threshold: node.threshold ?? defaultThreshold(count), count });
    }
    if (node.operator === "AND" || node.operator === "ALL") {
      return t("ruleEditor.tree.summary.logic.and", { count });
    }
    if (node.operator === "OR" || node.operator === "ANY") {
      return t("ruleEditor.tree.summary.logic.or", { count });
    }
    return t("ruleEditor.tree.summary.logic.generic", { count });
  }
  if (node.type === "FIELD") {
    return t("ruleEditor.tree.summary.field", { scope: fieldLabel(node.field) });
  }
  if (node.type === "PROXIMITY") {
    return t("ruleEditor.tree.summary.proximity", {
      distance: node.distance ?? 3,
      order: node.ordered ? t("ruleEditor.tree.summary.orderYes") : t("ruleEditor.tree.summary.orderNo"),
    });
  }
  if (node.type === "POSITION_RELATION") {
    return t("ruleEditor.tree.summary.proximity", {
      distance: node.distance ?? 5,
      order: node.ordered ? t("ruleEditor.tree.summary.orderYes") : t("ruleEditor.tree.summary.orderNo"),
    });
  }
  if (node.type === "TERM_SET") {
    const labels = node.terms.slice(0, 2).map((term) => term.conceptName).join("/");
    return t("ruleEditor.tree.summary.term", { terms: labels || "-" });
  }
  return t("ruleEditor.tree.folded.generic", { count: childNodeCount(node) });
}

function buildCompactPreview(node: UiExpressionNode): string {
  if (!("children" in node) || !Array.isArray(node.children) || node.children.length === 0) {
    return "";
  }
  const preview = node.children.slice(0, 2).map((child) => compactChildLabel(child)).join(" / ");
  const remain = node.children.length - 2;
  return remain > 0 ? `${preview} ... +${remain}` : preview;
}

function compactChildLabel(node: UiExpressionNode): string {
  if (node.type === "TERM_SET") {
    return node.terms[0]?.conceptName || t("ruleEditor.tree.node.termSet", { count: node.terms.length });
  }
  if (node.type === "FIELD") {
    return t("ruleEditor.tree.summary.field", { scope: fieldLabel(node.field) });
  }
  return nodeLabel(node);
}

function childNodeCount(node: UiExpressionNode): number {
  if ("children" in node && Array.isArray(node.children)) return node.children.length;
  if ("child" in node) return node.child ? 1 : 0;
  return 0;
}

function shouldClipChildren(node: UiExpressionNode, isFolded: boolean, showAllChildren: boolean): boolean {
  return !isFolded && !showAllChildren && node.type === "LOGIC" && node.children.length > 6;
}

function fieldLabel(field: RuleField): string {
  if (field === "TITLE") return t("ruleEditor.tree.node.fieldOnly.title");
  if (field === "COLUMN") return t("ruleEditor.tree.node.fieldOnly.column");
  return t("ruleEditor.tree.node.fieldOnly.content");
}

function relationHeaderText(node: UiExpressionNode): string | null {
  if (node.type === "LOGIC") {
    if (node.operator === "AND" || node.operator === "ALL") {
      return t("ruleEditor.structure.relation.and");
    }
    if (node.operator === "OR" || node.operator === "ANY") {
      return t("ruleEditor.structure.relation.or");
    }
    if (node.operator === "AT_LEAST") {
      return t("ruleEditor.structure.relation.atLeast", {
        count: node.threshold ?? defaultThreshold(node.children.length),
      });
    }
    if (node.operator === "ACCRUE") {
      return t("ruleEditor.structure.relation.accrue");
    }
    if (node.operator === "LOGSUM" || node.operator === "WEIGHTED") {
      return t("ruleEditor.structure.relation.logsum");
    }
  }

  if (node.type === "PROXIMITY") {
    if (node.relation === "SENTENCE") return t("ruleEditor.structure.relation.sameSentence");
    if (node.relation === "PARAGRAPH") return t("ruleEditor.structure.relation.sameParagraph");
    return node.ordered
      ? t("ruleEditor.structure.relation.orderNear", { distance: node.distance ?? 3 })
      : t("ruleEditor.structure.relation.near", { distance: node.distance ?? 3 });
  }

  if (node.type === "POSITION_RELATION") {
    if (node.relation === "SENTENCE") return t("ruleEditor.structure.relation.sameSentence");
    if (node.relation === "PARAGRAPH") return t("ruleEditor.structure.relation.sameParagraph");
    return node.ordered || node.mode === "ORDER"
      ? t("ruleEditor.structure.relation.orderNear", { distance: node.distance ?? 5 })
      : t("ruleEditor.structure.relation.near", { distance: node.distance ?? 5 });
  }

  if (node.type === "NOT") {
    return t("ruleEditor.structure.relation.not");
  }

  if (node.type === "SCORE") {
    return t("ruleEditor.structure.relation.score");
  }

  return null;
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
