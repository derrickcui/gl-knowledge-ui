import { useEffect, useMemo, useRef, useState } from "react";
import { RuleEditorLayout } from "./rule-editor/RuleEditorLayout";
import type {
  PositionRelationScope,
  RuleField,
  UiCapabilityViewModel,
  UiExpressionNode,
  UiNodeType,
  UiPositionRelationNode,
  UiRuleViewModel,
  UiTermSetNode,
} from "./rule-editor/types";
import { ExplainPanel, type ExplainViewModel } from "./rule-editor/ExplainPanel";
import { buildNodeDiffDetail, type NodeDiffDetail } from "./rule-editor/diff";
import { validateTree } from "./rule-editor/validation";
import { normalizeExpressionTree } from "./rule-editor/expression-normalizer";
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
import { RuleIntelligencePanel } from "./rule-editor/RuleIntelligencePanel";
import { RuleVersionTimelinePanel, type RuleVersionEntry } from "./rule-editor/RuleVersionTimelinePanel";
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
import type { SelectedTerm } from "./rule-editor/term-selector-types";
import { buildExplainViewModel } from "./rule-editor/explain/explain-builder";
import { wrapNodesInField } from "./rule-editor/operations/wrapNodes";
import { moveNode } from "./rule-editor/operations/moveNode";
import { validateParentChild } from "./rule-editor/validator/validateParentChild";
import { formatExpressionTree } from "./rule-editor/format-expression-tree";
import { detectProximitySuggestion, type ProximitySuggestion } from "./rule-editor/suggestion-engine";
import { applyAutoFix } from "./rule-editor/auto-fix";
import type { GeneratedRuleCandidate } from "./rule-editor/rule-auto-generate";
import { generateRuleCandidatesFromRuntime } from "./rule-editor/rule-auto-generate";
import {
  assessRuleRisk,
  buildHeatLevelByNodeId,
  buildOptimizationSuggestions,
  computeComplexityMetrics,
  computeHitDistribution,
  computePerformanceMetrics,
  recommendTemplates,
  type OptimizationSuggestion,
  type ComplexityMetrics,
  type HitDistribution,
  type PerformanceMetrics,
  type RiskAssessment,
} from "./rule-editor/rule-intelligence";
import type {
  ConditionImpactItem,
  PreviewDocumentDetailResponse,
  RulePreviewResponse,
} from "@/lib/rule-preview-api";
import type { RuntimeActiveItem } from "@/lib/api/runtime";
import type { RuntimeExecuteResponse } from "@/lib/api/ruleRuntime";
import type { RuntimeExecuteOptions } from "@/lib/api/ruleRuntime";
import type { RuleAbTestResult } from "./rule-editor/ab-test";

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
  saveDraftBusy?: boolean;
  deleteDraftBusy?: boolean;
  submitReviewBusy?: boolean;
  publishBusy?: boolean;
  onBack?: () => void;
  onSave?: () => void;
  onDeleteDraft?: () => void;
  onRunWorkspace?: (options?: { page?: number; size?: number }) => void;
  onRunNode?: (nodeId: string, options?: RuntimeExecuteOptions) => void;
  onRunAbTest?: () => void;
  onSelectPreviewDocument?: (docId: string) => void;
  onSubmit?: () => void;
  onPublish?: () => void;
  onChange: (next: UiRuleViewModel) => void;
  readOnly?: boolean;
  previewResult?: RulePreviewResponse | null;
  previewPage?: number;
  previewPageSize?: number;
  previewDocument?: PreviewDocumentDetailResponse | null;
  previewDocumentBusy?: boolean;
  previewError?: string | null;
  previewBusy?: boolean;
  compiledGql?: string | null;
  compiledGqlSource?: "server" | "local-compiler" | null;
  fullRuntimeResult?: Extract<RuntimeExecuteResponse, { mode: "FULL" }> | null;
  impactRuntimeResult?: Extract<RuntimeExecuteResponse, { mode: "IMPACT" }> | null;
  nodeRuntimeResults?: Record<string, Extract<RuntimeExecuteResponse, { mode: "NODE" }>>;
  runtimeOptions?: RuntimeActiveItem[];
  activeRuntimeId?: number | null;
  onChangeRuntime?: (id: number) => void;
  abTestResult?: RuleAbTestResult | null;
  complexityMetricsOverride?: ComplexityMetrics | null;
  hitDistributionOverride?: HitDistribution | null;
  performanceMetricsOverride?: PerformanceMetrics | null;
  riskAssessmentOverride?: RiskAssessment | null;
  optimizationSuggestionsOverride?: OptimizationSuggestion[] | null;
  versionHistoryOverride?: RuleVersionEntry[] | null;
  diffOverride?: NodeDiffDetail | null;
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
  saveDraftBusy = false,
  deleteDraftBusy = false,
  submitReviewBusy = false,
  publishBusy = false,
  onBack,
  onSave,
  onDeleteDraft,
  onRunWorkspace,
  onRunNode,
  onRunAbTest,
  onSelectPreviewDocument,
  onSubmit,
  onPublish,
  onChange,
  readOnly = false,
  previewResult = null,
  previewPage = 1,
  previewPageSize = 20,
  previewDocument = null,
  previewDocumentBusy = false,
  previewError = null,
  previewBusy = false,
  compiledGql = null,
  compiledGqlSource = null,
  fullRuntimeResult = null,
  impactRuntimeResult = null,
  nodeRuntimeResults = {},
  runtimeOptions = [],
  activeRuntimeId = null,
  onChangeRuntime,
  abTestResult = null,
  complexityMetricsOverride = null,
  hitDistributionOverride = null,
  performanceMetricsOverride = null,
  riskAssessmentOverride = null,
  optimizationSuggestionsOverride = null,
  versionHistoryOverride = null,
  diffOverride = null,
}: RuleEditorProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(rule.root?.id ?? null);
  const [collapsedByUser, setCollapsedByUser] = useState<Record<string, boolean>>({});
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
  const [visibleStructureHints, setVisibleStructureHints] = useState<string[]>([]);
  const [draftBPreview, setDraftBPreview] = useState<{
    candidateId: string;
    root: UiExpressionNode;
    added: number;
    removed: number;
    changed: number;
  } | null>(null);
  const [versionHistory, setVersionHistory] = useState<RuleVersionEntry[]>([]);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [draggingNodeType, setDraggingNodeType] = useState<UiExpressionNode["type"] | null>(null);
  const lastHintKeyRef = useRef<string>("");

  const baselineRootRef = useRef<UiExpressionNode | null>(rule.root);
  const prevDirtyRef = useRef<boolean>(dirty);
  const prevStatusRef = useRef<string>(status);
  const prevAbTestRef = useRef<string | null>(abTestResult?.generatedAt ?? null);
  const versionSeqRef = useRef<number>(0);
  const validationIssues = useMemo(() => validateTree(rule.root, capability), [rule.root, capability]);
  const hasEmptyConditionGroup = useMemo(() => hasEmptyLogicGroup(rule.root), [rule.root]);
  const hasInvalidSemanticModeState = useMemo(() => hasInvalidSemanticMode(rule.root), [rule.root]);
  const structureHints = useMemo(() => collectStructureHints(rule.root), [rule.root]);
  const proximitySuggestion = useMemo(() => detectProximitySuggestion(rule.root), [rule.root]);
  const fieldConflictNodeIds = useMemo(() => collectFieldConflictNodeIds(rule.root), [rule.root]);
  const impactRanking: ConditionImpactItem[] = previewResult?.impactRanking ?? [];
  const intelligenceFullTotal = fullRuntimeResult?.total ?? impactRuntimeResult?.fullTotal ?? previewResult?.total ?? 0;
  const heatLevelByNodeId = useMemo(
    () => buildHeatLevelByNodeId(impactRuntimeResult, impactRanking, intelligenceFullTotal),
    [impactRuntimeResult, impactRanking, intelligenceFullTotal]
  );
  const localComplexityMetrics = useMemo(() => computeComplexityMetrics(rule.root), [rule.root]);
  const localHitDistribution = useMemo(() => computeHitDistribution(fullRuntimeResult), [fullRuntimeResult]);
  const localPerformanceMetrics = useMemo(
    () => computePerformanceMetrics(rule.root, fullRuntimeResult, impactRuntimeResult),
    [rule.root, fullRuntimeResult, impactRuntimeResult]
  );
  const localRiskAssessment = useMemo(
    () => assessRuleRisk(rule.root, intelligenceFullTotal, impactRuntimeResult, impactRanking),
    [rule.root, intelligenceFullTotal, impactRuntimeResult, impactRanking]
  );
  const localOptimizationSuggestions = useMemo(
    () => buildOptimizationSuggestions(rule.root, impactRuntimeResult, impactRanking),
    [rule.root, impactRuntimeResult, impactRanking]
  );
  const templateRecommendations = useMemo(() => recommendTemplates(rule.root), [rule.root]);
  const generatedCandidates = useMemo(
    () => generateRuleCandidatesFromRuntime(fullRuntimeResult, impactRuntimeResult),
    [fullRuntimeResult, impactRuntimeResult]
  );
  const nodeErrorById = useMemo(() => buildNodeErrorById(validationIssues), [validationIssues]);
  const debugStateByNodeId = useMemo(
    () => buildDebugStateByNodeId(activeTabId, previewState.activeNodeId, impactRuntimeResult, impactRanking),
    [activeTabId, previewState.activeNodeId, impactRuntimeResult, impactRanking]
  );
  const disableSaveHint = useMemo(() => {
    if (hasEmptyConditionGroup) return t("ruleEditor.header.saveDisabledEmptyGroup");
    if (hasInvalidSemanticModeState) return t("ruleEditor.header.saveDisabledInvalidMode");
    return undefined;
  }, [hasEmptyConditionGroup, hasInvalidSemanticModeState]);
  const localDiff = useMemo(() => buildNodeDiffDetail(baselineRootRef.current, rule.root), [rule.root]);
  const complexityMetrics = complexityMetricsOverride ?? localComplexityMetrics;
  const hitDistribution = hitDistributionOverride ?? localHitDistribution;
  const performanceMetrics = performanceMetricsOverride ?? localPerformanceMetrics;
  const riskAssessment = riskAssessmentOverride ?? localRiskAssessment;
  const optimizationSuggestions = optimizationSuggestionsOverride ?? localOptimizationSuggestions;
  const diff = diffOverride ?? localDiff;
  const effectiveVersionHistory = versionHistoryOverride && versionHistoryOverride.length > 0 ? versionHistoryOverride : versionHistory;
  const explainViewModel = useMemo(
    () => buildExplainViewModel(rule.root, topicName, explain),
    [rule.root, explain, topicName]
  );
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
  const workspaceViewMode = openViews.effectValidation ? "split" : "edit";
  const analysisTabs: AnalysisTab[] = useMemo(
    () => [
      { id: "FULL", title: "FULL", kind: "FULL", stale: fullTabStale },
      ...nodeTabs,
      { id: "IMPACT", title: "IMPACT", kind: "IMPACT", stale: impactTabStale },
    ],
    [fullTabStale, nodeTabs, impactTabStale]
  );
  const collapseState = useMemo(() => buildCollapseState(rule.root, collapsedByUser), [rule.root, collapsedByUser]);

  useEffect(() => {
    setFullTabStale(true);
    setImpactTabStale(true);
    setNodeTabs((prev) => prev.map((tab) => ({ ...tab, stale: true })));
  }, [rule.root]);

  useEffect(() => {
    const firstError = validationIssues.find((item) => item.severity === "error");
    if (!firstError) return;
    expandPathToNode(firstError.nodeId);
  }, [validationIssues]);

  useEffect(() => {
    if (!rule.root) {
      setCollapsedByUser({});
    }
  }, [rule.root]);

  useEffect(() => {
    if (!rule.root) return;
    if (versionHistory.length > 0) return;
    versionSeqRef.current = 1;
    setVersionHistory([
      buildVersionEntry("LOADED", 1, diff.added, diff.removed, diff.changed, riskAssessment.level, complexityMetrics.score),
    ]);
  }, [rule.root, versionHistory.length, diff.added, diff.removed, diff.changed, riskAssessment.level, complexityMetrics.score]);

  useEffect(() => {
    const prevDirty = prevDirtyRef.current;
    if (prevDirty && !dirty) {
      versionSeqRef.current += 1;
      setVersionHistory((prev) => [
        ...prev,
        buildVersionEntry(
          "SAVED",
          versionSeqRef.current,
          diff.added,
          diff.removed,
          diff.changed,
          riskAssessment.level,
          complexityMetrics.score
        ),
      ]);
    }
    prevDirtyRef.current = dirty;
  }, [dirty, diff.added, diff.removed, diff.changed, riskAssessment.level, complexityMetrics.score]);

  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    if (status !== prevStatus) {
      if (status === "IN_REVIEW") {
        versionSeqRef.current += 1;
        setVersionHistory((prev) => [
          ...prev,
          buildVersionEntry(
            "SUBMITTED",
            versionSeqRef.current,
            diff.added,
            diff.removed,
            diff.changed,
            riskAssessment.level,
            complexityMetrics.score
          ),
        ]);
      } else if (status === "PUBLISHED") {
        versionSeqRef.current += 1;
        setVersionHistory((prev) => [
          ...prev,
          buildVersionEntry(
            "PUBLISHED",
            versionSeqRef.current,
            diff.added,
            diff.removed,
            diff.changed,
            riskAssessment.level,
            complexityMetrics.score
          ),
        ]);
      }
    }
    prevStatusRef.current = status;
  }, [status, diff.added, diff.removed, diff.changed, riskAssessment.level, complexityMetrics.score]);

  useEffect(() => {
    const prev = prevAbTestRef.current;
    const current = abTestResult?.generatedAt ?? null;
    if (current && current !== prev && abTestResult) {
      versionSeqRef.current += 1;
      setVersionHistory((entries) => [
        ...entries,
        buildVersionEntry(
          "AB_TESTED",
          versionSeqRef.current,
          0,
          0,
          0,
          riskAssessment.level,
          complexityMetrics.score,
          {
            winner: abTestResult.winner,
            deltaHit: abTestResult.deltaHit,
            deltaHitRate: abTestResult.deltaHitRate,
          }
        ),
      ]);
    }
    prevAbTestRef.current = current;
  }, [abTestResult, riskAssessment.level, complexityMetrics.score]);

  useEffect(() => {
    if (structureHints.length === 0) return;
    const key = structureHints.join("|");
    if (key === lastHintKeyRef.current) return;
    lastHintKeyRef.current = key;
    setVisibleStructureHints(structureHints);
    const timer = window.setTimeout(() => {
      setVisibleStructureHints([]);
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [structureHints]);

  const setRoot = (nextRoot: UiExpressionNode | null) => {
    onChange({
      ...rule,
      root: nextRoot ? ensureExpressionRoot(normalizeLogsumThresholds(nextRoot)) : null,
    });
  };

  const handleAutoFormat = () => {
    if (!rule.root) return;
    const formatted = formatExpressionTree(rule.root);
    setRoot(formatted);
    setVisibleStructureHints([t("ruleEditor.tree.autoFormatDone")]);
    window.setTimeout(() => setVisibleStructureHints([]), 1500);
  };

  const handleAutoFix = () => {
    if (!rule.root) return;
    const fixed = applyAutoFix(rule.root, validationIssues);
    if (!fixed.fixed) return;
    setRoot(fixed.root);
    setVisibleStructureHints([t("ruleEditor.validation.autoFixDone")]);
    window.setTimeout(() => setVisibleStructureHints([]), 1500);
  };

  const handleApplyProximitySuggestion = (suggestion: ProximitySuggestion) => {
    if (!rule.root) return;
    const termIds = suggestion.termNodeIds;
    setRoot(
      updateNode(rule.root, suggestion.logicNodeId, (node) => {
        if (node.type !== "LOGIC") return node;
        const selectedIndexes = node.children
          .map((child, index) => (termIds.includes(child.id) ? index : -1))
          .filter((index) => index >= 0);
        if (selectedIndexes.length < 2) return node;
        const selectedTerms = selectedIndexes
          .map((index) => node.children[index])
          .filter((child): child is Extract<UiExpressionNode, { type: "TERM_SET" }> => child.type === "TERM_SET");
        if (selectedTerms.length < 2) return node;
        const firstIndex = Math.min(...selectedIndexes);
        const selectedSet = new Set(selectedTerms.map((item) => item.id));
        const remain = node.children.filter((child) => !selectedSet.has(child.id));
        const insertAt = Math.min(firstIndex, remain.length);
        const relationNode = createPositionRelationNode("PROXIMITY");
        const wrapped: UiExpressionNode = {
          ...relationNode,
          mode: "PROXIMITY",
          relation: "NEAR",
          ordered: false,
          distance: 5,
          children: selectedTerms,
        };
        return {
          ...node,
          children: [...remain.slice(0, insertAt), wrapped, ...remain.slice(insertAt)],
        };
      })
    );
    setVisibleStructureHints([t("ruleEditor.tree.suggestion.proximityApplied")]);
    window.setTimeout(() => setVisibleStructureHints([]), 1500);
  };

  const handleApplyOptimizationSuggestion = (suggestion: OptimizationSuggestion) => {
    if (!rule.root) return;
    if (suggestion.type === "BACKEND") return;
    if (suggestion.type === "USE_PROXIMITY") {
      const childIds = (suggestion.payload?.childIds as string[] | undefined) ?? [];
      if (childIds.length >= 2) {
        handleWrapChildren(suggestion.nodeId, childIds, "PROXIMITY");
      }
      return;
    }
    if (suggestion.type === "LOGSUM_TO_AND") {
      handlePatchNode(suggestion.nodeId, (node) =>
        node.type === "LOGIC" ? { ...node, operator: "AND", threshold: undefined } : node
      );
      return;
    }
    if (suggestion.type === "FLATTEN_LOGIC") {
      handleAutoFormat();
      return;
    }
    if (suggestion.type === "REMOVE_LOW_IMPACT") {
      handleDeleteNode(suggestion.nodeId);
    }
  };

  const handleApplyGeneratedCandidate = (candidate: GeneratedRuleCandidate) => {
    if (candidate.action.type === "APPLY_PROXIMITY_HINT") {
      if (proximitySuggestion) {
        handleApplyProximitySuggestion(proximitySuggestion);
      }
      return;
    }
    if (candidate.action.type === "REMOVE_LOW_IMPACT") {
      handleDeleteNode(candidate.action.nodeId);
    }
  };

  const handleGenerateDraftB = (candidate: GeneratedRuleCandidate) => {
    if (!rule.root) return;
    const draft = buildDraftBFromCandidate(rule.root, candidate);
    if (!draft) return;
    const diffPreview = buildNodeDiffDetail(rule.root, draft);
    setDraftBPreview({
      candidateId: candidate.id,
      root: draft,
      added: diffPreview.added,
      removed: diffPreview.removed,
      changed: diffPreview.changed,
    });
  };

  const handleApplyDraftB = () => {
    if (!draftBPreview) return;
    setRoot(draftBPreview.root);
    versionSeqRef.current += 1;
    setVersionHistory((entries) => [
      ...entries,
      buildVersionEntry(
        "DRAFT_B_APPLIED",
        versionSeqRef.current,
        draftBPreview.added,
        draftBPreview.removed,
        draftBPreview.changed,
        riskAssessment.level,
        complexityMetrics.score
      ),
    ]);
    setDraftBPreview(null);
    setVisibleStructureHints([t("ruleEditor.intel.autogen.draftApplied")]);
    window.setTimeout(() => setVisibleStructureHints([]), 1500);
  };

  const expandPathToNode = (nodeId: string) => {
    if (!rule.root) return;
    const path = findPathIds(rule.root, nodeId);
    if (path.length === 0) return;
    setCollapsedByUser((prev) => {
      const next = { ...prev };
      path.forEach((id) => {
        next[id] = false;
      });
      return next;
    });
  };

  const handleSelectNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    expandPathToNode(nodeId);
  };

  const handleToggleCollapse = (nodeId: string) => {
    setCollapsedByUser((prev) => {
      const next = { ...prev };
      const collapsedNow = collapseState.collapsed.has(nodeId) || collapseState.compact.has(nodeId);
      next[nodeId] = !collapsedNow;
      return next;
    });
  };

  const defaultPositionRelationForCapability = (): PositionRelationScope => {
    if (capability.structure.allowRelation.includes("SENTENCE")) return "SENTENCE";
    if (capability.structure.allowRelation.includes("PARAGRAPH")) return "PARAGRAPH";
    return "NEAR";
  };

  const handleCreateRoot = (type: UiNodeType) => {
    if (type !== "LOGIC") return;
    const root = createNode(type);
    setRoot(root);
    setSelectedNodeId(root.id);
  };

  const handleAddChild = (parentId: string, type: UiNodeType) => {
    if (!rule.root) return;
    const parent = findNode(rule.root, parentId);
    if (!parent) return;
    const allowed = getAllowedChildTypes(parent, capability);
    if (!allowed.includes(type)) return;
    if ((parent.type === "POSITION_RELATION" || parent.type === "PROXIMITY") && type === "TERM_SET") {
      const count = "children" in parent && Array.isArray(parent.children) ? parent.children.length : 0;
      if (count >= 5) return;
    }
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
    setRoot(insertChild(rule.root, parentId, child));
    setSelectedNodeId(child.id);
  };

  const handleDeleteNode = (nodeId: string) => {
    if (!rule.root) return;
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

  const handleChangeField = (nodeId: string, field: RuleField) => {
    if (!rule.root) return;
    setRoot(
      updateNode(rule.root, nodeId, (node) => {
        if (node.type !== "FIELD") return node;
        if (node.field === field) return node;
        const nextChild =
          (field === "TITLE" || field === "COLUMN") && node.child?.type === "STRUCTURE"
            ? node.child.child
            : node.child;
        return {
          ...node,
          field,
          child: nextChild,
        };
      })
    );
    setSelectedNodeId(nodeId);
  };

  const handleMoveChild = (parentId: string, childId: string, direction: "up" | "down") => {
    if (!rule.root) return;
    setRoot(moveChild(rule.root, parentId, childId, direction));
  };

  const handlePatchNode = (nodeId: string, updater: (node: UiExpressionNode) => UiExpressionNode) => {
    if (!rule.root) return;
    setRoot(updateNode(rule.root, nodeId, updater));
  };

  const handleWrapChildren = (
    parentId: string,
    childIds: string[],
    mode: "FIELD" | "STRUCTURE" | "PROXIMITY" | "LOGIC"
  ) => {
    if (!rule.root || childIds.length === 0) return;
    if (mode === "FIELD") {
      try {
        setRoot(wrapNodesInField(rule.root, parentId, childIds, capability));
      } catch {
        return;
      }
      return;
    }

    if (mode === "PROXIMITY") {
      const selected = new Set(childIds);
      setRoot(
        updateNode(rule.root, parentId, (node) => {
          if (node.type !== "LOGIC") return node;
          const selectedIndexes = node.children
            .map((child, index) => (selected.has(child.id) ? index : -1))
            .filter((index) => index >= 0);
          if (selectedIndexes.length < 2) return node;
          const selectedTerms = selectedIndexes
            .map((index) => node.children[index])
            .filter((child): child is Extract<UiExpressionNode, { type: "TERM_SET" }> => child.type === "TERM_SET");
          if (selectedTerms.length < 2) return node;
          const firstIndex = Math.min(...selectedIndexes);
          const selectedSet = new Set(selectedTerms.map((item) => item.id));
          const remain = node.children.filter((child) => !selectedSet.has(child.id));
          const insertAt = Math.min(firstIndex, remain.length);
          const relationNode = createPositionRelationNode("PROXIMITY");
          return {
            ...node,
            children: [
              ...remain.slice(0, insertAt),
              {
                ...relationNode,
                mode: "PROXIMITY",
                relation: "NEAR",
                ordered: false,
                distance: 5,
                children: selectedTerms,
              },
              ...remain.slice(insertAt),
            ],
          };
        })
      );
      return;
    }

    const selected = new Set(childIds);
    setRoot(
      updateNode(rule.root, parentId, (node) => {
        if (node.type !== "LOGIC") return node;
        const selectedIndexes = node.children
          .map((child, index) => (selected.has(child.id) ? index : -1))
          .filter((index) => index >= 0);
        if (selectedIndexes.length === 0) return node;

        const firstIndex = Math.min(...selectedIndexes);
        const selectedChildren = selectedIndexes.map((index) => node.children[index]);
        const selectedChildSet = new Set(selectedChildren.map((child) => child.id));
        const logicGroup: UiExpressionNode = {
          ...(createNode("LOGIC") as Extract<UiExpressionNode, { type: "LOGIC" }>),
          operator: "AND",
          children: selectedChildren,
        };
        const wrapped: UiExpressionNode =
          mode === "LOGIC"
            ? logicGroup
            : {
                ...(createNode("STRUCTURE") as Extract<UiExpressionNode, { type: "STRUCTURE" }>),
                scope: capability.structure.allowRelation.includes("SENTENCE")
                  ? "SENTENCE"
                  : capability.structure.allowRelation.includes("PARAGRAPH")
                  ? "PARAGRAPH"
                  : "DOCUMENT",
                child: logicGroup,
              };
        const remaining = node.children.filter((child) => !selectedChildSet.has(child.id));
        const insertAt = Math.min(firstIndex, remaining.length);
        return {
          ...node,
          children: [...remaining.slice(0, insertAt), wrapped, ...remaining.slice(insertAt)],
        };
      })
    );
  };

  const handleDragStartNode = (nodeId: string) => {
    if (!rule.root) return;
    const node = findNode(rule.root, nodeId);
    if (!node) return;
    setDraggingNodeId(nodeId);
    setDraggingNodeType(node.type);
  };

  const handleDragEndNode = () => {
    setDraggingNodeId(null);
    setDraggingNodeType(null);
  };

  const handleDropOnNode = (targetParentId: string, targetIndex: number) => {
    if (!rule.root || !draggingNodeId || !draggingNodeType) return;
    const target = findNode(rule.root, targetParentId);
    if (!target) return;
    if (!validateParentChild(target.type, draggingNodeType, capability)) {
      setVisibleStructureHints([t("ruleEditor.drag.invalidDrop")]);
      window.setTimeout(() => setVisibleStructureHints([]), 1500);
      handleDragEndNode();
      return;
    }
    setRoot(moveNode(rule.root, draggingNodeId, targetParentId, targetIndex, capability));
    handleDragEndNode();
  };

  const canDropAt = (targetParentId: string, targetIndex: number): boolean => {
    if (!rule.root || !draggingNodeId || !draggingNodeType) return false;
    if (draggingNodeId === targetParentId) return false;
    const target = findNode(rule.root, targetParentId);
    const dragging = findNode(rule.root, draggingNodeId);
    if (!target || !dragging) return false;
    if (containsNode(dragging, targetParentId)) return false;
    if (!validateParentChild(target.type, draggingNodeType, capability)) return false;

    if ("children" in target && Array.isArray(target.children)) {
      return targetIndex >= 0 && targetIndex <= target.children.length;
    }
    if ("child" in target) {
      if (target.child) return false;
      return targetIndex === 0;
    }
    return false;
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
        weight:
          node.terms.length === 1
            ? typeof node.weight === "number" && Number.isFinite(node.weight) && node.weight > 0
              ? node.weight
              : typeof item.weight === "number" && Number.isFinite(item.weight) && item.weight > 0
                ? item.weight
                : 1
            : 1,
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
          node.type === "TERM_SET"
            ? {
                ...node,
                terms: selectedTermsToExpressions(terms).map((term) => ({ ...term, weight: 1 })),
                weight:
                  terms.length === 1 && Number.isFinite(terms[0]?.weight) && (terms[0]?.weight ?? 0) > 0
                    ? terms[0].weight
                    : node.weight ?? 1,
              }
            : node
        )
      );
      setSelectedNodeId(termSelector.targetNodeId);
      setTermSelector({ open: false, targetNodeId: null, targetParentId: null, initialSelected: [] });
      return;
    }
    if (termSelector.targetParentId) {
      const child = createNode("TERM_SET");
      if (child.type === "TERM_SET") {
        const next = {
          ...child,
          terms: selectedTermsToExpressions(terms).map((term) => ({ ...term, weight: 1 })),
          weight: terms.length === 1 && Number.isFinite(terms[0]?.weight) && (terms[0]?.weight ?? 0) > 0 ? terms[0].weight : 1,
        };
        setRoot(insertChild(rule.root, termSelector.targetParentId, next));
        setSelectedNodeId(next.id);
      }
    }
    setTermSelector({ open: false, targetNodeId: null, targetParentId: null, initialSelected: [] });
  };

  const handleDebugNode = (nodeId: string) => {
    expandPathToNode(nodeId);
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
    expandPathToNode(nodeId);
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
      expandPathToNode(nodeId);
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
            saveDraftBusy={saveDraftBusy}
            deleteDraftBusy={deleteDraftBusy}
            submitReviewBusy={submitReviewBusy}
            publishBusy={publishBusy}
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
              collapsed={collapseState.collapsed}
              compact={collapseState.compact}
              capability={capability}
              readOnly={readOnly}
              onSelect={handleSelectNode}
              onToggleCollapse={handleToggleCollapse}
              onCreateRoot={handleCreateRoot}
              onAddChild={handleAddChild}
              onSetPositionRelation={handleSetPositionRelation}
              onEditPositionRelation={handleEditPositionRelation}
              onCancelPositionRelation={handleCancelPositionRelation}
              onPatchNode={handlePatchNode}
              onDelete={handleDeleteNode}
              onMoveChild={handleMoveChild}
              onEditTermSet={handleOpenTermSelectorForNode}
              onWrapChildren={handleWrapChildren}
              draggingNodeId={draggingNodeId}
              draggingNodeType={draggingNodeType}
              onDragStartNode={handleDragStartNode}
              onDragEndNode={handleDragEndNode}
              onDropOnNode={handleDropOnNode}
              canDropAt={canDropAt}
              activePreviewNodeId={previewState.activeNodeId}
              onDebugNode={handleDebugNode}
              diffMode={diffMode}
              onToggleDiffMode={() => setDiffMode((prev) => !prev)}
              onAutoFormat={handleAutoFormat}
              proximitySuggestion={proximitySuggestion}
              onApplyProximitySuggestion={handleApplyProximitySuggestion}
              diffStatusById={diff.statusById}
              structureHints={visibleStructureHints}
              conflictNodeIds={fieldConflictNodeIds}
              nodeErrorById={nodeErrorById}
              debugStateByNodeId={debugStateByNodeId}
              heatLevelByNodeId={heatLevelByNodeId}
            />
          }
          effectValidationPanel={
            <EffectValidationPanel
              busy={previewBusy}
              error={previewError}
              compiledGql={compiledGql}
              compiledGqlSource={compiledGqlSource}
              gqlPreviewEnabled={openViews.gqlPreview}
              activeNodeLabel={activePreviewNodeLabel}
              impactRanking={impactRanking}
              previewResult={previewResult}
              previewPage={previewPage}
              previewPageSize={previewPageSize}
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
              hitDistribution={hitDistribution}
              optimizationSuggestions={optimizationSuggestions}
              templateRecommendations={templateRecommendations}
              onApplyOptimizationSuggestion={handleApplyOptimizationSuggestion}
              abTestResult={abTestResult}
              onRunAbTest={onRunAbTest}
              generatedCandidates={generatedCandidates}
              onApplyGeneratedCandidate={handleApplyGeneratedCandidate}
              draftBPreview={
                draftBPreview
                  ? {
                      candidateId: draftBPreview.candidateId,
                      added: draftBPreview.added,
                      removed: draftBPreview.removed,
                      changed: draftBPreview.changed,
                    }
                  : null
              }
              onGenerateDraftB={handleGenerateDraftB}
              onApplyDraftB={handleApplyDraftB}
            />
          }
          rightSidebar={
            <RightSidebar
              propertyPanel={
                <NodeInspector
                  node={selectedNode}
                  readOnly={readOnly}
                  onPatchNode={handlePatchNode}
                  onChangeField={handleChangeField}
                  onEditTermSet={handleEditTermSet}
                />
              }
              explainPanel={<ExplainPanel explain={explainViewModel} />}
              validationPanel={<ValidationPanel issues={validationIssues} onAutoFix={handleAutoFix} />}
              intelligencePanel={
                <RuleIntelligencePanel
                  topicName={topicName}
                  complexity={complexityMetrics}
                  distribution={hitDistribution}
                  suggestions={optimizationSuggestions}
                  templates={templateRecommendations}
                  performance={performanceMetrics}
                  risk={riskAssessment}
                  abTestResult={abTestResult}
                  versionHistory={effectiveVersionHistory}
                  onApplySuggestion={handleApplyOptimizationSuggestion}
                />
              }
              versionTimelinePanel={<RuleVersionTimelinePanel entries={effectiveVersionHistory} />}
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

function buildCollapseState(
  root: UiExpressionNode | null,
  collapsedByUser: Record<string, boolean>
): { collapsed: Set<string>; compact: Set<string> } {
  const collapsed = new Set<string>();
  const compact = new Set<string>();
  if (!root) return { collapsed, compact };

  const walk = (node: UiExpressionNode, depth: number) => {
    const hasChild = hasVisibleChildren(node);
    if (hasChild) {
      const override = collapsedByUser[node.id];
      if (override === true) {
        collapsed.add(node.id);
      } else if (override === false) {
        // force expanded
      } else if (depth >= 4) {
        collapsed.add(node.id);
      } else if (depth === 3) {
        compact.add(node.id);
      }
    }
    if ("children" in node && Array.isArray(node.children)) {
      node.children.forEach((child) => walk(child, depth + 1));
    }
    if ("child" in node && node.child) {
      walk(node.child, depth + 1);
    }
  };

  walk(root, 0);
  return { collapsed, compact };
}

function hasVisibleChildren(node: UiExpressionNode): boolean {
  if ("children" in node && Array.isArray(node.children) && node.children.length > 0) return true;
  if ("child" in node && Boolean(node.child)) return true;
  return false;
}

function findPathIds(root: UiExpressionNode, targetId: string): string[] {
  const path: string[] = [];

  const dfs = (node: UiExpressionNode): boolean => {
    path.push(node.id);
    if (node.id === targetId) return true;
    if ("children" in node && Array.isArray(node.children)) {
      for (const child of node.children) {
        if (dfs(child)) return true;
      }
    }
    if ("child" in node && node.child) {
      if (dfs(node.child)) return true;
    }
    path.pop();
    return false;
  };

  return dfs(root) ? path : [];
}

function collectFieldConflictNodeIds(root: UiExpressionNode | null): Set<string> {
  const result = new Set<string>();
  if (!root) return result;

  const walk = (node: UiExpressionNode) => {
    if (node.type === "LOGIC" || node.type === "PROXIMITY") {
      const fieldChildren = node.children.filter(
        (child): child is Extract<UiExpressionNode, { type: "FIELD" }> => child.type === "FIELD"
      );
      const fields = Array.from(new Set(fieldChildren.map((item) => item.field)));
      if (fields.length > 1) {
        fieldChildren.forEach((child) => result.add(child.id));
        result.add(node.id);
      }
      node.children.forEach((child) => walk(child));
      return;
    }
    if ("children" in node && Array.isArray(node.children)) {
      node.children.forEach((child) => walk(child));
    }
    if ("child" in node && node.child) {
      walk(node.child);
    }
  };

  walk(root);
  return result;
}

function buildNodeErrorById(issues: Array<{ nodeId: string; message: string; severity: "error" | "warning" }>): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  issues.forEach((issue) => {
    if (issue.severity !== "error") return;
    if (!result[issue.nodeId]) {
      result[issue.nodeId] = [issue.message];
      return;
    }
    if (!result[issue.nodeId].includes(issue.message)) {
      result[issue.nodeId].push(issue.message);
    }
  });
  return result;
}

function buildDebugStateByNodeId(
  activeTabId: string,
  activeNodeId: string | undefined,
  impactRuntimeResult: Extract<RuntimeExecuteResponse, { mode: "IMPACT" }> | null,
  impactRanking: ConditionImpactItem[]
): Record<string, "NODE_ACTIVE" | "IMPACT_HIGH" | "IMPACT_MEDIUM"> {
  const map: Record<string, "NODE_ACTIVE" | "IMPACT_HIGH" | "IMPACT_MEDIUM"> = {};
  if (activeTabId === "FULL") {
    return map;
  }
  if (activeTabId.startsWith("NODE:")) {
    const nodeId = activeTabId.replace("NODE:", "") || activeNodeId;
    if (nodeId) {
      map[nodeId] = "NODE_ACTIVE";
    }
    return map;
  }
  if (activeTabId !== "IMPACT") {
    return map;
  }

  if (impactRuntimeResult) {
    impactRuntimeResult.analysis.forEach((item) => {
      if (item.impactLevel === "HIGH") map[item.nodeId] = "IMPACT_HIGH";
      if (item.impactLevel === "MEDIUM") map[item.nodeId] = "IMPACT_MEDIUM";
    });
    return map;
  }

  impactRanking.forEach((item) => {
    if (item.contributionRate >= 0.5) map[item.nodeId] = "IMPACT_HIGH";
    else if (item.contributionRate >= 0.1) map[item.nodeId] = "IMPACT_MEDIUM";
  });
  return map;
}

function collectStructureHints(root: UiExpressionNode | null): string[] {
  if (!root) return [];
  const hints: string[] = [];
  const normalized = normalizeExpressionTree(root);
  if (normalized.issues.length > 0) return hints;

  const touchedFields = new Set<RuleField>();
  walkForFieldHoist(root, touchedFields);
  touchedFields.forEach((field) => {
    hints.push(t("ruleEditor.structure.hint.unifiedScope", { scope: fieldToScopeLabel(field) }));
  });

  if (JSON.stringify(root) !== JSON.stringify(normalized.root) && hints.length === 0) {
    hints.push(t("ruleEditor.structure.hint.reordered"));
  }
  return hints.slice(0, 2);
}

function walkForFieldHoist(node: UiExpressionNode, result: Set<RuleField>) {
  if (node.type === "LOGIC" || node.type === "PROXIMITY") {
    const children = node.children;
    if (children.length >= 2 && children.every((child) => child.type === "FIELD")) {
      const fields = children.map((child) => (child as Extract<UiExpressionNode, { type: "FIELD" }>).field);
      const unique = Array.from(new Set(fields));
      if (unique.length === 1) {
        result.add(unique[0]);
      }
    }
    children.forEach((child) => walkForFieldHoist(child, result));
    return;
  }
  if (node.type === "FIELD" || node.type === "STRUCTURE" || node.type === "NOT" || node.type === "SCORE") {
    if (node.child) walkForFieldHoist(node.child, result);
    return;
  }
  if (node.type === "POSITION_RELATION") {
    node.children.forEach((child) => walkForFieldHoist(child, result));
  }
}

function fieldToScopeLabel(field: RuleField): string {
  if (field === "TITLE") return t("ruleEditor.tree.node.fieldOnly.title");
  if (field === "COLUMN") return t("ruleEditor.tree.node.fieldOnly.column");
  return t("ruleEditor.tree.node.fieldOnly.content");
}

function containsNode(node: UiExpressionNode, targetId: string): boolean {
  if (node.id === targetId) return true;
  if ("children" in node && Array.isArray(node.children)) {
    return node.children.some((child) => containsNode(child, targetId));
  }
  if ("child" in node && node.child) {
    return containsNode(node.child, targetId);
  }
  return false;
}

function normalizeLogsumThresholds(node: UiExpressionNode): UiExpressionNode {
  if (node.type === "LOGIC") {
    const nextChildren = node.children.map((child) => normalizeLogsumThresholds(child));
    if (node.operator === "LOGSUM") {
      const max = Math.max(1, nextChildren.length);
      const current = Math.round(Number(node.threshold ?? max));
      const nextThreshold = !Number.isFinite(current) ? 1 : Math.min(Math.max(current, 1), max);
      return { ...node, threshold: nextThreshold, children: nextChildren };
    }
    return { ...node, children: nextChildren };
  }
  if (node.type === "POSITION_RELATION") {
    return {
      ...node,
      children: node.children
        .map((child) => normalizeLogsumThresholds(child))
        .filter((child): child is Extract<UiExpressionNode, { type: "TERM_SET" }> => child.type === "TERM_SET"),
    };
  }
  if (node.type === "PROXIMITY") {
    return { ...node, children: node.children.map((child) => normalizeLogsumThresholds(child)) };
  }
  if ("child" in node) {
    return { ...node, child: node.child ? normalizeLogsumThresholds(node.child) : null };
  }
  return node;
}

function ensureExpressionRoot(node: UiExpressionNode): Extract<UiExpressionNode, { type: "LOGIC" }> {
  if (node.type === "LOGIC") return node;
  const root = createNode("LOGIC");
  if (root.type !== "LOGIC") {
    throw new Error("Failed to create root LOGIC node.");
  }
  return {
    ...root,
    operator: "AND",
    children: [node],
  };
}

function buildVersionEntry(
  action: RuleVersionEntry["action"],
  seq: number,
  added: number,
  removed: number,
  changed: number,
  riskLevel: string,
  complexityScore: number,
  abSummary?: RuleVersionEntry["abSummary"]
): RuleVersionEntry {
  return {
    id: `v-${Date.now()}-${seq}`,
    version: `v${seq}.0`,
    action,
    at: new Date().toLocaleString(),
    added,
    removed,
    changed,
    riskLevel,
    complexityScore,
    abSummary,
  };
}

function buildDraftBFromCandidate(
  root: UiExpressionNode,
  candidate: GeneratedRuleCandidate
): UiExpressionNode | null {
  if (candidate.action.type === "REMOVE_LOW_IMPACT") {
    const next = removeNode(root, candidate.action.nodeId);
    return next ? ensureExpressionRoot(normalizeLogsumThresholds(next)) : null;
  }
  if (candidate.action.type === "APPLY_PROXIMITY_HINT") {
    const suggestion = detectProximitySuggestion(root);
    if (!suggestion) return null;
    const next = updateNode(root, suggestion.logicNodeId, (node) => {
      if (node.type !== "LOGIC") return node;
      const termIds = suggestion.termNodeIds;
      const selectedIndexes = node.children
        .map((child, index) => (termIds.includes(child.id) ? index : -1))
        .filter((index) => index >= 0);
      if (selectedIndexes.length < 2) return node;
      const selectedTerms = selectedIndexes
        .map((index) => node.children[index])
        .filter((child): child is Extract<UiExpressionNode, { type: "TERM_SET" }> => child.type === "TERM_SET");
      if (selectedTerms.length < 2) return node;
      const firstIndex = Math.min(...selectedIndexes);
      const selectedSet = new Set(selectedTerms.map((item) => item.id));
      const remain = node.children.filter((child) => !selectedSet.has(child.id));
      const insertAt = Math.min(firstIndex, remain.length);
      const relationNode = createPositionRelationNode("PROXIMITY");
      return {
        ...node,
        children: [
          ...remain.slice(0, insertAt),
          {
            ...relationNode,
            mode: "PROXIMITY",
            relation: "NEAR",
            ordered: false,
            distance: 5,
            children: selectedTerms,
          },
          ...remain.slice(insertAt),
        ],
      };
    });
    return ensureExpressionRoot(normalizeLogsumThresholds(next));
  }
  return ensureExpressionRoot(normalizeLogsumThresholds(formatExpressionTree(root) ?? root));
}

