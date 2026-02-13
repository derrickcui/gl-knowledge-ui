import { useMemo, useRef, useState } from "react";
import { RuleEditorLayout } from "./rule-editor/RuleEditorLayout";
import type {
  UiCapabilityViewModel,
  UiExpressionNode,
  UiNodeType,
  UiRuleViewModel,
  UiTermSetNode,
} from "./rule-editor/types";
import { ExplainPanel, type ExplainViewModel } from "./rule-editor/ExplainPanel";
import { buildNodeDiffDetail } from "./rule-editor/diff";
import { validateTree } from "./rule-editor/validation";
import { HeaderBar } from "./rule-editor/HeaderBar";
import { MainWorkspace } from "./rule-editor/MainWorkspace";
import { RightSidebar } from "./rule-editor/RightSidebar";
import { FooterBar } from "./rule-editor/FooterBar";
import { StatusSummary } from "./rule-editor/StatusSummary";
import { ValidationPanel } from "./rule-editor/ValidationPanel";
import { DiffPreviewPanel } from "./rule-editor/DiffPreviewPanel";
import { GlobalModals } from "./rule-editor/GlobalModals";
import { TermSelectorModal } from "./rule-editor/TermSelectorModal";
import { selectedTermsToExpressions } from "./rule-editor/UiRuleNormalizer";
import { ExpressionTreePanel } from "./rule-editor/ExpressionTreePanel";
import { NodeInspector } from "./rule-editor/NodeInspector";
import { t } from "@/i18n";
import {
  createNode,
  findNode,
  insertChild,
  moveChild,
  removeNode,
  updateNode,
  wrapNode,
} from "./rule-editor/tree-utils";
import type { SelectedTerm } from "./rule-editor/term-selector-types";

export type RuleEditorProps = {
  rule: UiRuleViewModel;
  capability: UiCapabilityViewModel;
  explain?: ExplainViewModel | null;
  topicName?: string;
  status?: string;
  templateLabel?: string;
  capabilityLabel?: string;
  dirty?: boolean;
  actionBusy?: boolean;
  onBack?: () => void;
  onSave?: () => void;
  onPreview?: () => void;
  onSubmit?: () => void;
  onPublish?: () => void;
  onChange: (next: UiRuleViewModel) => void;
  readOnly?: boolean;
};

export function RuleEditor({
  rule,
  capability,
  explain = null,
  topicName = t("common.topic"),
  status = t("templates.status.draft"),
  templateLabel,
  capabilityLabel,
  dirty = false,
  actionBusy = false,
  onBack,
  onSave,
  onPreview,
  onSubmit,
  onPublish,
  onChange,
  readOnly = false,
}: RuleEditorProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(rule.root?.id ?? null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [diffMode, setDiffMode] = useState(false);
  const [termSelector, setTermSelector] = useState<{
    open: boolean;
    targetNodeId: string | null;
    initialSelected: SelectedTerm[];
  }>({
    open: false,
    targetNodeId: null,
    initialSelected: [],
  });

  const baselineRootRef = useRef<UiExpressionNode | null>(rule.root);
  const validationIssues = useMemo(() => validateTree(rule.root, capability), [rule.root, capability]);
  const diff = useMemo(() => buildNodeDiffDetail(baselineRootRef.current, rule.root), [rule.root]);
  const selectedNode = useMemo(
    () => (rule.root && selectedNodeId ? findNode(rule.root, selectedNodeId) : null),
    [rule.root, selectedNodeId]
  );

  const setRoot = (nextRoot: UiExpressionNode | null) => {
    onChange({ ...rule, root: nextRoot });
  };

  const handleCreateRoot = (type: UiNodeType) => {
    const root = createNode(type);
    if (type === "LOGIC") {
      const field = createNode("FIELD");
      if (field.type === "FIELD") {
        field.field = capability.where.allowFields.includes("CONTENT")
          ? "CONTENT"
          : capability.where.allowFields[0] ?? "CONTENT";
        field.child = root;
        setRoot(field);
        setSelectedNodeId(field.id);
        return;
      }
    }
    setRoot(root);
    setSelectedNodeId(root.id);
  };

  const handleAddChild = (parentId: string, type: UiNodeType) => {
    if (!rule.root) return;
    const child = createNode(type);
    setRoot(insertChild(rule.root, parentId, child));
    setSelectedNodeId(child.id);
    if (type === "TERM_SET" && child.type === "TERM_SET") {
      setTermSelector({
        open: true,
        targetNodeId: child.id,
        initialSelected: [],
      });
    }
  };

  const handleDeleteNode = (nodeId: string) => {
    if (!rule.root) return;
    const nextRoot = removeNode(rule.root, nodeId);
    setRoot(nextRoot);
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(nextRoot?.id ?? null);
    }
  };

  const handleWrapNode = (nodeId: string, wrapper: "LOGIC" | "NOT" | "PROXIMITY") => {
    if (!rule.root) return;
    const wrapped = wrapNode(rule.root, nodeId, wrapper);
    setRoot(wrapped.root);
    setSelectedNodeId(wrapped.wrapperId);
  };

  const handleMoveChild = (parentId: string, childId: string, direction: "up" | "down") => {
    if (!rule.root) return;
    setRoot(moveChild(rule.root, parentId, childId, direction));
  };

  const handlePatchNode = (nodeId: string, updater: (node: UiExpressionNode) => UiExpressionNode) => {
    if (!rule.root) return;
    setRoot(updateNode(rule.root, nodeId, updater));
  };
  const handleEditTermSet = (node: UiTermSetNode) => {
    setTermSelector({
      open: true,
      targetNodeId: node.id,
      initialSelected: node.terms.map((item) => ({
        conceptId: item.conceptId,
        conceptName: item.conceptName,
        includeDescendants: item.includeDescendants,
      })),
    });
  };

  const handleOpenTermSelectorForNode = (nodeId: string) => {
    if (!rule.root) return;
    const node = findNode(rule.root, nodeId);
    if (!node || node.type !== "TERM_SET") return;
    handleEditTermSet(node);
  };

  const handleConfirmTerms = (terms: SelectedTerm[]) => {
    if (!rule.root || !termSelector.targetNodeId) return;
    setRoot(
      updateNode(rule.root, termSelector.targetNodeId, (node) =>
        node.type === "TERM_SET" ? { ...node, terms: selectedTermsToExpressions(terms) } : node
      )
    );
    setTermSelector({ open: false, targetNodeId: null, initialSelected: [] });
  };

  return (
    <RuleEditorLayout
      header={
        <HeaderBar
          topicName={topicName}
          status={status}
          templateLabel={templateLabel}
          capability={capability}
          capabilityLabel={capabilityLabel}
          busy={actionBusy}
          onBack={onBack}
          onSave={onSave}
          onPreview={onPreview}
          onSubmit={onSubmit}
          onPublish={onPublish}
        />
      }
      workspace={
        <MainWorkspace
          treeWorkspace={
            <ExpressionTreePanel
              root={rule.root}
              selectedNodeId={selectedNodeId}
              collapsed={collapsed}
              capability={capability}
              readOnly={readOnly}
              onSelect={setSelectedNodeId}
              onToggleCollapse={(id) =>
                setCollapsed((prev) => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                })
              }
              onCreateRoot={handleCreateRoot}
              onAddChild={handleAddChild}
              onDelete={handleDeleteNode}
              onWrap={handleWrapNode}
              onMoveChild={handleMoveChild}
              onEditTermSet={handleOpenTermSelectorForNode}
              diffMode={diffMode}
              onToggleDiffMode={() => setDiffMode((prev) => !prev)}
              diffStatusById={diff.statusById}
            />
          }
          rightSidebar={
            <RightSidebar
              propertyPanel={
                <NodeInspector
                  node={selectedNode}
                  readOnly={readOnly}
                  capability={capability}
                  onPatchNode={handlePatchNode}
                  onEditTermSet={handleEditTermSet}
                />
              }
              explainPanel={<ExplainPanel explain={explain} />}
              validationPanel={<ValidationPanel issues={validationIssues} />}
              diffPreviewPanel={<DiffPreviewPanel diff={diff} />}
            />
          }
        />
      }
      footer={
        <FooterBar
          statusSummary={
            <StatusSummary
              dirty={dirty}
              issuesCount={validationIssues.length}
              diffAdded={diff.added}
              diffRemoved={diff.removed}
              diffChanged={diff.changed}
            />
          }
        />
      }
      modals={
        <GlobalModals
          termSelectorModal={
            <TermSelectorModal
              open={termSelector.open}
              onClose={() => setTermSelector({ open: false, targetNodeId: null, initialSelected: [] })}
              initialSelected={termSelector.initialSelected}
              onConfirm={handleConfirmTerms}
            />
          }
        />
      }
    />
  );
}

