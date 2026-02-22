import { t } from "@/i18n";
import type { UiCapabilityViewModel, UiExpressionNode, UiNodeType } from "./types";
import { ExpressionNodeRenderer } from "./ExpressionNodeRenderer";
import type { NodeDiffStatus } from "./diff";
import type { ProximitySuggestion } from "./suggestion-engine";
import type { HeatLevel } from "./rule-intelligence";

export function ExpressionTreePanel({
  root,
  selectedNodeId,
  collapsed,
  compact,
  capability,
  readOnly,
  onSelect,
  onToggleCollapse,
  onCreateRoot,
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
  onToggleDiffMode,
  onAutoFormat,
  proximitySuggestion,
  onApplyProximitySuggestion,
  diffStatusById,
  structureHints = [],
  conflictNodeIds,
  nodeErrorById,
  debugStateByNodeId,
  heatLevelByNodeId = {},
}: {
  root: UiExpressionNode | null;
  selectedNodeId: string | null;
  collapsed: Set<string>;
  compact: Set<string>;
  capability: UiCapabilityViewModel;
  readOnly: boolean;
  onSelect: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  onCreateRoot: (type: UiNodeType) => void;
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
  onToggleDiffMode: () => void;
  onAutoFormat: () => void;
  proximitySuggestion?: ProximitySuggestion | null;
  onApplyProximitySuggestion?: (payload: ProximitySuggestion) => void;
  diffStatusById: Record<string, NodeDiffStatus>;
  structureHints?: string[];
  conflictNodeIds: Set<string>;
  nodeErrorById: Record<string, string[]>;
  debugStateByNodeId: Record<string, "NODE_ACTIVE" | "IMPACT_HIGH" | "IMPACT_MEDIUM">;
  heatLevelByNodeId?: Record<string, HeatLevel>;
}) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{t("ruleEditor.treePanel.title")}</div>
          <div className="text-xs text-slate-500">{t("ruleEditor.treePanel.subtitle")}</div>
        </div>
        <div className="flex items-center gap-2">
          {!readOnly && root && (
            <button
              type="button"
              className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
              onClick={onAutoFormat}
            >
              {t("ruleEditor.tree.autoFormat")}
            </button>
          )}
          {readOnly && (
            <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
              {t("ruleEditor.treePanel.readOnly")}
            </span>
          )}
          <button
            type="button"
            className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
            onClick={onToggleDiffMode}
          >
            {diffMode ? t("ruleEditor.treePanel.diff.off") : t("ruleEditor.treePanel.diff.on")}
          </button>
        </div>
      </div>
      {structureHints.length > 0 && (
        <div className="mt-3 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800 transition-all duration-200">
          {structureHints.map((hint) => (
            <div key={hint}>- {hint}</div>
          ))}
        </div>
      )}
      {!readOnly && proximitySuggestion && onApplyProximitySuggestion && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-800">
          <span>{t("ruleEditor.tree.suggestion.proximity")}</span>
          <button
            type="button"
            className="rounded border border-violet-300 bg-white px-2 py-1 hover:bg-violet-100"
            onClick={() => onApplyProximitySuggestion(proximitySuggestion)}
          >
            {t("ruleEditor.tree.suggestion.apply")}
          </button>
        </div>
      )}
      {root && (
        <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          <div className="mb-1 font-medium">{t("ruleEditor.intel.heat.dot")}</div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
              {t("ruleEditor.intel.heat.high")}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-orange-500" />
              {t("ruleEditor.intel.heat.medium")}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-yellow-400" />
              {t("ruleEditor.intel.heat.low")}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-slate-200" />
              {t("ruleEditor.intel.heat.none")}
            </span>
          </div>
        </div>
      )}

      {!root ? (
        <div className="mt-4 space-y-2">
          <div className="text-sm text-slate-600">{t("ruleEditor.treePanel.empty.title")}</div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50"
              onClick={() => onCreateRoot("LOGIC")}
              disabled={readOnly}
            >
              {t("ruleEditor.treePanel.empty.createRoot")}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <ExpressionNodeRenderer
            node={root}
            selectedNodeId={selectedNodeId}
            collapsed={collapsed}
            compact={compact}
            depth={0}
            readOnly={readOnly}
            capability={capability}
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
          />
        </div>
      )}
    </div>
  );
}
