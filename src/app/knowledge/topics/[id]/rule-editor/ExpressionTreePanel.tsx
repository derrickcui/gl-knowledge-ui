import { t } from "@/i18n";
import type { UiCapabilityViewModel, UiExpressionNode, UiNodeType } from "./types";
import { ExpressionNodeRenderer } from "./ExpressionNodeRenderer";
import type { NodeDiffStatus } from "./diff";

export function ExpressionTreePanel({
  root,
  selectedNodeId,
  collapsed,
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
  activePreviewNodeId,
  onDebugNode,
  diffMode,
  onToggleDiffMode,
  diffStatusById,
}: {
  root: UiExpressionNode | null;
  selectedNodeId: string | null;
  collapsed: Set<string>;
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
  activePreviewNodeId: string | undefined;
  onDebugNode: (nodeId: string) => void;
  diffMode: boolean;
  onToggleDiffMode: () => void;
  diffStatusById: Record<string, NodeDiffStatus>;
}) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{t("ruleEditor.treePanel.title")}</div>
          <div className="text-xs text-slate-500">{t("ruleEditor.treePanel.subtitle")}</div>
        </div>
        <div className="flex items-center gap-2">
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

      {!root ? (
        <div className="mt-4 space-y-2">
          <div className="text-sm text-slate-600">{t("ruleEditor.treePanel.empty.title")}</div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50"
              onClick={() => onCreateRoot("FIELD")}
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
            activePreviewNodeId={activePreviewNodeId}
            onDebugNode={onDebugNode}
            diffMode={diffMode}
            diffStatusById={diffStatusById}
          />
        </div>
      )}
    </div>
  );
}
