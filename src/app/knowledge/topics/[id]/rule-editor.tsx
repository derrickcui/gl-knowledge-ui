import { useEffect, useMemo, useRef, useState } from "react";
import { RuleEditorLayout } from "./rule-editor/RuleEditorLayout";
import type {
  PositionRelationScope,
  RuleField,
  StructureScope,
  UiCapabilityViewModel,
  UiExpressionNode,
  UiNodeType,
  UiPositionRelationNode,
  UiRuleViewModel,
  UiTermSetNode,
} from "./rule-editor/types";
import { ExplainPanel, type ExplainViewModel } from "./rule-editor/ExplainPanel";
import { buildNodeDiffDetail } from "./rule-editor/diff";
import { validateTree } from "./rule-editor/validation";
import { HeaderBar, type OpenViewOption } from "./rule-editor/HeaderBar";
import { MainWorkspace } from "./rule-editor/MainWorkspace";
import { RightSidebar } from "./rule-editor/RightSidebar";
import { StatusSummary } from "./rule-editor/StatusSummary";
import { ValidationPanel } from "./rule-editor/ValidationPanel";
import { DiffPreviewPanel } from "./rule-editor/DiffPreviewPanel";
import { EffectValidationPanel } from "./rule-editor/EffectValidationPanel";
import { GlobalModals } from "./rule-editor/GlobalModals";
import { TermSelectorModal } from "./rule-editor/TermSelectorModal";
import { selectedTermsToExpressions } from "./rule-editor/UiRuleNormalizer";
import { ExpressionTreePanel } from "./rule-editor/ExpressionTreePanel";
import { nodeLabel } from "./rule-editor/ExpressionNodeRenderer";
import { NodeInspector } from "./rule-editor/NodeInspector";
import { CapabilityProvider } from "./rule-editor/CapabilityContext";
import { t } from "@/i18n";
import {
  canCreatePositionMode,
  createNode,
  createPositionRelationNode,
  findNode,
  getAllowedChildTypes,
  insertChild,
  moveChild,
  removeNode,
  updateNode,
} from "./rule-editor/tree-utils";
import { structureScopeOptionsForField } from "./rule-editor/capability-policy";
import type { SelectedTerm } from "./rule-editor/term-selector-types";
import type {
  ConditionImpactItem,
  PreviewDocumentDetailResponse,
  RulePreviewResponse,
} from "@/lib/rule-preview-api";
import type { RuntimeActiveItem } from "@/lib/api/runtime";
import type { RuntimeExecuteResponse } from "@/lib/api/ruleRuntime";
import type { RuntimeExecuteOptions } from "@/lib/api/ruleRuntime";

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
  onDeleteDraft?: () => void;
  onRunWorkspace?: (options?: { page?: number; size?: number }) => void;
  onRunNode?: (nodeId: string, options?: RuntimeExecuteOptions) => void;
  onSelectPreviewDocument?: (docId: string) => void;
  onSubmit?: () => void;
  onPublish?: () => void;
  onChange: (next: UiRuleViewModel) => void;
  readOnly?: boolean;
  previewResult?: RulePreviewResponse | null;
  previewDocument?: PreviewDocumentDetailResponse | null;
  previewDocumentBusy?: boolean;
  previewError?: string | null;
  previewBusy?: boolean;
  fullRuntimeResult?: Extract<RuntimeExecuteResponse, { mode: "FULL" }> | null;
  impactRuntimeResult?: Extract<RuntimeExecuteResponse, { mode: "IMPACT" }> | null;
  nodeRuntimeResults?: Record<string, Extract<RuntimeExecuteResponse, { mode: "NODE" }>>;
  runtimeOptions?: RuntimeActiveItem[];
  activeRuntimeId?: number | null;
  onChangeRuntime?: (id: number) => void;
};

type PreviewState = {
  activeNodeId?: string;
};

type AnalysisTab = {
  id: string;
  title: string;
  kind: "FULL" | "IMPACT" | "NODE";
  nodeId?: string;
  stale?: boolean;
  closable?: boolean;
};

type PositionRelationDraft = {
  relation: PositionRelationScope;
  distance: number;
  ordered: boolean;
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
  onDeleteDraft,
  onRunWorkspace,
  onRunNode,
  onSelectPreviewDocument,
  onSubmit,
  onPublish,
  onChange,
  readOnly = false,
  previewResult = null,
  previewDocument = null,
  previewDocumentBusy = false,
  previewError = null,
  previewBusy = false,
  fullRuntimeResult = null,
  impactRuntimeResult = null,
  nodeRuntimeResults = {},
  runtimeOptions = [],
  activeRuntimeId = null,
  onChangeRuntime,
}: RuleEditorProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(rule.root?.id ?? null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [diffMode, setDiffMode] = useState(false);
  const [openViews, setOpenViews] = useState<Record<OpenViewOption, boolean>>({
    effectValidation: false,
    gqlPreview: false,
    diffCompare: true,
  });
  const [previewState, setPreviewState] = useState<PreviewState>({});
  const [analysisCollapsed, setAnalysisCollapsed] = useState(false);
  const [activeTabId, setActiveTabId] = useState("FULL");
  const [nodeTabs, setNodeTabs] = useState<AnalysisTab[]>([]);
  const [fullTabStale, setFullTabStale] = useState(false);
  const [impactTabStale, setImpactTabStale] = useState(false);
  const [termSelector, setTermSelector] = useState<{
    open: boolean;
    targetNodeId: string | null;
    targetParentId: string | null;
    initialSelected: SelectedTerm[];
  }>({
    open: false,
    targetNodeId: null,
    targetParentId: null,
    initialSelected: [],
  });
  const [positionEditor, setPositionEditor] = useState<{
    open: boolean;
    parentId: string | null;
    editingNodeId: string | null;
    draft: PositionRelationDraft;
  }>({
    open: false,
    parentId: null,
    editingNodeId: null,
    draft: { relation: "NEAR", distance: 5, ordered: false },
  });

  const baselineRootRef = useRef<UiExpressionNode | null>(rule.root);
  const validationIssues = useMemo(() => validateTree(rule.root, capability), [rule.root, capability]);
  const hasEmptyConditionGroup = useMemo(() => hasEmptyLogicGroup(rule.root), [rule.root]);
  const hasInvalidSemanticModeState = useMemo(() => hasInvalidSemanticMode(rule.root), [rule.root]);
  const disableSaveHint = useMemo(() => {
    if (hasEmptyConditionGroup) return t("ruleEditor.header.saveDisabledEmptyGroup");
    if (hasInvalidSemanticModeState) return t("ruleEditor.header.saveDisabledInvalidMode");
    return undefined;
  }, [hasEmptyConditionGroup, hasInvalidSemanticModeState]);
  const diff = useMemo(() => buildNodeDiffDetail(baselineRootRef.current, rule.root), [rule.root]);
  const selectedNode = useMemo(
    () => (rule.root && selectedNodeId ? findNode(rule.root, selectedNodeId) : null),
    [rule.root, selectedNodeId]
  );
  const activePreviewNode = useMemo(
    () =>
      rule.root && previewState.activeNodeId
        ? findNode(rule.root, previewState.activeNodeId)
        : null,
    [rule.root, previewState]
  );
  const activePreviewNodeLabel = activePreviewNode ? nodeLabel(activePreviewNode) : null;
  const impactRanking: ConditionImpactItem[] = previewResult?.impactRanking ?? [];
  const workspaceViewMode = openViews.effectValidation ? "split" : "edit";
  const analysisTabs: AnalysisTab[] = useMemo(
    () => [
      { id: "FULL", title: "FULL", kind: "FULL", stale: fullTabStale },
      ...nodeTabs,
      { id: "IMPACT", title: "IMPACT", kind: "IMPACT", stale: impactTabStale },
    ],
    [fullTabStale, nodeTabs, impactTabStale]
  );

  useEffect(() => {
    setFullTabStale(true);
    setImpactTabStale(true);
    setNodeTabs((prev) => prev.map((tab) => ({ ...tab, stale: true })));
  }, [rule.root]);

  const setRoot = (nextRoot: UiExpressionNode | null) => {
    onChange({ ...rule, root: nextRoot });
  };

  const toLogicNode = (node: UiExpressionNode | null): UiExpressionNode => {
    if (!node) {
      return createNode("LOGIC");
    }
    if (node.type === "LOGIC") return node;
    if (node.type === "STRUCTURE") {
      if (node.child?.type === "LOGIC") return node.child;
      return createNode("LOGIC");
    }
    const logic = createNode("LOGIC");
    if (logic.type !== "LOGIC") return logic;
    return { ...logic, children: [node] };
  };

  const buildStructureChild = (scope: StructureScope, existing: UiExpressionNode | null): UiExpressionNode => {
    const logic = toLogicNode(existing);
    if (scope === "DOCUMENT") {
      return logic;
    }
    const structure = createNode("STRUCTURE");
    if (structure.type !== "STRUCTURE") {
      return logic;
    }
    return {
      ...structure,
      scope,
      child: logic,
    };
  };

  const createDefaultStructureForField = (field: RuleField): UiExpressionNode => {
    const options = structureScopeOptionsForField(capability, field);
    return buildStructureChild(options[0] ?? "DOCUMENT", null);
  };

  const defaultPositionRelationForCapability = (): PositionRelationScope => {
    if (capability.structure.allowRelation.includes("SENTENCE")) return "SENTENCE";
    if (capability.structure.allowRelation.includes("PARAGRAPH")) return "PARAGRAPH";
    return "NEAR";
  };

  const handleCreateRoot = (type: UiNodeType) => {
    if (type !== "FIELD") return;
    const root = createNode(type);
    if (root.type === "FIELD") {
      root.field = capability.where.allowFields.includes("CONTENT")
        ? "CONTENT"
        : capability.where.allowFields[0] ?? "CONTENT";
      root.child = createDefaultStructureForField(root.field);
    }
    setRoot(root);
    setSelectedNodeId(root.id);
  };

  const handleAddChild = (parentId: string, type: UiNodeType) => {
    if (!rule.root) return;
    const parent = findNode(rule.root, parentId);
    if (!parent) return;
    const allowed = getAllowedChildTypes(parent, capability);
    if (!allowed.includes(type)) return;
    if (type === "TERM_SET") {
      setTermSelector({
        open: true,
        targetNodeId: null,
        targetParentId: parentId,
        initialSelected: [],
      });
      return;
    }
    const child = createNode(type);
    if (child.type === "STRUCTURE" && parent.type === "FIELD") {
      const options = structureScopeOptionsForField(capability, parent.field);
      child.scope = options[0] ?? "DOCUMENT";
    }
    setRoot(insertChild(rule.root, parentId, child));
    setSelectedNodeId(child.id);
  };

  const handleDeleteNode = (nodeId: string) => {
    if (!rule.root) return;
    if (rule.root.id === nodeId && rule.root.type === "FIELD") return;
    if (
      rule.root.type === "FIELD" &&
      ((rule.root.child?.type === "LOGIC" && rule.root.child.id === nodeId) ||
        (rule.root.child?.type === "STRUCTURE" &&
          rule.root.child.child?.type === "LOGIC" &&
          rule.root.child.child.id === nodeId))
    ) {
      return;
    }
    let nextRoot: UiExpressionNode | null = null;
    try {
      nextRoot = removeNode(rule.root, nodeId);
    } catch {
      return;
    }
    setRoot(nextRoot);
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(nextRoot?.id ?? null);
    }
  };

  const handleChangeRootField = (nodeId: string, field: RuleField) => {
    if (!rule.root) return;
    setRoot(
      updateNode(rule.root, nodeId, (node) => {
        if (node.type !== "FIELD") return node;
        if (node.field === field) return node;
        return {
          ...node,
          field,
          child: createDefaultStructureForField(field),
        };
      })
    );
    setSelectedNodeId(nodeId);
  };

  const handleChangeStructureScope = (scope: StructureScope) => {
    if (!rule.root || rule.root.type !== "FIELD") return;
    setRoot(
      updateNode(rule.root, rule.root.id, (node) => {
        if (node.type !== "FIELD") return node;
        const options = structureScopeOptionsForField(capability, node.field);
        const target = options.includes(scope) ? scope : options[0] ?? "DOCUMENT";
        return {
          ...node,
          child: buildStructureChild(target, node.child),
        };
      })
    );
    setSelectedNodeId(rule.root.id);
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
      targetParentId: null,
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
    if (!rule.root) return;
    if (terms.length === 0) {
      setTermSelector({ open: false, targetNodeId: null, targetParentId: null, initialSelected: [] });
      return;
    }
    if (termSelector.targetNodeId) {
      setRoot(
        updateNode(rule.root, termSelector.targetNodeId, (node) =>
          node.type === "TERM_SET" ? { ...node, terms: selectedTermsToExpressions(terms) } : node
        )
      );
      setSelectedNodeId(termSelector.targetNodeId);
      setTermSelector({ open: false, targetNodeId: null, targetParentId: null, initialSelected: [] });
      return;
    }
    if (termSelector.targetParentId) {
      const child = createNode("TERM_SET");
      if (child.type === "TERM_SET") {
        const next = { ...child, terms: selectedTermsToExpressions(terms) };
        setRoot(insertChild(rule.root, termSelector.targetParentId, next));
        setSelectedNodeId(next.id);
      }
    }
    setTermSelector({ open: false, targetNodeId: null, targetParentId: null, initialSelected: [] });
  };

  const handleDebugNode = (nodeId: string) => {
    const node = rule.root ? findNode(rule.root, nodeId) : null;
    const tabTitle = node ? `NODE-${nodeLabel(node)}` : `NODE-${nodeId}`;
    setNodeTabs((prev) => {
      if (prev.some((item) => item.id === `NODE:${nodeId}`)) {
        return prev.map((item) =>
          item.id === `NODE:${nodeId}` ? { ...item, stale: false, title: tabTitle } : item
        );
      }
      return [
        ...prev,
        {
          id: `NODE:${nodeId}`,
          title: tabTitle,
          kind: "NODE",
          nodeId,
          stale: false,
          closable: true,
        },
      ];
    });
    setActiveTabId(`NODE:${nodeId}`);
    setPreviewState({ activeNodeId: nodeId });
    setOpenViews((prev) => ({
      ...prev,
      effectValidation: true,
      gqlPreview: true,
    }));
    onRunNode?.(nodeId, { page: 1, size: 20, withHighlight: true, withItems: true });
  };

  const handleRunWorkspace = () => {
    setFullTabStale(false);
    setImpactTabStale(false);
    onRunWorkspace?.({ page: 1, size: 20 });
  };

  const handleRunNodeById = (nodeId: string) => {
    const node = rule.root ? findNode(rule.root, nodeId) : null;
    const tabTitle = node ? `NODE-${nodeLabel(node)}` : `NODE-${nodeId}`;
    setNodeTabs((prev) => {
      if (prev.some((item) => item.id === `NODE:${nodeId}`)) {
        return prev.map((item) =>
          item.id === `NODE:${nodeId}` ? { ...item, stale: false, title: tabTitle } : item
        );
      }
      return [
        ...prev,
        {
          id: `NODE:${nodeId}`,
          title: tabTitle,
          kind: "NODE",
          nodeId,
          stale: false,
          closable: true,
        },
      ];
    });
    setActiveTabId(`NODE:${nodeId}`);
    setPreviewState({ activeNodeId: nodeId });
    onRunNode?.(nodeId, { page: 1, size: 20, withHighlight: true, withItems: true });
  };

  const handleChangeFullPage = (page: number) => {
    const normalizedPage = Math.max(1, page);
    onRunWorkspace?.({ page: normalizedPage, size: 20 });
  };

  const handleChangeNodePage = (page: number) => {
    const normalizedPage = Math.max(1, page);
    const nodeId = previewState.activeNodeId ?? selectedNodeId;
    if (!nodeId) return;
    onRunNode?.(nodeId, { page: normalizedPage, size: 20, withHighlight: true, withItems: true });
  };

  const handleSelectTab = (tabId: string) => {
    setActiveTabId(tabId);
    if (tabId === "FULL") {
      setFullTabStale(false);
      onRunWorkspace?.({ page: 1, size: 20 });
      return;
    }
    if (tabId.startsWith("NODE:")) {
      const nodeId = tabId.replace("NODE:", "");
      setPreviewState({ activeNodeId: nodeId });
      onRunNode?.(nodeId, { page: 1, size: 20, withHighlight: true, withItems: true });
    }
  };

  const findPositionRelationChild = (logicNode: UiExpressionNode): UiPositionRelationNode | null => {
    if (logicNode.type !== "LOGIC") return null;
    const found = logicNode.children.find((child) => child.type === "POSITION_RELATION");
    return found?.type === "POSITION_RELATION" ? found : null;
  };

  const openPositionEditor = (
    parentId: string,
    editingNodeId: string | null,
    draft?: Partial<PositionRelationDraft>
  ) => {
    const relation = draft?.relation ?? defaultPositionRelationForCapability();
    const distance = Math.max(1, Math.round(draft?.distance ?? 5));
    const ordered = Boolean(draft?.ordered);
    setPositionEditor({
      open: true,
      parentId,
      editingNodeId,
      draft: { relation, distance, ordered },
    });
  };

  const handleSetPositionRelation = (parentId: string) => {
    if (!rule.root) return;
    const parent = findNode(rule.root, parentId);
    if (!parent || parent.type !== "LOGIC") return;
    const allowed = getAllowedChildTypes(parent, capability);
    if (!allowed.includes("POSITION_RELATION")) return;
    if (!canCreatePositionMode(capability, "PROXIMITY")) return;
    const termCount = parent.children.filter((child) => child.type === "TERM_SET").length;
    if (termCount < 2) return;
    if (findPositionRelationChild(parent)) return;
    openPositionEditor(parentId, null, { distance: 5, ordered: false });
  };

  const handleEditPositionRelation = (parentId: string) => {
    if (!rule.root) return;
    const parent = findNode(rule.root, parentId);
    if (!parent || parent.type !== "LOGIC") return;
    const existing = findPositionRelationChild(parent);
    if (!existing) return;
    openPositionEditor(parentId, existing.id, {
      relation: existing.relation ?? "NEAR",
      distance: existing.distance ?? 5,
      ordered: Boolean(existing.ordered),
    });
  };

  const handleCancelPositionRelation = (parentId: string) => {
    if (!rule.root) return;
    setRoot(
      updateNode(rule.root, parentId, (node) => {
        if (node.type !== "LOGIC") return node;
        const index = node.children.findIndex((child) => child.type === "POSITION_RELATION");
        if (index < 0) return node;
        const existing = node.children[index];
        if (existing.type !== "POSITION_RELATION") return node;
        const before = node.children.slice(0, index);
        const after = node.children.slice(index + 1);
        return { ...node, children: [...before, ...existing.children, ...after] };
      })
    );
    setSelectedNodeId(parentId);
  };

  const handleConfirmPositionRelation = () => {
    if (!rule.root || !positionEditor.parentId) return;
    const draft = positionEditor.draft;
    const normalizedDistance = Math.max(1, Math.round(draft.distance || 1));
    let normalizedRelation: PositionRelationScope =
      draft.relation === "SENTENCE" && capability.structure.allowRelation.includes("SENTENCE")
        ? "SENTENCE"
        : draft.relation === "PARAGRAPH" && capability.structure.allowRelation.includes("PARAGRAPH")
        ? "PARAGRAPH"
        : "NEAR";
    if (
      normalizedRelation === "NEAR" &&
      !capability.structure.allowRelation.includes("NEAR") &&
      !capability.structure.allowDistance
    ) {
      normalizedRelation = defaultPositionRelationForCapability();
    }
    const ordered = capability.structure.allowOrder ? Boolean(draft.ordered) : false;

    if (positionEditor.editingNodeId) {
      setRoot(
        updateNode(rule.root, positionEditor.editingNodeId, (node) => {
          if (node.type !== "POSITION_RELATION") return node;
          return {
            ...node,
            mode: "PROXIMITY",
            relation: normalizedRelation,
            ordered,
            distance: normalizedRelation === "NEAR" ? normalizedDistance : undefined,
            strict: undefined,
          };
        })
      );
      setSelectedNodeId(positionEditor.editingNodeId);
      setPositionEditor((prev) => ({ ...prev, open: false }));
      return;
    }

    const relationNode = createPositionRelationNode("PROXIMITY");
    const relationNodeId = relationNode.id;
    setRoot(
      updateNode(rule.root, positionEditor.parentId, (node) => {
        if (node.type !== "LOGIC") return node;
        const termIndexes = node.children
          .map((child, index) => ({ child, index }))
          .filter((item) => item.child.type === "TERM_SET")
          .map((item) => item.index);
        if (termIndexes.length < 2) return node;
        const firstTermIndex = Math.min(...termIndexes);
        const termIndexSet = new Set(termIndexes);
        const extracted = node.children
          .filter((_, index) => termIndexSet.has(index))
          .filter((child): child is Extract<UiExpressionNode, { type: "TERM_SET" }> => child.type === "TERM_SET");
        const remain = node.children.filter((_, index) => !termIndexSet.has(index));
        const insertAt = node.children
          .slice(0, firstTermIndex)
          .filter((child) => child.type !== "TERM_SET").length;
        const prefix = remain.slice(0, insertAt);
        const suffix = remain.slice(insertAt);
        return {
          ...node,
          children: [
            ...prefix,
            {
              ...relationNode,
              mode: "PROXIMITY",
              relation: normalizedRelation,
              ordered,
              distance: normalizedRelation === "NEAR" ? normalizedDistance : undefined,
              strict: undefined,
              children: extracted,
            },
            ...suffix,
          ],
        };
      })
    );
    setSelectedNodeId(relationNodeId);
    setPositionEditor((prev) => ({ ...prev, open: false }));
  };

  const handleCloseNodeTab = (tabId: string) => {
    setNodeTabs((prev) => prev.filter((tab) => tab.id !== tabId));
    if (activeTabId === tabId) {
      setActiveTabId("FULL");
    }
  };

  const handleAddNodeTab = () => {
    const nodeId = selectedNodeId ?? previewState.activeNodeId;
    if (!nodeId) return;
    handleRunNodeById(nodeId);
  };

  return (
    <CapabilityProvider value={capability}>
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
          disableSave={hasEmptyConditionGroup || hasInvalidSemanticModeState}
          disableSaveHint={disableSaveHint}
          onDeleteDraft={onDeleteDraft}
          onSubmit={onSubmit}
          onPublish={onPublish}
          openViews={openViews}
          onToggleOpenView={(option, checked) => {
            setOpenViews((prev) => {
              const next = {
                ...prev,
                [option]: checked,
              };
              if ((option === "gqlPreview" || option === "effectValidation") && checked) {
                next.effectValidation = true;
                next.gqlPreview = true;
              }
              return next;
            });
            if ((option === "gqlPreview" || option === "effectValidation") && checked) {
              setActiveTabId("FULL");
              onRunWorkspace?.({ page: 1, size: 20 });
            }
          }}
        />
      }
      workspace={
        <MainWorkspace
          viewMode={workspaceViewMode}
          analysisCollapsed={analysisCollapsed}
          onChangeAnalysisCollapsed={setAnalysisCollapsed}
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
              onSetPositionRelation={handleSetPositionRelation}
              onEditPositionRelation={handleEditPositionRelation}
              onCancelPositionRelation={handleCancelPositionRelation}
              onPatchNode={handlePatchNode}
              onDelete={handleDeleteNode}
              onMoveChild={handleMoveChild}
              onEditTermSet={handleOpenTermSelectorForNode}
              activePreviewNodeId={previewState.activeNodeId}
              onDebugNode={handleDebugNode}
              diffMode={diffMode}
              onToggleDiffMode={() => setDiffMode((prev) => !prev)}
              diffStatusById={diff.statusById}
            />
          }
          effectValidationPanel={
            <EffectValidationPanel
              busy={previewBusy}
              error={previewError}
              gqlPreviewEnabled={openViews.gqlPreview}
              activeNodeLabel={activePreviewNodeLabel}
              impactRanking={impactRanking}
              fullRuntimeResult={fullRuntimeResult}
              impactRuntimeResult={impactRuntimeResult}
              nodeRuntimeResults={nodeRuntimeResults}
              analysisTabs={analysisTabs}
              activeTabId={activeTabId}
              runtimeOptions={runtimeOptions}
              activeRuntimeId={activeRuntimeId}
              onChangeRuntime={onChangeRuntime}
              analysisCollapsed={analysisCollapsed}
              onToggleAnalysisCollapsed={() => setAnalysisCollapsed((prev) => !prev)}
              onGenerate={openViews.gqlPreview ? handleRunWorkspace : undefined}
              onChangeFullPage={openViews.gqlPreview ? handleChangeFullPage : undefined}
              onChangeNodePage={openViews.gqlPreview ? handleChangeNodePage : undefined}
              onRunNodeById={openViews.gqlPreview ? handleRunNodeById : undefined}
              onSelectTab={openViews.gqlPreview ? handleSelectTab : undefined}
              onCloseNodeTab={openViews.gqlPreview ? handleCloseNodeTab : undefined}
              onAddNodeTab={openViews.gqlPreview ? handleAddNodeTab : undefined}
            />
          }
          rightSidebar={
            <RightSidebar
              propertyPanel={
                <NodeInspector
                  node={selectedNode}
                  rootField={rule.root?.type === "FIELD" ? rule.root.field : null}
                  rootStructureScope={
                    rule.root?.type === "FIELD" && rule.root.child?.type === "STRUCTURE"
                      ? rule.root.child.scope
                      : "DOCUMENT"
                  }
                  readOnly={readOnly}
                  onPatchNode={handlePatchNode}
                  onChangeField={handleChangeRootField}
                  onChangeStructureScope={handleChangeStructureScope}
                  onEditTermSet={handleEditTermSet}
                />
              }
              explainPanel={<ExplainPanel explain={explain} />}
              validationPanel={<ValidationPanel issues={validationIssues} />}
              diffPreviewPanel={openViews.diffCompare ? <DiffPreviewPanel diff={diff} /> : null}
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
        />
      }
      footer={null}
      modals={
        <GlobalModals
          termSelectorModal={
            <TermSelectorModal
              open={termSelector.open}
              onClose={() =>
                setTermSelector({ open: false, targetNodeId: null, targetParentId: null, initialSelected: [] })
              }
              initialSelected={termSelector.initialSelected}
              onConfirm={handleConfirmTerms}
            />
          }
          confirmDialog={
            positionEditor.open ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl">
                  <div className="text-sm font-semibold">{t("ruleEditor.positionEditor.title")}</div>
                  <div className="mt-1 text-xs text-slate-500">{t("ruleEditor.positionEditor.subtitle")}</div>
                  <div className="mt-4 space-y-3">
                    <div className="space-y-2">
                      <div className="text-xs text-slate-500">{t("ruleEditor.positionEditor.range")}</div>
                      {capability.structure.allowRelation.includes("SENTENCE") && (
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="position-range"
                            checked={positionEditor.draft.relation === "SENTENCE"}
                            onChange={() =>
                              setPositionEditor((prev) => ({
                                ...prev,
                                draft: { ...prev.draft, relation: "SENTENCE" },
                              }))
                            }
                          />
                          {t("ruleEditor.positionEditor.range.sentence")}
                        </label>
                      )}
                      {capability.structure.allowRelation.includes("PARAGRAPH") && (
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="position-range"
                            checked={positionEditor.draft.relation === "PARAGRAPH"}
                            onChange={() =>
                              setPositionEditor((prev) => ({
                                ...prev,
                                draft: { ...prev.draft, relation: "PARAGRAPH" },
                              }))
                            }
                          />
                          {t("ruleEditor.positionEditor.range.paragraph")}
                        </label>
                      )}
                      {(capability.structure.allowRelation.includes("NEAR") ||
                        capability.structure.allowDistance) && (
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="position-range"
                            checked={positionEditor.draft.relation === "NEAR"}
                            onChange={() =>
                              setPositionEditor((prev) => ({
                                ...prev,
                                draft: { ...prev.draft, relation: "NEAR" },
                              }))
                            }
                          />
                          <span>{t("ruleEditor.positionEditor.range.near")}</span>
                          <input
                            type="number"
                            min={1}
                            value={positionEditor.draft.distance}
                            onChange={(event) =>
                              setPositionEditor((prev) => ({
                                ...prev,
                                draft: {
                                  ...prev.draft,
                                  distance: Math.max(1, Math.round(Number(event.target.value || 1))),
                                },
                              }))
                            }
                            disabled={positionEditor.draft.relation !== "NEAR" || !capability.structure.allowDistance}
                            className="h-8 w-20 rounded border px-2 text-sm"
                          />
                          <span>{t("ruleEditor.positionEditor.range.nearSuffix")}</span>
                        </label>
                      )}
                    </div>

                    {capability.structure.allowOrder && (
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={positionEditor.draft.ordered}
                          onChange={(event) =>
                            setPositionEditor((prev) => ({
                              ...prev,
                              draft: { ...prev.draft, ordered: event.target.checked },
                            }))
                          }
                        />
                        {t("ruleEditor.positionEditor.order")}
                      </label>
                    )}
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50"
                      onClick={() => setPositionEditor((prev) => ({ ...prev, open: false }))}
                    >
                      {t("common.cancel")}
                    </button>
                    <button
                      type="button"
                      className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50"
                      onClick={handleConfirmPositionRelation}
                    >
                      {t("common.confirm")}
                    </button>
                  </div>
                </div>
              </div>
            ) : null
          }
        />
      }
      />
    </CapabilityProvider>
  );
}

function hasEmptyLogicGroup(node: UiExpressionNode | null): boolean {
  if (!node) return true;
  switch (node.type) {
    case "LOGIC":
      if (node.children.length === 0) return true;
      return node.children.some((child) => hasEmptyLogicGroup(child));
    case "FIELD":
    case "STRUCTURE":
    case "NOT":
    case "SCORE":
      return node.child ? hasEmptyLogicGroup(node.child) : false;
    case "POSITION_RELATION":
    case "PROXIMITY":
      return node.children.some((child) => hasEmptyLogicGroup(child));
    case "TERM_SET":
    case "TOPIC_REF":
      return false;
  }
}

function hasInvalidSemanticMode(node: UiExpressionNode | null): boolean {
  if (!node) return false;
  switch (node.type) {
    case "LOGIC": {
      const needTwoChildrenMode =
        node.operator === "AT_LEAST" ||
        node.operator === "ACCRUE" ||
        node.operator === "LOGSUM" ||
        node.operator === "WEIGHTED";
      if (needTwoChildrenMode && node.children.length < 2) return true;
      return node.children.some((child) => hasInvalidSemanticMode(child));
    }
    case "FIELD":
    case "STRUCTURE":
    case "NOT":
    case "SCORE":
      return node.child ? hasInvalidSemanticMode(node.child) : false;
    case "POSITION_RELATION":
    case "PROXIMITY":
      return node.children.some((child) => hasInvalidSemanticMode(child));
    case "TERM_SET":
    case "TOPIC_REF":
      return false;
  }
}

