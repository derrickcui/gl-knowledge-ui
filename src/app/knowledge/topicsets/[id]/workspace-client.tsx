"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { fetchGovernanceTopicDocs } from "@/lib/governance-topic-detail-api";
import { fetchCoverageTopics } from "@/lib/governance-coverage-api";
import { fetchTopicDraft, previewTopicRule } from "@/lib/topic-api";
import { readDefaultRuntimeSceneSelection } from "@/lib/runtime-default-scene";
import { fetchRuntimeEnvironmentById, RuntimeEnvironment } from "@/lib/runtime-api";
import {
  fetchTopicSetCoverage,
  fetchTopicSetDriftCoverage,
  fetchTopicSetDriftKeywords,
  fetchTopicSetDriftOverlap,
  fetchTopicSetDriftSummary,
  fetchTopicSetDriftUnmapped,
  fetchTopicSetGovernanceDashboard,
  TopicSetDocumentPageResponse,
  fetchTopicSetNodeDistribution,
  fetchTopicSetNodeImpact,
  fetchTopicSetOverlapDashboard,
  fetchTopicSetOverlapDocExplain,
  fetchTopicSetOverlapDocs,
  fetchTopicSetSearchEnvelopeByPath,
  fetchTopicSetUnmappedDashboard,
  fetchTopicSetUnmapped,
  refreshTopicSetRuntimeCache,
} from "@/lib/topicset-search-api";
import {
  approveTopicSet,
  archiveTopicSet,
  getTopicSetDriftDashboard,
  getTopicSetDriftHealth,
  getTopicSetDriftHistory,
  runTopicSetDriftAnalyze,
  listTopicSetNodeTopics,
  createTopicSetVersion,
  deprecateTopicSet,
  NodeTopicView,
  TopicSetNode,
  TopicSetNodeDetail,
  TopicSetValidationDetails,
  getTopicSetDiff,
  getTopicSetNodeDetail,
  rejectTopicSet,
  restoreTopicSetVersionAsDraft,
  rollbackTopicSetVersion,
  submitTopicSetReview,
} from "@/lib/topicset-api";
import {
  simulateTopicSetCoverage,
  simulateTopicSetDashboard,
  TopicSetSimulateImpactResponse,
  simulateTopicSetImpact,
  simulateTopicSetOverlap,
  TopicSetSimulateOverlapDocsResponse,
  simulateTopicSetOverlapDocs,
  simulateTopicSetOverlapExplain,
  simulateTopicSetUnmapped,
  TopicSetDraftPayload,
} from "@/lib/topicset-simulation-api";
import { useTopicSetStore } from "@/store/topicsetStore";
import { t } from "@/i18n";
import { NodeDetailPanel } from "../components/node-detail-panel";
import { PublishDialog } from "../components/publish-dialog";
import { TaxonomyTree } from "../components/taxonomy-tree";
import { TopicBindingPanel } from "../components/topic-binding-panel";
import { LifecycleValidationPanel } from "../components/lifecycle-validation-panel";
import { WorkspaceHeader } from "./components/workspace-header";
import { TopicSetWorkspaceTab, WorkspaceTabs } from "./components/workspace-tabs";
import { AIGenerateStructureModal } from "./components/ai/ai-generate-structure-modal";
import { AIInsightPanel } from "./components/ai/ai-insight-panel";
import { DriftWorkspace } from "./components/drift/drift-workspace";
import { ImpactPage } from "./components/impact/impact-page";
import { CoveragePage } from "./components/coverage/coverage-page";
import { UnmappedPage } from "./components/unmapped/unmapped-page";
import { VersionsPage } from "./components/versions/versions-page";
import { TaxonomyDiffPage } from "./components/diff/taxonomy-diff-page";
import { KnowledgeMapPage } from "./components/map/knowledge-map-page";
import { searchDocuments } from "@/lib/search-api";
import { sanitizeHighlightHtml } from "@/lib/highlight-html";
import { createTopicSetTaggingJob } from "@/lib/tagging-api";
import {
  assignTopicSetTopicsWithAi,
  getTopicSetAiAnalysis,
  optimizeTopicSetWithAi,
  suggestTopicSetStructureWithAi,
  TopicSetAIBindTopicsPayload,
  TopicSetAIAnalysisResponse,
  TopicSetAIMergeNodesPayload,
  TopicSetAIMoveNodePayload,
  TopicSetAIOptimizeResponse,
  TopicSetAIReviewEmptyNodesPayload,
  TopicSetAIRenameNodePayload,
  TopicSetAISplitNodePayload,
  TopicSetAIStructureNodeView,
  TopicSetAITopicInput,
  TopicSetAISuggestion,
  TopicSetAISuggestionPayload,
} from "@/lib/topicset-ai-api";

type FeedbackState = {
  type: "error" | "success" | "info";
  title: string;
  message?: string;
} | null;

const VERSION_CONFLICT_STATUS = 409;
const LOW_COVERAGE_THRESHOLD = 3;
const governanceTopicDocCountPromiseCache = new Map<string, Promise<number>>();
const governanceTopicDocCountValueCache = new Map<string, number>();

function isDescendant(
  childrenByParent: Record<string, string[]>,
  sourceNodeId: string,
  targetNodeId: string
): boolean {
  const stack = [...(childrenByParent[sourceNodeId] ?? [])];
  while (stack.length > 0) {
    const current = stack.shift();
    if (!current) continue;
    if (current === targetNodeId) return true;
    stack.unshift(...(childrenByParent[current] ?? []));
  }
  return false;
}

type ContextMenuState = {
  nodeId: string;
  x: number;
  y: number;
} | null;

type DeleteDialogState = {
  nodeId: string;
  nodeName: string;
  hasChildren: boolean;
} | null;

type VersionActionDialogState = {
  mode: "restore" | "rollback";
  version: number;
} | null;

type LifecycleStatus = "DRAFT" | "REVIEW" | "APPROVED" | "PUBLISHED" | "DEPRECATED" | "ARCHIVED";

type SubmitReviewDialogState = {
  open: boolean;
  comment: string;
  loading?: boolean;
  errorMessage?: string | null;
  validationDetails?: TopicSetValidationDetails | null;
} | null;

function OverlapExplainCard({
  title,
  item,
}: {
  title: string;
  item: {
    topicId: string;
    topicName: string;
    matched: boolean;
    matchedNodeIds: string[];
    matchedTerms: string[];
    appliedModes?: string[];
    reason?: string | null;
    explain?: Array<{ nodeId?: string | null; label?: string | null; matched: boolean }>;
  };
}) {
  return (
    <section className="rounded-lg border bg-slate-50/60 p-4 text-sm">
      <div className="font-semibold">{title}</div>
      <div className="mt-2 text-xs text-muted-foreground">{item.topicName || item.topicId}</div>
      <div className="mt-3 grid gap-3">
        <div>
          <div className="text-[11px] text-muted-foreground">{t("topicSet.docs.explainMatched")}</div>
          <div className="mt-1">{item.matched ? t("common.yes") : t("common.no")}</div>
        </div>
        <div>
          <div className="text-[11px] text-muted-foreground">{t("topicSet.docs.explainTerms")}</div>
          <div className="mt-1 text-xs">{item.matchedTerms.length ? item.matchedTerms.join(", ") : "-"}</div>
        </div>
        <div>
          <div className="text-[11px] text-muted-foreground">{t("topicSet.docs.explainNodes")}</div>
          <div className="mt-1 text-xs">{item.matchedNodeIds.length ? item.matchedNodeIds.join(", ") : "-"}</div>
        </div>
        <div>
          <div className="text-[11px] text-muted-foreground">{t("topicSet.docs.explainModes")}</div>
          <div className="mt-1 text-xs">{item.appliedModes?.length ? item.appliedModes.join(", ") : "-"}</div>
        </div>
        <div>
          <div className="text-[11px] text-muted-foreground">{t("topicSet.docs.explainReason")}</div>
          <div className="mt-1 text-xs">{item.reason || "-"}</div>
        </div>
        <div>
          <div className="text-[11px] text-muted-foreground">{t("topicSet.docs.explainDetail")}</div>
          <div className="mt-1 space-y-1">
            {item.explain?.length ? (
              item.explain.map((node, index) => (
                <div key={`${node.nodeId ?? "node"}-${index}`} className="rounded border bg-white px-2 py-1 text-xs">
                  {(node.label || node.nodeId || "-")} · {node.matched ? t("common.yes") : t("common.no")}
                </div>
              ))
            ) : (
              <div className="text-xs text-muted-foreground">-</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function normalizeLifecycleStatus(value?: string | null): LifecycleStatus {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized.includes("REVIEW")) return "REVIEW";
  if (normalized.includes("APPROVED")) return "APPROVED";
  if (normalized.includes("DEPRECATED")) return "DEPRECATED";
  if (normalized.includes("ARCHIVED")) return "ARCHIVED";
  if (normalized.includes("PUBLISHED")) return "PUBLISHED";
  return "DRAFT";
}

function isPublishedLifecycleStatus(status: LifecycleStatus) {
  return status === "PUBLISHED" || status === "DEPRECATED" || status === "ARCHIVED";
}

function getImpactDocuments(
  data: TopicSetDocumentPageResponse | TopicSetSimulateImpactResponse
) {
  return "items" in data ? data.items ?? [] : data.documents ?? [];
}

function getOverlapDocuments(
  data: TopicSetDocumentPageResponse | TopicSetSimulateOverlapDocsResponse
) {
  return "items" in data ? data.items ?? [] : data.documents ?? [];
}

function getDocumentId(item: { docId?: string | null } | { docId: string }) {
  if ("docId" in item && item.docId) return item.docId;
  if ("id" in item && typeof item.id === "string" && item.id) return item.id;
  return "";
}

function getDocumentTitle(item: { title?: string | null; docId?: string | null } | { title?: string | null; docId: string }) {
  return item.title ?? getDocumentId(item);
}

function buildFieldMappingMap(environment?: RuntimeEnvironment | null) {
  const map: Record<string, string> = {};
  for (const row of environment?.fieldMappings ?? []) {
    const logicalField = String(row.logicalField ?? "").trim().toUpperCase();
    const physicalField = String(row.physicalField ?? "").trim();
    if (!logicalField || !physicalField) continue;
    map[logicalField] = physicalField;
  }
  return map;
}

function applyRuntimeFieldMappings(gql: string, environment?: RuntimeEnvironment | null) {
  const fieldMappings = buildFieldMappingMap(environment);
  let next = gql;
  for (const [logicalField, physicalField] of Object.entries(fieldMappings)) {
    next = next.replaceAll(`/${logicalField}>`, `/${physicalField}>`);
  }
  return next;
}

function getSimulationRuntimeMissingMessage() {
  return t("topicSet.simulation.runtimeRequiredMessage");
}

function getSimulationDraftUnavailableMessage() {
  return "No valid compiled topics available for simulation.";
}

function getSimulationNodeUnavailableMessage() {
  return "Selected node has no valid compiled topics for simulation.";
}

async function loadGovernanceTopicDocCount(topicId: string, runtimeRefreshTick: number) {
  const cacheKey = `${runtimeRefreshTick}:${topicId}`;
  if (governanceTopicDocCountValueCache.has(cacheKey)) {
    return governanceTopicDocCountValueCache.get(cacheKey) ?? 0;
  }
  if (governanceTopicDocCountPromiseCache.has(cacheKey)) {
    return governanceTopicDocCountPromiseCache.get(cacheKey) as Promise<number>;
  }

  const promise = (async () => {
    const result = await fetchGovernanceTopicDocs(topicId, {
      matchMode: "REALTIME",
      page: 0,
      size: 1,
      sortBy: "WEIGHT",
      sortOrder: "DESC",
    });
    const total = Number(result.data?.total ?? 0);
    governanceTopicDocCountValueCache.set(cacheKey, total);
    return total;
  })();

  governanceTopicDocCountPromiseCache.set(cacheKey, promise);
  try {
    return await promise;
  } finally {
    governanceTopicDocCountPromiseCache.delete(cacheKey);
  }
}

function estimateTopicMatchScore(nodeName: string, topicName: string) {
  const normalizedNode = nodeName.trim().toLowerCase();
  const normalizedTopic = topicName.trim().toLowerCase();
  if (!normalizedNode || !normalizedTopic) return 70;
  if (normalizedNode === normalizedTopic) return 98;
  if (normalizedTopic.includes(normalizedNode)) return 92;
  if (normalizedNode.includes(normalizedTopic)) return 88;

  const nodeChars = new Set(normalizedNode.split(""));
  const topicChars = new Set(normalizedTopic.split(""));
  let overlap = 0;
  for (const char of nodeChars) {
    if (topicChars.has(char)) overlap += 1;
  }
  const ratio = overlap / Math.max(1, nodeChars.size);
  return Math.max(72, Math.min(95, Math.round(72 + ratio * 23)));
}

function uniqueStrings(items: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      items
        .map((item) => String(item ?? "").trim())
        .filter(Boolean)
    )
  );
}

function extractSuggestionLabel(payload: TopicSetAISuggestionPayload | undefined) {
  if (!payload) return "";
  const candidates = [
    "name" in payload ? payload.name : undefined,
    "title" in payload ? payload.title : undefined,
    "label" in payload ? payload.label : undefined,
    "nodeName" in payload ? payload.nodeName : undefined,
    "topicName" in payload ? payload.topicName : undefined,
    "targetNodeName" in payload ? payload.targetNodeName : undefined,
    "target" in payload ? payload.target : undefined,
  ];
  for (const candidate of candidates) {
    const value = String(candidate ?? "").trim();
    if (value) return value;
  }
  return "";
}

function hasAction<TAction extends string>(
  payload: TopicSetAISuggestionPayload,
  action: TAction
): payload is TopicSetAISuggestionPayload & { action: TAction } {
  return String(payload.action ?? "").trim().toUpperCase() === action;
}

const MAX_TAXONOMY_DEPTH = 6;

export function TopicSetWorkspaceClient({
  initialTopicSetId,
}: {
  initialTopicSetId: string;
}) {
  const router = useRouter();
  const {
    topicSetId,
    topicSetDetail,
    nodes,
    nodeMap,
    childrenByParent,
    rootNodeIds,
    selectedNode,
    topics,
    topicsLoaded,
    version,
    versions,
    setTopicSet,
    setVersion,
    selectNode,
    createNode,
    renameNode,
    deleteNode,
    moveNode,
    loadChildren,
    loadNodeTopics,
    bindTopic,
    unbindTopic,
    publish,
    refreshTopicSetMeta,
    searchTopic,
    findNodeById,
    topicSetEtag,
  } = useTopicSetStore();

  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [activeTab, setActiveTab] = useState<TopicSetWorkspaceTab>("taxonomy");
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [publishErrorMessage, setPublishErrorMessage] = useState<string | null>(null);
  const [publishValidationDetails, setPublishValidationDetails] = useState<TopicSetValidationDetails | null>(null);
  const [publishDiffLoading, setPublishDiffLoading] = useState(false);
  const [publishDiffSummary, setPublishDiffSummary] = useState<{
    nodesAdded: number;
    nodesRemoved: number;
    nodesMoved: number;
    nodesUpdated: number;
    topicBindingsChanged: number;
  } | null>(null);
  const [nodeSaving, setNodeSaving] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null | undefined>(undefined);
  const [createName, setCreateName] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [renamingNodeId, setRenamingNodeId] = useState<string | null>(null);
  const [renamingName, setRenamingName] = useState("");
  const [renamingLoading, setRenamingLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveSourceNodeId, setMoveSourceNodeId] = useState<string | null>(null);
  const [moveParentId, setMoveParentId] = useState<string | null>(null);
  const [moveLoading, setMoveLoading] = useState(false);
  const [versionActionDialog, setVersionActionDialog] = useState<VersionActionDialogState>(null);
  const [versionActionComment, setVersionActionComment] = useState("");
  const [versionActionLoading, setVersionActionLoading] = useState(false);
  const [submitReviewDialog, setSubmitReviewDialog] = useState<SubmitReviewDialogState>(null);
  const [taggingLoading, setTaggingLoading] = useState(false);
  const [aiStructureOpen, setAiStructureOpen] = useState(false);
  const [aiStructureApplying, setAiStructureApplying] = useState(false);
  const [aiStructureLoading, setAiStructureLoading] = useState(false);
  const [aiInsightExpanded, setAiInsightExpanded] = useState(true);
  const [aiStructureDimensions, setAiStructureDimensions] = useState<TopicSetAIStructureNodeView[]>([]);
  const [aiBindingSuggestions, setAiBindingSuggestions] = useState<
    Array<{ topicId: string; topicName: string; score: number }>
  >([]);
  const [aiOptimizeResult, setAiOptimizeResult] = useState<TopicSetAIOptimizeResponse | null>(null);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<TopicSetAIAnalysisResponse | null>(null);

  const [coverageRows, setCoverageRows] = useState<Array<{ nodeId?: string; name: string; hitDocs: number; topics?: number }>>([]);
  const [coverageDashboard, setCoverageDashboard] = useState<{
    totalDocs: number;
    classifiedDocs: number;
    unmappedDocs: number;
    nodes: number;
    topics: number;
  } | null>(null);
  const [coverageDedup, setCoverageDedup] = useState(false);
  const [lowCoverageRows, setLowCoverageRows] = useState<
    Array<{ nodeId: string; name: string; hitDocs: number; topicCount: number }>
  >([]);
  const [overlapRows, setOverlapRows] = useState<
    Array<{
      topicAId: string;
      topicAName?: string | null;
      topicBId: string;
      topicBName?: string | null;
      overlapDocs: number;
      docsPath?: string | null;
      explainPathTemplate?: string | null;
    }>
  >([]);
  const [unmappedTotal, setUnmappedTotal] = useState(0);
  const [unmappedDocs, setUnmappedDocs] = useState<Array<{ docId: string; title?: string | null }>>([]);
  const [unmappedDashboard, setUnmappedDashboard] = useState<{
    totalDocs: number;
    classifiedDocs: number;
    unmappedDocs: number;
    sampleDocuments: Array<{ docId: string; title?: string | null }>;
  } | null>(null);
  const [unmappedPage, setUnmappedPage] = useState(0);
  const [unmappedSize, setUnmappedSize] = useState(20);
  const [unmappedSort, setUnmappedSort] = useState<"score" | "updatedAt" | "publishedAt">("score");
  const [driftHealth, setDriftHealth] = useState<{
    score?: number | null;
    trend?: "UP" | "DOWN" | "FLAT" | null;
    snapshotDate?: string | null;
  } | null>(null);
  const [driftHistory, setDriftHistory] = useState<
    Array<{
      snapshotDate: string;
      coverageRatio: number;
      unmappedDocs: number;
      overlapDocCount: number;
      healthScore: number;
    }>
  >([]);
  const [driftSummary, setDriftSummary] = useState<{
    totalDocs?: number;
    classifiedDocs: number;
    unmappedDocs: number;
    coverageRatio: number;
    overlapCount: number;
  } | null>(null);
  const [driftDashboard, setDriftDashboard] = useState<{
    healthScore?: number | null;
    coverageDrift: number;
    overlapDrift: number;
    unmappedIncrease: number;
    lastAnalysis?: string | null;
  } | null>(null);
  const [driftCoverageRows, setDriftCoverageRows] = useState<
    Array<{
      topicId?: string | null;
      topicName?: string | null;
      currentDocs: number;
      previousDocs: number;
      changeRate?: number | null;
    }>
  >([]);
  const [driftOverlapRows, setDriftOverlapRows] = useState<
    Array<{
      topicAId: string;
      topicAName?: string | null;
      topicBId: string;
      topicBName?: string | null;
      overlapDocs: number;
    }>
  >([]);
  const [driftKeywords, setDriftKeywords] = useState<
    Array<{ term: string; frequency: number; score?: number | null }>
  >([]);
  const [driftUnmappedTotal, setDriftUnmappedTotal] = useState(0);
  const [driftAnalyzing, setDriftAnalyzing] = useState(false);
  const [driftRefreshTick, setDriftRefreshTick] = useState(0);

  const [impactDocsLoading, setImpactDocsLoading] = useState(false);
  const [impactDocsError, setImpactDocsError] = useState<string | null>(null);
  const [impactDocs, setImpactDocs] = useState<Array<{ docId: string; title: string; summary?: string | null }>>([]);
  const [impactPage, setImpactPage] = useState(0);
  const [impactSize, setImpactSize] = useState(20);
  const [impactSort, setImpactSort] = useState<"score" | "updatedAt" | "publishedAt">("score");
  const [impactTotal, setImpactTotal] = useState(0);
  const [topicHitDocsMap, setTopicHitDocsMap] = useState<Record<string, number>>({});
  const [nodeDistributionCache, setNodeDistributionCache] = useState<
    Record<string, Array<{ topicId: string; topicName: string; hitDocs: number }>>
  >({});
  const [nodeDistributionLoadingByNode, setNodeDistributionLoadingByNode] = useState<Record<string, boolean>>({});
  const [nodeDistributionErrorByNode, setNodeDistributionErrorByNode] = useState<Record<string, string | null>>({});
  const [topicDocCountMap, setTopicDocCountMap] = useState<Record<string, number>>({});
  const [topicDocsOpen, setTopicDocsOpen] = useState(false);
  const [topicDocsLoading, setTopicDocsLoading] = useState(false);
  const [topicDocsError, setTopicDocsError] = useState<string | null>(null);
  const [topicDocsTitle, setTopicDocsTitle] = useState("");
  const [topicDocsTotal, setTopicDocsTotal] = useState(0);
  const [topicDocsContext, setTopicDocsContext] = useState<
    | { kind: "topic"; topicId: string }
    | { kind: "overlap"; topicAId: string; topicAName?: string | null; topicBId: string; topicBName?: string | null }
    | { kind: "search"; query: string; mode: "coverage" | "overlap" | "keyword" | "unmapped" }
    | null
  >(null);
  const [topicDocsRows, setTopicDocsRows] = useState<
    Array<{ docId: string; title: string; secondary?: string | null; metric?: string | null }>
  >([]);
  const [overlapExplainOpen, setOverlapExplainOpen] = useState(false);
  const [overlapExplainLoading, setOverlapExplainLoading] = useState(false);
  const [overlapExplainError, setOverlapExplainError] = useState<string | null>(null);
  const [overlapExplainData, setOverlapExplainData] = useState<{
    docId: string;
    topicA: {
      topicId: string;
      topicName: string;
      matched: boolean;
      matchedNodeIds: string[];
      matchedTerms: string[];
      appliedModes?: string[];
      reason?: string | null;
      explain?: Array<{ nodeId?: string | null; label?: string | null; matched: boolean }>;
    };
    topicB: {
      topicId: string;
      topicName: string;
      matched: boolean;
      matchedNodeIds: string[];
      matchedTerms: string[];
      appliedModes?: string[];
      reason?: string | null;
      explain?: Array<{ nodeId?: string | null; label?: string | null; matched: boolean }>;
    };
  } | null>(null);
  const [impactDrawerOpen, setImpactDrawerOpen] = useState(false);
  const [impactDrawerNodeId, setImpactDrawerNodeId] = useState<string | null>(null);
  const [impactDrawerDocsLoading, setImpactDrawerDocsLoading] = useState(false);
  const [impactDrawerDocsError, setImpactDrawerDocsError] = useState<string | null>(null);
  const [impactDrawerDocs, setImpactDrawerDocs] = useState<Array<{ docId: string; title: string; weight: number }>>([]);
  const [impactDrawerDocsCache, setImpactDrawerDocsCache] = useState<
    Record<string, Array<{ docId: string; title: string; weight: number }>>
  >({});
  const [impactRuntimeRefreshing, setImpactRuntimeRefreshing] = useState(false);
  const [runtimeRefreshTick, setRuntimeRefreshTick] = useState(0);
  const [nodeDetail, setNodeDetail] = useState<TopicSetNodeDetail | null>(null);
  const [nodeDetailLoading, setNodeDetailLoading] = useState(false);
  const [diffFromVersion, setDiffFromVersion] = useState<number | null>(null);
  const [diffToVersion, setDiffToVersion] = useState<number | null>(null);
  const [headerDiffSummary, setHeaderDiffSummary] = useState<{
    nodesAdded: number;
    nodesRemoved: number;
    nodesMoved: number;
    nodesUpdated: number;
    topicBindingsChanged: number;
  } | null>(null);
  const [baselineDiff, setBaselineDiff] = useState<Awaited<ReturnType<typeof getTopicSetDiff>>["data"] | null>(null);
  const [simulationRuntimeEnvironment, setSimulationRuntimeEnvironment] = useState<RuntimeEnvironment | null>(null);
  const [simulationRuntimeLoading, setSimulationRuntimeLoading] = useState(true);
  const [simulationTopicsPriming, setSimulationTopicsPriming] = useState(false);
  const compiledTopicGqlCacheRef = useRef<Record<string, string>>({});
  const simulationDraftCacheRef = useRef<{
    key: string;
    draft: TopicSetDraftPayload;
  } | null>(null);
  const simulationDraftPromiseRef = useRef<{
    key: string;
    promise: Promise<TopicSetDraftPayload | null>;
  } | null>(null);
  const simulationCoverageBundleCacheRef = useRef<{
    key: string;
    data: {
      coverageResult: Awaited<ReturnType<typeof simulateTopicSetCoverage>>;
      dashboardResult: Awaited<ReturnType<typeof simulateTopicSetDashboard>>;
      overlapResult: Awaited<ReturnType<typeof simulateTopicSetOverlap>>;
    };
  } | null>(null);
  const simulationCoverageBundlePromiseRef = useRef<{
    key: string;
    promise: Promise<{
      coverageResult: Awaited<ReturnType<typeof simulateTopicSetCoverage>>;
      dashboardResult: Awaited<ReturnType<typeof simulateTopicSetDashboard>>;
      overlapResult: Awaited<ReturnType<typeof simulateTopicSetOverlap>>;
    }>;
  } | null>(null);

  const refreshNodeDetail = useCallback(
    async (nodeId?: string | null) => {
      const targetNodeId = nodeId ?? selectedNode;
      if (!topicSetId || !targetNodeId) {
        setNodeDetail(null);
        return;
      }
      setNodeDetailLoading(true);
      const result = await getTopicSetNodeDetail({
        topicSetId,
        nodeId: targetNodeId,
        version,
        includeStats: true,
      });
      setNodeDetailLoading(false);
      if (!result.data) {
        setNodeDetail(null);
        return;
      }
      setNodeDetail(result.data);
    },
    [selectedNode, topicSetId, version]
  );

  useEffect(() => {
    setTopicSet(initialTopicSetId);
  }, [initialTopicSetId, setTopicSet]);

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, []);

  const latestPublishedVersion = useMemo(() => {
    return versions
      .filter((item) => {
        const status = normalizeLifecycleStatus(item.status);
        return status === "PUBLISHED" || status === "DEPRECATED" || status === "ARCHIVED";
      })
      .map((item) => item.version)
      .sort((a, b) => b - a)[0] ?? null;
  }, [versions]);

  const currentWorkspaceVersion = topicSetDetail?.version ?? null;
  const viewedVersion = version ?? currentWorkspaceVersion;
  const versionStatusMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const item of versions) {
      map.set(item.version, item.status);
    }
    return map;
  }, [versions]);
  const lifecycleStatus = useMemo<LifecycleStatus>(() => {
    if (viewedVersion != null && versionStatusMap.has(viewedVersion)) {
      return normalizeLifecycleStatus(versionStatusMap.get(viewedVersion));
    }
    return normalizeLifecycleStatus(topicSetDetail?.status);
  }, [topicSetDetail?.status, versionStatusMap, viewedVersion]);
  const usePublishedGovernanceApis = isPublishedLifecycleStatus(lifecycleStatus);
  const simulationRuntimeReady = Boolean(
    simulationRuntimeEnvironment?.id && simulationRuntimeEnvironment?.datasetName
  );
  const showSimulationRuntimeWarning =
    !usePublishedGovernanceApis && !simulationRuntimeLoading && !simulationRuntimeReady;

  useEffect(() => {
    let cancelled = false;
    async function loadHeaderDiff() {
      if (!topicSetId || !topicSetDetail?.version || !latestPublishedVersion) {
        setHeaderDiffSummary(null);
        setBaselineDiff(null);
        return;
      }
      const result = await getTopicSetDiff({
        topicSetId,
        fromVersion: latestPublishedVersion,
        toVersion: topicSetDetail.version,
      });
      if (cancelled) return;
      setHeaderDiffSummary(result.data?.summary ?? null);
      setBaselineDiff(result.data ?? null);
    }
    void loadHeaderDiff();
    return () => {
      cancelled = true;
    };
  }, [latestPublishedVersion, topicSetDetail?.version, topicSetId]);

  useEffect(() => {
    compiledTopicGqlCacheRef.current = {};
    simulationDraftCacheRef.current = null;
    simulationDraftPromiseRef.current = null;
    simulationCoverageBundleCacheRef.current = null;
    simulationCoverageBundlePromiseRef.current = null;
  }, [runtimeRefreshTick, simulationRuntimeEnvironment?.id, topicSetId, viewedVersion]);

  useEffect(() => {
    let cancelled = false;
    async function loadSimulationRuntimeEnvironment() {
      setSimulationRuntimeLoading(true);
      const selection = readDefaultRuntimeSceneSelection();
      if (!selection?.id) {
        setSimulationRuntimeEnvironment(null);
        setSimulationRuntimeLoading(false);
        return;
      }
      const result = await fetchRuntimeEnvironmentById(selection.id);
      if (cancelled) return;
      setSimulationRuntimeEnvironment(result.data ?? null);
      setSimulationRuntimeLoading(false);
    }
    void loadSimulationRuntimeEnvironment();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadPublishDiff() {
      if (!publishOpen || !topicSetId || !topicSetDetail?.version) {
        setPublishDiffSummary(null);
        return;
      }
      const publishedVersions = versions
        .filter((item) => {
          const status = normalizeLifecycleStatus(item.status);
          return status === "PUBLISHED" || status === "DEPRECATED" || status === "ARCHIVED";
        })
        .map((item) => item.version)
        .sort((a, b) => b - a);
      const baselineVersion = publishedVersions[0];
      if (!baselineVersion) {
        setPublishDiffSummary(null);
        return;
      }
      setPublishDiffLoading(true);
      const result = await getTopicSetDiff({
        topicSetId,
        fromVersion: baselineVersion,
        toVersion: topicSetDetail.version,
      });
      if (cancelled) return;
      setPublishDiffLoading(false);
      setPublishDiffSummary(result.data?.summary ?? null);
    }
    void loadPublishDiff();
    return () => {
      cancelled = true;
    };
  }, [publishOpen, topicSetDetail?.version, topicSetId, versions]);

  useEffect(() => {
    if (!selectedNode) return;
    void loadNodeTopics(selectedNode);
  }, [selectedNode, loadNodeTopics]);

  useEffect(() => {
    let cancelled = false;
    async function loadNodeDetail() {
      await refreshNodeDetail(selectedNode);
      if (cancelled) return;
    }
    loadNodeDetail();
    return () => {
      cancelled = true;
    };
  }, [selectedNode, refreshNodeDetail]);

  const selectedNodeData = findNodeById(selectedNode);
  const selectedNodeTopics = useMemo(
    () => (selectedNode ? topics[selectedNode] ?? [] : []),
    [selectedNode, topics]
  );
  const selectedNodeDisplayPath = useMemo(() => {
    if (!selectedNodeData) return null;
    const segments: string[] = [];
    const visited = new Set<string>();
    let current: TopicSetNode | undefined = selectedNodeData;
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      segments.push(current.name);
      if (!current.parentId) break;
      current = nodeMap[current.parentId];
    }
    if (segments.length > 0) {
      return `/${segments.reverse().join("/")}`;
    }
    return selectedNodeData.path || null;
  }, [nodeMap, selectedNodeData]);

  const impactDrawerNode = findNodeById(impactDrawerNodeId);
  const selectedNodeDistributionRows = selectedNode ? nodeDistributionCache[selectedNode] ?? [] : [];
  const selectedNodeDistributionLoading = selectedNode ? Boolean(nodeDistributionLoadingByNode[selectedNode]) : false;
  const selectedNodeDistributionError = selectedNode ? nodeDistributionErrorByNode[selectedNode] ?? null : null;
  const impactDrawerDistributionRows = impactDrawerNodeId ? nodeDistributionCache[impactDrawerNodeId] ?? [] : [];
  const impactDrawerTopics = useMemo(() => {
    if (!impactDrawerNodeId) return [];
    return impactDrawerDistributionRows;
  }, [impactDrawerDistributionRows, impactDrawerNodeId]);
  const flatNodes = useMemo(
    () => Object.values(nodeMap).sort((a, b) => a.path.localeCompare(b.path)),
    [nodeMap]
  );
  const simulationTopicsReady = useMemo(
    () => flatNodes.every((node) => topicsLoaded[node.id]),
    [flatNodes, topicsLoaded]
  );
  const simulationDraftKey = useMemo(() => {
    if (!topicSetId || !simulationRuntimeEnvironment?.id || !simulationRuntimeEnvironment?.datasetName) {
      return null;
    }
    return [
      topicSetId,
      simulationRuntimeEnvironment.id,
      simulationRuntimeEnvironment.datasetName,
      flatNodes.map((node) => `${node.id}:${node.topicCount ?? 0}`).join("|"),
      Object.keys(topicsLoaded)
        .filter((nodeId) => topicsLoaded[nodeId])
        .sort()
        .map((nodeId) => `${nodeId}:${(topics[nodeId] ?? []).map((topic) => topic.topicId).sort().join(",")}`)
        .join("|"),
    ].join("::");
  }, [flatNodes, simulationRuntimeEnvironment, topicSetId, topics, topicsLoaded]);
  useEffect(() => {
    let cancelled = false;
    async function primeNodeTopics() {
      const canPrimeTopics = usePublishedGovernanceApis || simulationRuntimeReady;
      if (!canPrimeTopics || flatNodes.length === 0) {
        setSimulationTopicsPriming(false);
        return;
      }
      const missingNodeIds = flatNodes
        .map((node) => node.id)
        .filter((nodeId) => !topicsLoaded[nodeId]);
      if (missingNodeIds.length === 0) {
        setSimulationTopicsPriming(false);
        return;
      }
      setSimulationTopicsPriming(true);
      await Promise.all(missingNodeIds.map((nodeId) => loadNodeTopics(nodeId)));
      if (cancelled) return;
      setSimulationTopicsPriming(false);
    }
    void primeNodeTopics();
    return () => {
      cancelled = true;
    };
  }, [flatNodes, loadNodeTopics, simulationRuntimeReady, topicsLoaded, usePublishedGovernanceApis]);
  const totalBoundTopics = useMemo(
    () => flatNodes.reduce((sum, node) => sum + Number(node.topicCount ?? 0), 0),
    [flatNodes]
  );
  const maxDocCount = useMemo(
    () => Math.max(1, ...Object.values(nodeMap).map((node) => node.docCount ?? 0)),
    [nodeMap]
  );
  const editable = useMemo(() => {
    if (!topicSetDetail) return false;
    if (version == null) return true;
    return version === topicSetDetail.version;
  }, [topicSetDetail, version]);
  const canEdit = Boolean(topicSetDetail) && editable && lifecycleStatus === "DRAFT";
  const canSubmitReview = Boolean(topicSetDetail) && editable && lifecycleStatus === "DRAFT";
  const canApprove = Boolean(topicSetDetail) && editable && lifecycleStatus === "REVIEW";
  const canReject = Boolean(topicSetDetail) && editable && lifecycleStatus === "REVIEW";
  const canPublishLifecycle = Boolean(topicSetDetail) && editable && lifecycleStatus === "APPROVED";
  const canCreateVersion = Boolean(topicSetDetail) && editable && lifecycleStatus === "PUBLISHED";
  const canDeprecate = Boolean(topicSetDetail) && editable && lifecycleStatus === "PUBLISHED";
  const canArchive =
    Boolean(topicSetDetail) && editable && lifecycleStatus !== "ARCHIVED" && lifecycleStatus !== "DRAFT";
  const normalizedMoveSourceNode = findNodeById(moveSourceNodeId);
  const coverageByNodeId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const row of coverageRows) {
      if (!row.nodeId) continue;
      map[row.nodeId] = row.hitDocs;
    }
    return map;
  }, [coverageRows]);
  const selectedCoverageDocs = selectedNode ? coverageByNodeId[selectedNode] : undefined;
  const selectedImpactDocs = selectedNode ? impactTotal : undefined;
  const selectedCoverageRow = useMemo(() => {
    if (!selectedNode) return null;
    const node = nodeMap[selectedNode];
    if (!node) return null;
    return {
      nodeId: selectedNode,
      name: node.name,
      hitDocs: coverageByNodeId[selectedNode] ?? node.docCount ?? 0,
      topics: coverageRows.find((row) => row.nodeId === selectedNode)?.topics ?? node.topicCount ?? 0,
    };
  }, [coverageByNodeId, coverageRows, nodeMap, selectedNode]);
  const selectedCoverageTopics = useMemo(
    () => (selectedNodeDistributionRows.length > 0 ? selectedNodeDistributionRows : selectedNodeTopics.map((topic) => ({
      topicId: topic.topicId,
      topicName: topic.topicName,
      hitDocs: topicDocCountMap[topic.topicId] ?? topicHitDocsMap[topic.topicId] ?? 0,
    }))),
    [selectedNodeDistributionRows, selectedNodeTopics, topicDocCountMap, topicHitDocsMap]
  );
  const loadedTopicIds = useMemo(() => {
    const ids = new Set<string>();
    for (const nodeTopics of Object.values(topics)) {
      for (const topic of nodeTopics) {
        ids.add(topic.topicId);
      }
    }
    return Array.from(ids).sort();
  }, [topics]);
  const loadedTopicIdsKey = useMemo(() => loadedTopicIds.join("|"), [loadedTopicIds]);
  const aiTopicInputs = useMemo<TopicSetAITopicInput[]>(() => {
    const topicMap = new Map<string, TopicSetAITopicInput>();
    for (const nodeTopics of Object.values(topics)) {
      for (const topic of nodeTopics) {
        if (!topic.topicId || topicMap.has(topic.topicId)) continue;
        topicMap.set(topic.topicId, {
          topicId: topic.topicId,
          name: topic.topicName ?? topic.topicId,
        });
      }
    }
    return Array.from(topicMap.values());
  }, [topics]);
  const aiNodeInputs = useMemo(
    () =>
      flatNodes.map((node) => ({
        nodeId: node.id,
        parentId: node.parentId ?? null,
        name: node.name,
        path: node.path,
      })),
    [flatNodes]
  );
  useEffect(() => {
    let cancelled = false;
    async function loadAiBindingSuggestions() {
      if (!topicSetId || !selectedNode || aiNodeInputs.length === 0 || aiTopicInputs.length === 0) {
        setAiBindingSuggestions([]);
        return;
      }
      const result = await assignTopicSetTopicsWithAi({
        topicSetId,
        nodes: aiNodeInputs,
        topics: aiTopicInputs,
        refineWithLlm: true,
      });
      if (cancelled) return;
      if (!result.data) {
        if (!selectedNodeData?.name) {
          setAiBindingSuggestions([]);
          return;
        }
        const fallback = (await searchTopic(selectedNodeData.name))
          .filter((topic) => !selectedNodeTopics.some((item) => item.topicId === topic.id))
          .map((topic) => ({
            topicId: topic.id,
            topicName: topic.name,
            score: estimateTopicMatchScore(selectedNodeData.name, topic.name),
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 4);
        if (!cancelled) setAiBindingSuggestions(fallback);
        return;
      }

      const boundTopicIds = new Set(selectedNodeTopics.map((topic) => topic.topicId));
      const topicLookup = new Map(aiTopicInputs.map((topic) => [topic.topicId, topic.name ?? topic.topicId]));
      const ranked = result.data.assignments
        .filter((assignment) => assignment.nodeIds.includes(selectedNode) && !boundTopicIds.has(assignment.topicId))
        .map((assignment) => ({
          topicId: assignment.topicId,
          topicName: topicLookup.get(assignment.topicId) ?? assignment.topicId,
          score: Math.round(Number(assignment.confidence ?? 0) * 100),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 4);
      setAiBindingSuggestions(ranked);
    }
    void loadAiBindingSuggestions();
    return () => {
      cancelled = true;
    };
  }, [aiNodeInputs, aiTopicInputs, searchTopic, selectedNode, selectedNodeData?.name, selectedNodeTopics, topicSetId]);
  useEffect(() => {
    let cancelled = false;
    async function loadAiAnalysis() {
      if (!topicSetId) {
        setAiAnalysisResult(null);
        return;
      }
      const result = await getTopicSetAiAnalysis({
        topicSetId,
        dataset: simulationRuntimeEnvironment?.datasetName ?? null,
        sampleSize: 20,
      });
      if (cancelled) return;
      if (!result.data) {
        setAiAnalysisResult(null);
        return;
      }
      setAiAnalysisResult(result.data);
    }
    void loadAiAnalysis();
    return () => {
      cancelled = true;
    };
  }, [simulationRuntimeEnvironment?.datasetName, topicSetId, runtimeRefreshTick, loadedTopicIdsKey]);
  const driftLastAnalysis = useMemo(
    () => driftDashboard?.lastAnalysis ?? driftHealth?.snapshotDate ?? driftHistory[driftHistory.length - 1]?.snapshotDate ?? null,
    [driftDashboard?.lastAnalysis, driftHealth?.snapshotDate, driftHistory]
  );
  const driftUnmappedGrowth = useMemo(() => {
    if (driftHistory.length === 0) return null;
    const current = driftHistory[driftHistory.length - 1];
    const previous = driftHistory[driftHistory.length - 2] ?? null;
    return {
      previous: Number(previous?.unmappedDocs ?? 0),
      current: Number(current?.unmappedDocs ?? 0),
      change: Number(current?.unmappedDocs ?? 0) - Number(previous?.unmappedDocs ?? 0),
    };
  }, [driftHistory]);
  const emptyNodeIds = useMemo(
    () =>
      flatNodes
        .filter((node) => (childrenByParent[node.id]?.length ?? 0) === 0 && Number(node.topicCount ?? 0) === 0)
        .map((node) => node.id),
    [childrenByParent, flatNodes]
  );
  const overlapTopicIds = useMemo(() => {
    const ids = new Set<string>();
    for (const row of overlapRows) {
      ids.add(row.topicAId);
      ids.add(row.topicBId);
    }
    return ids;
  }, [overlapRows]);
  const aiNodeStateMap = useMemo(() => {
    const map: Record<
      string,
      {
        overlap?: boolean;
        empty?: boolean;
        hot?: boolean;
        uncategorized?: boolean;
      }
    > = {};
    for (const node of flatNodes) {
      const nodeTopicIds = new Set((topics[node.id] ?? []).map((topic) => topic.topicId));
      map[node.id] = {
        overlap: Array.from(nodeTopicIds).some((topicId) => overlapTopicIds.has(topicId)),
        empty: emptyNodeIds.includes(node.id),
        hot: Number(coverageByNodeId[node.id] ?? node.docCount ?? 0) >= Math.max(5, Math.round(maxDocCount * 0.6)),
        uncategorized: Number(unmappedDashboard?.unmappedDocs ?? unmappedTotal ?? 0) > 0 && Number(node.topicCount ?? 0) > 0,
      };
    }
    return map;
  }, [coverageByNodeId, emptyNodeIds, flatNodes, maxDocCount, overlapTopicIds, topics, unmappedDashboard?.unmappedDocs, unmappedTotal]);
  const heuristicAiStructureGroups = useMemo(() => {
    const overlapNames = uniqueStrings(
      overlapRows.flatMap((row) => [row.topicAName ?? row.topicAId, row.topicBName ?? row.topicBId])
    ).slice(0, 3);
    const lowCoverageNames = uniqueStrings(lowCoverageRows.map((row) => row.name)).slice(0, 3);
    const emptyNames = uniqueStrings(
      flatNodes
        .filter((node) => emptyNodeIds.includes(node.id))
        .map((node) => node.name)
    ).slice(0, 3);

    const groups: Array<{ title: string; items: string[] }> = [];
    if (overlapNames.length > 0) {
      groups.push({ title: t("topicSet.ai.structureOverlapGroup"), items: overlapNames });
    }
    if (lowCoverageNames.length > 0) {
      groups.push({ title: t("topicSet.ai.structureRefineGroup"), items: lowCoverageNames });
    }
    if (emptyNames.length > 0) {
      groups.push({ title: t("topicSet.ai.structureCleanupGroup"), items: emptyNames });
    }
    if (groups.length === 0) {
      groups.push({
        title: t("topicSet.ai.structureDefaultGroup"),
        items: flatNodes.slice(0, 3).map((node) => node.name),
      });
    }
    return groups.slice(0, 2);
  }, [emptyNodeIds, flatNodes, lowCoverageRows, overlapRows]);
  const aiStructureGroups = useMemo(
    () =>
      aiStructureDimensions.length > 0
        ? aiStructureDimensions.map((item) => ({ title: item.name, items: item.nodes }))
        : heuristicAiStructureGroups,
    [aiStructureDimensions, heuristicAiStructureGroups]
  );
  const selectedNodeOverlapRows = useMemo(() => {
    const selectedTopicIds = new Set(selectedNodeTopics.map((topic) => topic.topicId));
    return overlapRows.filter(
      (row) => selectedTopicIds.has(row.topicAId) || selectedTopicIds.has(row.topicBId)
    );
  }, [overlapRows, selectedNodeTopics]);
  const selectedNodeAiAnalysis = useMemo(() => {
    if (!selectedNodeData) return null;
    const issues: string[] = [];
    const suggestions: string[] = [];
    const explain: string[] = [];
    const boundCount = Number(nodeDetail?.topicCount ?? selectedNodeTopics.length ?? 0);
    const coverageCount = Number(selectedCoverageDocs ?? selectedNodeData.docCount ?? 0);

    if (boundCount <= 1) {
      issues.push(t("topicSet.ai.issueTooFewTopics", { count: String(boundCount) }));
      suggestions.push(t("topicSet.ai.suggestionAddTopic"));
    }
    if (coverageCount <= 15) {
      issues.push(t("topicSet.ai.issueCoverageNarrow", { count: String(coverageCount) }));
      suggestions.push(t("topicSet.ai.suggestionExpandCoverage"));
    }
    if (selectedNodeOverlapRows.length > 0) {
      const overlapNames = uniqueStrings(
        selectedNodeOverlapRows.flatMap((row) => [row.topicAName ?? row.topicAId, row.topicBName ?? row.topicBId])
      ).slice(0, 2);
      issues.push(t("topicSet.ai.issueOverlap", { names: overlapNames.join(" / ") || "-" }));
      suggestions.push(t("topicSet.ai.suggestionSplitBoundary"));
      explain.push(t("topicSet.ai.explainOverlap", { names: overlapNames.join(" / ") || "-" }));
    }
    if (issues.length === 0) {
      issues.push(t("topicSet.ai.issueHealthy"));
      suggestions.push(t("topicSet.ai.suggestionMaintain"));
    }
    if (aiBindingSuggestions.length > 0) {
      explain.push(
        t("topicSet.ai.explainBinding", {
          name: aiBindingSuggestions[0]?.topicName ?? "-",
          score: String(aiBindingSuggestions[0]?.score ?? 0),
        })
      );
    }
    if (aiOptimizeResult) {
      issues.unshift(...aiOptimizeResult.issues.slice(0, 2));
      suggestions.unshift(
        ...aiOptimizeResult.suggestions
          .map((item) => item.reason)
          .filter(Boolean)
          .slice(0, 2)
      );
      const labels = aiOptimizeResult.suggestions
        .map((item) => extractSuggestionLabel(item.payload))
        .filter(Boolean)
        .slice(0, 2);
      if (labels.length > 0) {
        explain.push(labels.join(" / "));
      }
    }
    return {
      issues: uniqueStrings(issues).slice(0, 4),
      suggestions: uniqueStrings(suggestions).slice(0, 4),
      explain: uniqueStrings(explain).slice(0, 3),
    };
  }, [aiBindingSuggestions, aiOptimizeResult, nodeDetail?.topicCount, selectedCoverageDocs, selectedNodeData, selectedNodeOverlapRows, selectedNodeTopics.length]);
  const selectedNodeAiActions = useMemo(() => {
    if (!selectedNodeData) return [];
    return [
      {
        id: "split",
        label: t("topicSet.ai.actionSplit"),
        hint: t("topicSet.ai.actionSplitHint"),
        onClick: () => setFeedback({ type: "info", title: t("topicSet.ai.actionSplit"), message: t("topicSet.ai.actionQueued") }),
      },
      {
        id: "merge",
        label: t("topicSet.ai.actionMerge"),
        hint: t("topicSet.ai.actionMergeHint"),
        onClick: () => setFeedback({ type: "info", title: t("topicSet.ai.actionMerge"), message: t("topicSet.ai.actionQueued") }),
      },
      {
        id: "rename",
        label: t("topicSet.ai.actionRename"),
        hint: t("topicSet.ai.actionRenameHint"),
        onClick: () => {
          setRenamingNodeId(selectedNodeData.id);
          setRenamingName(`${selectedNodeData.name}${t("topicSet.ai.renameSuffix")}`);
        },
      },
    ];
  }, [selectedNodeData]);
  const aiUnmappedTopics = useMemo(
    () =>
      uniqueStrings([
        ...aiBindingSuggestions.map((item) => item.topicName),
        ...selectedNodeOverlapRows.flatMap((row) => [row.topicAName ?? row.topicAId, row.topicBName ?? row.topicBId]),
      ]).slice(0, 4),
    [aiBindingSuggestions, selectedNodeOverlapRows]
  );
  const aiInsightSummary = useMemo(() => {
    const overlapHigh = (aiAnalysisResult?.overlapLevel ?? "").toUpperCase() === "HIGH" || overlapRows.length > 0;
    const uncoveredRatio = aiAnalysisResult?.coverage != null
      ? Number(aiAnalysisResult.coverage) * (Number(aiAnalysisResult.coverage) <= 1 ? 100 : 1)
      : coverageDashboard?.totalDocs
      ? Number((Number(coverageDashboard.classifiedDocs ?? 0) / Math.max(1, coverageDashboard.totalDocs)) * 100)
      : null;
    const unmappedCount = Number(aiAnalysisResult?.unmappedCount ?? unmappedDashboard?.unmappedDocs ?? unmappedTotal ?? 0);
    const suggestions = uniqueStrings([
      ...((aiAnalysisResult?.suggestions ?? []).map((item) => item.reason)),
      overlapHigh ? t("topicSet.ai.globalSuggestionOverlap") : null,
      emptyNodeIds.length > 0 ? t("topicSet.ai.globalSuggestionEmpty", { count: String(emptyNodeIds.length) }) : null,
      unmappedCount > 0 ? t("topicSet.ai.globalSuggestionUnmapped", { count: String(unmappedCount) }) : null,
      ...((aiOptimizeResult?.suggestions ?? []).map((item) => item.reason)),
    ]);
    const issues = uniqueStrings([
      ...(aiAnalysisResult?.issues ?? []),
      ...(aiOptimizeResult?.issues ?? []),
      overlapHigh ? t("topicSet.ai.globalIssueOverlap") : null,
      emptyNodeIds.length > 0 ? t("topicSet.ai.globalIssueEmpty", { count: String(emptyNodeIds.length) }) : null,
      unmappedCount > 0 ? t("topicSet.ai.globalIssueUnmapped", { count: String(unmappedCount) }) : null,
    ]);
    return {
      coverage: uncoveredRatio == null ? "-" : `${Math.round(uncoveredRatio)}%`,
      overlap:
        (aiAnalysisResult?.overlapLevel || aiOptimizeResult?.overlapLevel)
          ? String(aiAnalysisResult?.overlapLevel ?? aiOptimizeResult?.overlapLevel).toUpperCase() === "HIGH"
            ? t("topicSet.ai.levelHigh")
            : t("topicSet.ai.levelNormal")
          : overlapHigh
          ? t("topicSet.ai.levelHigh")
          : t("topicSet.ai.levelNormal"),
      unmapped: `${Math.round(
        ((unmappedCount / Math.max(1, coverageDashboard?.totalDocs ?? Number(aiAnalysisResult?.stats?.totalDocs ?? 1))) || 0) * 100
      )}%`,
      issues: issues.slice(0, 5),
      suggestions: suggestions.slice(0, 5),
    };
  }, [aiAnalysisResult, aiOptimizeResult, coverageDashboard, emptyNodeIds.length, overlapRows.length, unmappedDashboard?.unmappedDocs, unmappedTotal]);
  const handleApplyAiBindings = useCallback(async () => {
    if (!selectedNode || aiBindingSuggestions.length === 0) {
      setFeedback({
        type: "info",
        title: t("topicSet.ai.autoAssign"),
        message: t("topicSet.ai.noRecommendedTopics"),
      });
      return;
    }
    for (const item of aiBindingSuggestions.slice(0, 3)) {
      const result = await bindTopic(selectedNode, item.topicId);
      if (!result.ok) {
        if (result.status === VERSION_CONFLICT_STATUS) {
          await handleVersionConflict(result.error);
          return;
        }
        setFeedback({
          type: "error",
          title: t("topicSet.feedback.bindFailed"),
          message: result.error,
        });
        return;
      }
    }
    const refreshResult = await refreshRuntimeViews();
    if (!refreshResult.ok) {
      setFeedback({
        type: "error",
        title: t("topicSet.feedback.runtimeRefreshFailed"),
        message: refreshResult.error,
      });
      return;
    }
    await refreshNodeDetail(selectedNode);
    setFeedback({
      type: "success",
      title: t("topicSet.ai.autoAssignDone"),
    });
  }, [aiBindingSuggestions, bindTopic, refreshNodeDetail, refreshRuntimeViews, selectedNode]);
  const handleOpenAiStructure = useCallback(async () => {
    if (!topicSetId) return;
    setAiStructureOpen(true);
    setAiInsightExpanded(true);
    setAiStructureLoading(true);
    const result = await suggestTopicSetStructureWithAi({
      topicSetId,
      topics: aiTopicInputs,
      dataset: simulationRuntimeEnvironment?.datasetName ?? null,
    });
    setAiStructureLoading(false);
    if (!result.data) {
      setAiStructureDimensions([]);
      setFeedback({
        type: "info",
        title: t("topicSet.ai.generateStructure"),
        message: result.error ?? t("topicSet.ai.applyStructureHint"),
      });
      return;
    }
    setAiStructureDimensions(result.data.dimensions ?? []);
  }, [aiTopicInputs, simulationRuntimeEnvironment?.datasetName, topicSetId]);
  const handleRunAiOptimize = useCallback(async () => {
    if (!topicSetId) return;
    setAiInsightExpanded(true);
    const result = await optimizeTopicSetWithAi({
      topicSetId,
      dataset: simulationRuntimeEnvironment?.datasetName ?? null,
      sampleSize: 20,
      simulateResult: {
        totalDocs: coverageDashboard?.totalDocs ?? null,
        classifiedDocs: coverageDashboard?.classifiedDocs ?? null,
        unmappedDocs: Number(unmappedDashboard?.unmappedDocs ?? unmappedTotal ?? 0),
        coverageRatio:
          coverageDashboard?.totalDocs != null
            ? Number(coverageDashboard.classifiedDocs ?? 0) / Math.max(1, Number(coverageDashboard.totalDocs))
            : null,
        overlapDocCount: overlapRows.reduce((sum, row) => sum + Number(row.overlapDocs ?? 0), 0),
        overlapRatio:
          coverageDashboard?.totalDocs != null
            ? overlapRows.reduce((sum, row) => sum + Number(row.overlapDocs ?? 0), 0) /
              Math.max(1, Number(coverageDashboard.totalDocs))
            : null,
      },
    });
    if (!result.data) {
      setFeedback({
        type: "info",
        title: t("topicSet.ai.optimize"),
        message: result.error ?? t("topicSet.ai.optimizeReady"),
      });
      return;
    }
    setAiOptimizeResult(result.data);
    setFeedback({
      type: "success",
      title: t("topicSet.ai.optimize"),
      message: t("topicSet.ai.optimizeReady"),
    });
  }, [coverageDashboard, overlapRows, simulationRuntimeEnvironment?.datasetName, topicSetId, unmappedDashboard?.unmappedDocs, unmappedTotal]);
  const handleApplyAiStructure = useCallback(async () => {
    if (!canEdit) {
      setFeedback({
        type: "info",
        title: t("topicSet.feedback.readonlyTitle"),
        message: t("topicSet.feedback.readonlyMessage"),
      });
      return;
    }
    setAiStructureApplying(true);
    try {
      for (const group of aiStructureGroups) {
        let parentNodeId =
          flatNodes.find((node) => node.parentId == null && node.name === group.title)?.id ?? null;
        if (!parentNodeId) {
          const parentResult = await createNode({ parentId: null, name: group.title });
          if (!parentResult.ok || !parentResult.nodeId) {
            if (parentResult.status === VERSION_CONFLICT_STATUS) {
              await handleVersionConflict(parentResult.error);
              return;
            }
            setFeedback({
              type: "error",
              title: t("topicSet.feedback.createFailed"),
              message: parentResult.error,
            });
            return;
          }
          parentNodeId = parentResult.nodeId;
        }

        const latestNodeMap = useTopicSetStore.getState().nodeMap;
        const existingChildren = Object.values(latestNodeMap).filter((node) => node.parentId === parentNodeId);
        for (const item of group.items) {
          if (existingChildren.some((node) => node.name === item)) continue;
          const childResult = await createNode({ parentId: parentNodeId, name: item });
          if (!childResult.ok) {
            if (childResult.status === VERSION_CONFLICT_STATUS) {
              await handleVersionConflict(childResult.error);
              return;
            }
            setFeedback({
              type: "error",
              title: t("topicSet.feedback.createFailed"),
              message: childResult.error,
            });
            return;
          }
        }
      }
      setAiStructureOpen(false);
      setFeedback({
        type: "success",
        title: t("topicSet.ai.apply"),
        message: t("topicSet.ai.structureApplied"),
      });
    } finally {
      setAiStructureApplying(false);
    }
  }, [aiStructureGroups, canEdit, createNode, flatNodes]);
  const handleApplyOptimizeSuggestion = useCallback(
    async (suggestion: TopicSetAISuggestion) => {
      const payload = suggestion.payload ?? {};

      if (hasAction(payload, "REVIEW_EMPTY_NODES")) {
        const reviewPayload = payload as TopicSetAIReviewEmptyNodesPayload;
        const firstEmptyNodeId = reviewPayload.nodeIds?.[0] ?? emptyNodeIds[0] ?? null;
        if (firstEmptyNodeId) {
          selectNode(firstEmptyNodeId);
        }
        setFeedback({
          type: "info",
          title: t("topicSet.ai.applySuggestion"),
          message: t("topicSet.ai.emptyNodesReviewHint", {
            count: String(Number(reviewPayload.emptyNodeCount ?? reviewPayload.nodeIds?.length ?? emptyNodeIds.length ?? 0)),
          }),
        });
        return;
      }

      if (hasAction(payload, "DELETE_EMPTY_NODES")) {
        const deletePayload = payload as TopicSetAIReviewEmptyNodesPayload;
        const deletableNodeIds = (deletePayload.nodeIds ?? []).filter(Boolean);
        if (deletableNodeIds.length === 0) {
          setFeedback({
            type: "info",
            title: t("topicSet.ai.applySuggestion"),
            message: t("topicSet.ai.emptyNodesReviewHint", {
              count: String(Number(deletePayload.emptyNodeCount ?? emptyNodeIds.length ?? 0)),
            }),
          });
          return;
        }
        for (const nodeId of deletableNodeIds) {
          const node = nodeMap[nodeId];
          if (!node) continue;
          if ((childrenByParent[nodeId]?.length ?? 0) > 0) continue;
          if (Number(node.topicCount ?? 0) > 0) continue;
          const result = await deleteNode(nodeId);
          if (!result.ok) {
            if (result.status === VERSION_CONFLICT_STATUS) {
              await handleVersionConflict(result.error);
              return;
            }
            setFeedback({
              type: "error",
              title: t("topicSet.feedback.deleteFailed"),
              message: result.error,
            });
            return;
          }
        }
        setFeedback({
          type: "success",
          title: t("topicSet.ai.applySuggestion"),
          message: t("topicSet.ai.emptyNodesDeleted"),
        });
        return;
      }

      if (hasAction(payload, "IMPROVE_COVERAGE")) {
        await handleApplyAiBindings();
        return;
      }

      if (hasAction(payload, "SPLIT_NODE")) {
        const splitPayload = payload as TopicSetAISplitNodePayload;
        const targetNode =
          (splitPayload.targetNodeId ? nodeMap[splitPayload.targetNodeId] : null) ??
          flatNodes.find((node) => node.name === splitPayload.targetNodeName) ??
          null;
        if (!targetNode) {
          setFeedback({
            type: "error",
            title: t("topicSet.ai.applySuggestion"),
            message: t("topicSet.ai.targetNodeNotFound", { name: splitPayload.targetNodeName ?? "-" }),
          });
          return;
        }

        const children = splitPayload.children ?? [];
        for (const child of children) {
          const childName = String(child?.name ?? "").trim();
          if (!childName) continue;
          const exists = flatNodes.some((node) => node.parentId === targetNode.id && node.name === childName);
          if (exists) continue;
          const result = await createNode({
            parentId: targetNode.id,
            name: childName,
            description: child.description ?? null,
          });
          if (!result.ok) {
            if (result.status === VERSION_CONFLICT_STATUS) {
              await handleVersionConflict(result.error);
              return;
            }
            setFeedback({
              type: "error",
              title: t("topicSet.feedback.createFailed"),
              message: result.error,
            });
            return;
          }
        }
        selectNode(targetNode.id);
        setFeedback({
          type: "success",
          title: t("topicSet.ai.applySuggestion"),
          message: t("topicSet.ai.splitApplied", {
            target: targetNode.name,
            count: String(children.length),
          }),
        });
        return;
      }

      if (hasAction(payload, "MERGE_NODES")) {
        const mergePayload = payload as TopicSetAIMergeNodesPayload;
        const targetNode =
          (mergePayload.targetNodeId ? nodeMap[mergePayload.targetNodeId] : null) ??
          flatNodes.find((node) => node.name === mergePayload.targetNodeName) ??
          null;
        const sourceNodes = uniqueStrings([
          ...(mergePayload.sourceNodeIds ?? []),
          ...(mergePayload.sourceNodeNames ?? []),
        ])
          .map((value) => nodeMap[value] ?? flatNodes.find((node) => node.name === value) ?? null)
          .filter((node): node is NonNullable<typeof node> => Boolean(node))
          .filter((node) => node.id !== targetNode?.id);
        if (!targetNode) {
          setFeedback({
            type: "error",
            title: t("topicSet.ai.applySuggestion"),
            message: t("topicSet.ai.targetNodeNotFound", { name: mergePayload.targetNodeName ?? "-" }),
          });
          return;
        }
        if (sourceNodes.length === 0) {
          selectNode(targetNode.id);
          setFeedback({
            type: "info",
            title: t("topicSet.ai.applySuggestion"),
            message: t("topicSet.ai.mergeReviewHint", {
              targets: mergePayload.targetNodeName ?? targetNode.name,
            }),
          });
          return;
        }
        const unsafeSource = sourceNodes.find((node) => isDescendant(childrenByParent, node.id, targetNode.id));
        if (unsafeSource) {
          selectNode(unsafeSource.id);
          setFeedback({
            type: "info",
            title: t("topicSet.ai.applySuggestion"),
            message: t("topicSet.ai.mergeReviewHint", {
              targets: `${unsafeSource.name} / ${targetNode.name}`,
            }),
          });
          return;
        }

        const targetTopicIds = new Set((topics[targetNode.id] ?? []).map((topic) => topic.topicId));
        for (const sourceNode of sourceNodes) {
          const sourceTopics = topics[sourceNode.id] ?? [];
          for (const topic of sourceTopics) {
            if (!targetTopicIds.has(topic.topicId)) {
              const bindResult = await bindTopic(targetNode.id, topic.topicId);
              if (!bindResult.ok) {
                if (bindResult.status === VERSION_CONFLICT_STATUS) {
                  await handleVersionConflict(bindResult.error);
                  return;
                }
                setFeedback({
                  type: "error",
                  title: t("topicSet.feedback.bindFailed"),
                  message: bindResult.error,
                });
                return;
              }
              targetTopicIds.add(topic.topicId);
            }
            const unbindResult = await unbindTopic(sourceNode.id, topic.topicId);
            if (!unbindResult.ok) {
              if (unbindResult.status === VERSION_CONFLICT_STATUS) {
                await handleVersionConflict(unbindResult.error);
                return;
              }
              setFeedback({
                type: "error",
                title: t("topicSet.feedback.unbindFailed"),
                message: unbindResult.error,
              });
              return;
            }
          }

          for (const childNodeId of childrenByParent[sourceNode.id] ?? []) {
            if (childNodeId === targetNode.id) continue;
            const childNode = nodeMap[childNodeId];
            if (!childNode) continue;
            const sourceDepth = childNode.path.split("/").filter(Boolean).length;
            const parentDepth = targetNode.path.split("/").filter(Boolean).length;
            let subtreeMaxDepth = sourceDepth;
            const stack = [...(childrenByParent[childNode.id] ?? [])];
            while (stack.length > 0) {
              const currentNodeId = stack.shift();
              if (!currentNodeId) continue;
              const currentNode = nodeMap[currentNodeId];
              const currentDepth = currentNode?.path.split("/").filter(Boolean).length ?? 0;
              subtreeMaxDepth = Math.max(subtreeMaxDepth, currentDepth);
              stack.unshift(...(childrenByParent[currentNodeId] ?? []));
            }
            const subtreeHeight = Math.max(0, subtreeMaxDepth - sourceDepth);
            const movedMaxDepth = parentDepth + 1 + subtreeHeight;
            if (sourceDepth > 0 && parentDepth > 0 && movedMaxDepth > MAX_TAXONOMY_DEPTH) {
              setFeedback({
                type: "error",
                title: t("topicSet.feedback.invalidMoveTitle"),
                message: t("topicSet.feedback.depthLimit", { max: MAX_TAXONOMY_DEPTH }),
              });
              return;
            }
            const moveResult = await moveNode(childNode.id, targetNode.id, null);
            if (!moveResult.ok) {
              if (moveResult.status === VERSION_CONFLICT_STATUS) {
                await handleVersionConflict(moveResult.error);
                return;
              }
              setFeedback({
                type: "error",
                title: t("topicSet.feedback.moveFailed"),
                message: moveResult.error,
              });
              return;
            }
          }

          const deleteResult = await deleteNode(sourceNode.id);
          if (!deleteResult.ok) {
            if (deleteResult.status === VERSION_CONFLICT_STATUS) {
              await handleVersionConflict(deleteResult.error);
              return;
            }
            setFeedback({
              type: "error",
              title: t("topicSet.feedback.deleteFailed"),
              message: deleteResult.error,
            });
            return;
          }
        }
        const refreshResult = await refreshRuntimeViews();
        if (!refreshResult.ok) {
          setFeedback({
            type: "error",
            title: t("topicSet.feedback.runtimeRefreshFailed"),
            message: refreshResult.error,
          });
          return;
        }
        selectNode(targetNode.id);
        await refreshNodeDetail(targetNode.id);
        setFeedback({
          type: "success",
          title: t("topicSet.ai.applySuggestion"),
          message: t("topicSet.ai.mergeApplied", {
            count: String(sourceNodes.length),
            target: targetNode.name,
          }),
        });
        return;
      }

      if (hasAction(payload, "MOVE_NODE")) {
        const movePayload = payload as TopicSetAIMoveNodePayload;
        const sourceNode =
          (movePayload.nodeId ? nodeMap[movePayload.nodeId] : null) ??
          flatNodes.find((node) => node.name === movePayload.nodeName) ??
          null;
        const targetParent =
          (movePayload.newParentId ? nodeMap[movePayload.newParentId] : null) ??
          flatNodes.find((node) => node.name === movePayload.newParentName) ??
          null;
        if (!sourceNode || !targetParent) {
          setFeedback({
            type: "error",
            title: t("topicSet.ai.applySuggestion"),
            message: t("topicSet.ai.targetNodeNotFound", {
              name: movePayload.nodeName ?? movePayload.newParentName ?? "-",
            }),
          });
          return;
        }
        if (sourceNode.id === targetParent.id || isDescendant(childrenByParent, sourceNode.id, targetParent.id)) {
          setFeedback({
            type: "error",
            title: t("topicSet.feedback.invalidMoveTitle"),
            message: t("topicSet.feedback.invalidMoveMessage"),
          });
          return;
        }
        const sourceDepth = sourceNode.path.split("/").filter(Boolean).length;
        const parentDepth = targetParent.path.split("/").filter(Boolean).length;
        let subtreeMaxDepth = sourceDepth;
        const stack = [...(childrenByParent[sourceNode.id] ?? [])];
        while (stack.length > 0) {
          const currentNodeId = stack.shift();
          if (!currentNodeId) continue;
          const currentNode = nodeMap[currentNodeId];
          const currentDepth = currentNode?.path.split("/").filter(Boolean).length ?? 0;
          subtreeMaxDepth = Math.max(subtreeMaxDepth, currentDepth);
          stack.unshift(...(childrenByParent[currentNodeId] ?? []));
        }
        const subtreeHeight = Math.max(0, subtreeMaxDepth - sourceDepth);
        const movedMaxDepth = parentDepth + 1 + subtreeHeight;
        if (sourceDepth > 0 && parentDepth > 0 && movedMaxDepth > MAX_TAXONOMY_DEPTH) {
          setFeedback({
            type: "error",
            title: t("topicSet.feedback.invalidMoveTitle"),
            message: t("topicSet.feedback.depthLimit", { max: MAX_TAXONOMY_DEPTH }),
          });
          return;
        }
        const result = await moveNode(sourceNode.id, targetParent.id, null);
        if (!result.ok) {
          if (result.status === VERSION_CONFLICT_STATUS) {
            await handleVersionConflict(result.error);
            return;
          }
          setFeedback({
            type: "error",
            title: t("topicSet.feedback.moveFailed"),
            message: result.error,
          });
          return;
        }
        const refreshResult = await refreshRuntimeViews();
        if (!refreshResult.ok) {
          setFeedback({
            type: "error",
            title: t("topicSet.feedback.runtimeRefreshFailed"),
            message: refreshResult.error,
          });
          return;
        }
        selectNode(sourceNode.id);
        await refreshNodeDetail(sourceNode.id);
        setFeedback({
          type: "success",
          title: t("topicSet.ai.applySuggestion"),
          message: t("topicSet.ai.moveApplied", {
            source: sourceNode.name,
            target: targetParent.name,
          }),
        });
        return;
      }

      if (hasAction(payload, "RENAME_NODE")) {
        const renamePayload = payload as TopicSetAIRenameNodePayload;
        const targetNode =
          (renamePayload.targetNodeId ? nodeMap[renamePayload.targetNodeId] : null) ??
          flatNodes.find((node) => node.name === renamePayload.currentName) ??
          null;
        const suggestedName = String(renamePayload.suggestedName ?? "").trim();
        if (!targetNode || !suggestedName) {
          setFeedback({
            type: "error",
            title: t("topicSet.ai.applySuggestion"),
            message: t("topicSet.ai.targetNodeNotFound", { name: renamePayload.currentName ?? "-" }),
          });
          return;
        }
        const result = await renameNode(targetNode.id, {
          name: suggestedName,
          description: nodeDetail?.description ?? null,
        });
        if (!result.ok) {
          if (result.status === VERSION_CONFLICT_STATUS) {
            await handleVersionConflict(result.error);
            return;
          }
          setFeedback({
            type: "error",
            title: t("topicSet.feedback.updateFailed"),
            message: result.error,
          });
          return;
        }
        selectNode(targetNode.id);
        await refreshNodeDetail(targetNode.id);
        setFeedback({
          type: "success",
          title: t("topicSet.ai.applySuggestion"),
          message: t("topicSet.ai.renameApplied", { from: targetNode.name, to: suggestedName }),
        });
        return;
      }

      if (hasAction(payload, "BIND_TOPICS")) {
        const bindPayload = payload as TopicSetAIBindTopicsPayload;
        const targetNode =
          (bindPayload.targetNodeId ? nodeMap[bindPayload.targetNodeId] : null) ??
          flatNodes.find((node) => node.name === bindPayload.targetNodeName) ??
          null;
        if (!targetNode) {
          setFeedback({
            type: "error",
            title: t("topicSet.ai.applySuggestion"),
            message: t("topicSet.ai.targetNodeNotFound", { name: bindPayload.targetNodeName ?? "-" }),
          });
          return;
        }
        selectNode(targetNode.id);
        for (const topicId of bindPayload.topicIds ?? []) {
          const result = await bindTopic(targetNode.id, topicId);
          if (!result.ok) {
            if (result.status === VERSION_CONFLICT_STATUS) {
              await handleVersionConflict(result.error);
              return;
            }
            setFeedback({
              type: "error",
              title: t("topicSet.feedback.bindFailed"),
              message: result.error,
            });
            return;
          }
        }
        const refreshResult = await refreshRuntimeViews();
        if (!refreshResult.ok) {
          setFeedback({
            type: "error",
            title: t("topicSet.feedback.runtimeRefreshFailed"),
            message: refreshResult.error,
          });
          return;
        }
        await refreshNodeDetail(targetNode.id);
        setFeedback({
          type: "success",
          title: t("topicSet.ai.applySuggestion"),
          message: t("topicSet.ai.bindApplied", {
            count: String(bindPayload.topicIds?.length ?? 0),
            target: targetNode.name,
          }),
        });
        return;
      }

      if (hasAction(payload, "UNBIND_TOPICS")) {
        const unbindPayload = payload as TopicSetAIBindTopicsPayload;
        const targetNode =
          (unbindPayload.targetNodeId ? nodeMap[unbindPayload.targetNodeId] : null) ??
          flatNodes.find((node) => node.name === unbindPayload.targetNodeName) ??
          null;
        if (!targetNode) {
          setFeedback({
            type: "error",
            title: t("topicSet.ai.applySuggestion"),
            message: t("topicSet.ai.targetNodeNotFound", { name: unbindPayload.targetNodeName ?? "-" }),
          });
          return;
        }
        selectNode(targetNode.id);
        for (const topicId of unbindPayload.topicIds ?? []) {
          const result = await unbindTopic(targetNode.id, topicId);
          if (!result.ok) {
            if (result.status === VERSION_CONFLICT_STATUS) {
              await handleVersionConflict(result.error);
              return;
            }
            setFeedback({
              type: "error",
              title: t("topicSet.feedback.unbindFailed"),
              message: result.error,
            });
            return;
          }
        }
        const refreshResult = await refreshRuntimeViews();
        if (!refreshResult.ok) {
          setFeedback({
            type: "error",
            title: t("topicSet.feedback.runtimeRefreshFailed"),
            message: refreshResult.error,
          });
          return;
        }
        await refreshNodeDetail(targetNode.id);
        setFeedback({
          type: "success",
          title: t("topicSet.ai.applySuggestion"),
          message: t("topicSet.ai.unbindApplied", {
            count: String(unbindPayload.topicIds?.length ?? 0),
            target: targetNode.name,
          }),
        });
        return;
      }

      setFeedback({
        type: "info",
        title: t("topicSet.ai.applySuggestion"),
        message: suggestion.reason,
      });
    },
    [bindTopic, childrenByParent, createNode, deleteNode, emptyNodeIds, flatNodes, handleApplyAiBindings, nodeDetail?.description, nodeMap, moveNode, refreshNodeDetail, refreshRuntimeViews, renameNode, selectNode, topics, unbindTopic]
  );
  const aiOptimizeSuggestionActions = useMemo(
    () =>
      (aiOptimizeResult?.suggestions ?? []).map((suggestion, index) => ({
        id: `opt-${index}`,
        title:
          extractSuggestionLabel(suggestion.payload) ||
          String(suggestion.payload?.action ?? suggestion.type ?? `suggestion-${index}`),
        reason: suggestion.reason,
        confidence: suggestion.confidence,
        onApply: () => {
          void handleApplyOptimizeSuggestion(suggestion);
        },
      })),
    [aiOptimizeResult?.suggestions, handleApplyOptimizeSuggestion]
  );
  const driftImpactRows = useMemo(() => {
    const coverageItems = driftCoverageRows.slice(0, 5).map((row) => ({
      id: `coverage:${row.topicId ?? row.topicName ?? "topic"}`,
      type: "Coverage" as const,
      item: row.topicName ?? row.topicId ?? "-",
      impactScore: Math.min(100, Math.max(1, Math.round(Math.abs((row.changeRate ?? 0) * 100)) || row.currentDocs)),
      actionLabel: "View Docs",
      onAction: () => {
        void openDriftCoverageTopic(row);
      },
    }));
    const overlapItems = driftOverlapRows.slice(0, 5).map((row) => ({
      id: `overlap:${row.topicAId}:${row.topicBId}`,
      type: "Overlap" as const,
      item: `${row.topicAName ?? row.topicAId}/${row.topicBName ?? row.topicBId}`,
      impactScore: Math.min(100, Math.max(1, Math.round(row.overlapDocs))),
      actionLabel: "View Overlap Docs",
      onAction: () => {
        void openDriftOverlapSearch(row);
      },
    }));
    const keywordItems = driftKeywords.slice(0, 5).map((row) => ({
      id: `keyword:${row.term}`,
      type: "Keyword" as const,
      item: row.term,
      impactScore: Math.min(100, Math.max(1, Math.round((row.score ?? row.frequency) * 1))),
      actionLabel: "Search Docs",
      onAction: () => {
        void openDriftKeywordSearch(row.term);
      },
    }));
    return [...coverageItems, ...overlapItems, ...keywordItems]
      .sort((a, b) => b.impactScore - a.impactScore)
      .slice(0, 10);
  }, [driftCoverageRows, driftOverlapRows, driftKeywords, openDriftCoverageTopic, openDriftKeywordSearch, openDriftOverlapSearch]);
  const driftSuggestionRows = useMemo(() => {
    const maxKeywordScore = Math.max(1, ...driftKeywords.map((item) => item.score ?? item.frequency ?? 0));
    return driftKeywords.slice(0, 10).map((row) => ({
      id: `suggestion:${row.term}`,
      suggestedTopic: row.term,
      docs: row.frequency,
      confidence: Number(Math.min(0.99, Math.max(0.5, (row.score ?? row.frequency) / maxKeywordScore)).toFixed(2)),
      onAction: () => {
        void openDriftKeywordSearch(row.term);
      },
    }));
  }, [driftKeywords, openDriftKeywordSearch]);
  const lifecycleChanges = useMemo(() => {
    const nodes = baselineDiff?.nodes ?? [];
    const added = nodes.filter((item) => item.status === "ADDED").slice(0, 5);
    const updated = nodes.filter((item) => item.status === "UPDATED").slice(0, 5);
    const removed = nodes.filter((item) => item.status === "REMOVED").slice(0, 5);
    return { added, updated, removed };
  }, [baselineDiff]);

  const getNodeDepth = useCallback(
    (nodeId: string) => {
      const node = nodeMap[nodeId];
      return node?.path.split("/").filter(Boolean).length ?? 0;
    },
    [nodeMap]
  );

  const getSubtreeMaxDepth = useCallback(
    (sourceNodeId: string) => {
      let maxDepth = getNodeDepth(sourceNodeId);
      const stack = [...(childrenByParent[sourceNodeId] ?? [])];
      while (stack.length > 0) {
        const current = stack.shift();
        if (!current) continue;
        maxDepth = Math.max(maxDepth, getNodeDepth(current));
        stack.unshift(...(childrenByParent[current] ?? []));
      }
      return maxDepth;
    },
    [childrenByParent, getNodeDepth]
  );

  const exceedsDepthLimit = useCallback(
    (sourceNodeId: string, newParentId: string) => {
      const sourceDepth = getNodeDepth(sourceNodeId);
      const parentDepth = getNodeDepth(newParentId);
      if (sourceDepth === 0 || parentDepth === 0) return false;
      const subtreeMaxDepth = getSubtreeMaxDepth(sourceNodeId);
      const subtreeHeight = Math.max(0, subtreeMaxDepth - sourceDepth);
      const movedMaxDepth = parentDepth + 1 + subtreeHeight;
      return movedMaxDepth > MAX_TAXONOMY_DEPTH;
    },
    [getNodeDepth, getSubtreeMaxDepth]
  );

  const moveDepthInvalid = useMemo(() => {
    if (!moveSourceNodeId || !moveParentId) return false;
    return exceedsDepthLimit(moveSourceNodeId, moveParentId);
  }, [moveParentId, moveSourceNodeId, exceedsDepthLimit]);

  const buildSimulationDraft = useCallback(async (): Promise<TopicSetDraftPayload | null> => {
    if (!simulationDraftKey || !topicSetId || !simulationRuntimeEnvironment?.id || !simulationRuntimeEnvironment?.datasetName) {
      return null;
    }

    if (simulationDraftCacheRef.current?.key === simulationDraftKey) {
      return simulationDraftCacheRef.current.draft;
    }

    if (simulationDraftPromiseRef.current?.key === simulationDraftKey) {
      return simulationDraftPromiseRef.current.promise;
    }

    if (!flatNodes.every((node) => topicsLoaded[node.id])) {
      return null;
    }

    const promise = (async () => {
      const nodeTopicEntries = flatNodes.map(
        (node) => [node.id, topics[node.id] ?? []] as const
      );

      const topicsByNodeId = new Map<string, NodeTopicView[]>(
        nodeTopicEntries.map(([nodeId, nodeTopics]) => [nodeId, nodeTopics])
      );
      const topicIds = Array.from(
        new Set(
          nodeTopicEntries.flatMap(([, nodeTopics]) => nodeTopics.map((topic) => topic.topicId))
        )
      );

      await Promise.all(
        topicIds.map(async (topicId) => {
          if (compiledTopicGqlCacheRef.current[topicId]) return;
          const draftResult = await fetchTopicDraft(topicId);
          const draftRule = draftResult.data?.rule;
          if (!draftRule) return;
          const previewResult = await previewTopicRule(topicId, {
            rule: draftRule,
            runtimeEnvironmentId: simulationRuntimeEnvironment?.id ?? undefined,
          });
          const gql = previewResult.data?.gql?.trim();
          if (gql) {
            compiledTopicGqlCacheRef.current[topicId] = applyRuntimeFieldMappings(
              gql,
              simulationRuntimeEnvironment
            );
          }
        })
      );

      const nodes = flatNodes
        .map((node) => ({
          nodeId: node.id,
          name: node.name,
          topics: (topicsByNodeId.get(node.id) ?? [])
            .map((topic) => {
              const compiledGql = compiledTopicGqlCacheRef.current[topic.topicId];
              if (!compiledGql) return null;
              return {
                topicId: topic.topicId,
                topicName: topic.topicName ?? null,
                compiledGql,
              };
            })
            .filter((topic): topic is NonNullable<typeof topic> => Boolean(topic)),
        }))
        .filter((node) => node.topics.length > 0);

      if (nodes.length === 0) {
        return null;
      }

      const draft = {
        dataset: simulationRuntimeEnvironment?.datasetName,
        nodes,
      };
      simulationDraftCacheRef.current = { key: simulationDraftKey, draft };
      return draft;
    })();

    simulationDraftPromiseRef.current = { key: simulationDraftKey, promise };
    try {
      return await promise;
    } finally {
      if (simulationDraftPromiseRef.current?.key === simulationDraftKey) {
        simulationDraftPromiseRef.current = null;
      }
    }
  }, [flatNodes, simulationDraftKey, simulationRuntimeEnvironment, topicSetId, topics, topicsLoaded]);

  const hasSimulationNode = useCallback((draft: TopicSetDraftPayload | null, nodeId: string) => {
    if (!draft) return false;
    return draft.nodes.some((node) => node.nodeId === nodeId);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadCoverage() {
      if (!topicSetId) return;
      if (usePublishedGovernanceApis) {
        const [
          coverageResult,
          governanceResult,
          overlapDashboardResult,
          unmappedDashboardResult,
          topicsResult,
        ] = await Promise.all([
          fetchTopicSetCoverage(topicSetId, { dedup: coverageDedup }),
          fetchTopicSetGovernanceDashboard(topicSetId, {
            lowCoverageThreshold: LOW_COVERAGE_THRESHOLD,
            overlapMinOverlap: 1,
            overlapLimit: 20,
          }),
          fetchTopicSetOverlapDashboard(topicSetId, {
            minOverlap: 1,
            limit: 20,
          }),
          fetchTopicSetUnmappedDashboard(topicSetId, { sampleSize: 10 }),
          fetchCoverageTopics(),
        ]);
        if (cancelled) return;

        const {
          nodeMap: latestNodeMap,
          rootNodeIds: latestRootNodeIds,
          childrenByParent: latestChildrenByParent,
        } = useTopicSetStore.getState();

        const coverageNodes = coverageResult.data?.nodes ?? [];
        const rows = coverageNodes
          .map((item) => ({
            nodeId: item.nodeId,
            name: latestNodeMap[item.nodeId]?.name || item.name || item.nodeId,
            hitDocs: Number(item.docCount ?? 0),
            topics: Number(item.topics ?? latestNodeMap[item.nodeId]?.topicCount ?? 0),
          }))
          .filter((item) => {
            if (!item.nodeId) return true;
            const isRoot = latestRootNodeIds.includes(item.nodeId);
            const hasChildren = (latestChildrenByParent[item.nodeId]?.length ?? 0) > 0;
            return !(isRoot && hasChildren);
          })
          .sort((a, b) => b.hitDocs - a.hitDocs);
        setCoverageRows(rows);
        setCoverageDashboard(
          governanceResult.data?.coverage
            ? {
                totalDocs: Number(governanceResult.data.coverage.totalDocs ?? 0),
                classifiedDocs: Number(governanceResult.data.coverage.classifiedDocs ?? 0),
                unmappedDocs: Number(governanceResult.data.coverage.unmappedDocs ?? 0),
                nodes: Number(governanceResult.data.coverage.nodes ?? 0),
                topics: Number(governanceResult.data.coverage.topics ?? 0),
              }
            : null
        );
        setLowCoverageRows(
          (governanceResult.data?.lowCoverage?.nodes ?? []).map((item) => ({
            nodeId: item.nodeId,
            name: latestNodeMap[item.nodeId]?.name || item.name || item.nodeId,
            hitDocs: Number(item.docCount ?? 0),
            topicCount: Number(item.topicCount ?? 0),
          }))
        );
        setOverlapRows(
          (overlapDashboardResult.data?.items ?? []).map((item) => ({
            topicAId: item.topicAId,
            topicAName: item.topicAName,
            topicBId: item.topicBId,
            topicBName: item.topicBName,
            overlapDocs: Number(item.overlapDocs ?? 0),
            docsPath: item.docsPath ?? null,
            explainPathTemplate: item.explainPathTemplate ?? null,
          }))
        );
        setUnmappedDashboard(
          unmappedDashboardResult.data
            ? {
                totalDocs: Number(unmappedDashboardResult.data.totalDocs ?? 0),
                classifiedDocs: Number(unmappedDashboardResult.data.classifiedDocs ?? 0),
                unmappedDocs: Number(unmappedDashboardResult.data.unmappedDocs ?? 0),
                sampleDocuments: (unmappedDashboardResult.data.sampleDocuments ?? []).map((item) => ({
                  docId: item.docId,
                  title: item.title ?? null,
                })),
              }
            : null
        );

        if (topicsResult.data) {
          const nextTopicHits: Record<string, number> = {};
          for (const item of topicsResult.data.topics ?? []) {
            nextTopicHits[item.topicId] = item.hitDocs ?? 0;
          }
          setTopicHitDocsMap(nextTopicHits);
        }
        return;
      }

      if (!simulationRuntimeReady) {
        setCoverageRows([]);
        setCoverageDashboard(null);
        setLowCoverageRows([]);
        setOverlapRows([]);
        setUnmappedDashboard(null);
        setUnmappedTotal(0);
        setUnmappedDocs([]);
        setTopicHitDocsMap({});
        return;
      }
      if (!simulationTopicsReady || simulationTopicsPriming) {
        return;
      }

      const simulationDraft = await buildSimulationDraft();
      if (!simulationDraft) {
        setCoverageRows([]);
        setCoverageDashboard(null);
        setLowCoverageRows([]);
        setOverlapRows([]);
        setUnmappedDashboard(null);
        setUnmappedTotal(0);
        setUnmappedDocs([]);
        setTopicHitDocsMap({});
        return;
      }
      const bundleKey = [
        simulationDraftKey ?? "no-draft",
        `dedup=${coverageDedup}`,
        `page=${unmappedPage}`,
        `size=${unmappedSize}`,
        `sort=${unmappedSort}`,
      ].join("::");
      let bundle = simulationCoverageBundleCacheRef.current?.key === bundleKey
        ? simulationCoverageBundleCacheRef.current.data
        : null;
      if (!bundle) {
        const existingPromise =
          simulationCoverageBundlePromiseRef.current?.key === bundleKey
            ? simulationCoverageBundlePromiseRef.current.promise
            : null;
        const promise =
          existingPromise ??
          Promise.all([
            simulateTopicSetCoverage({ dedup: coverageDedup, topicSetDraft: simulationDraft }),
            simulateTopicSetDashboard({
              dedup: coverageDedup,
              overlapMinOverlap: 1,
              overlapLimit: 20,
              unmappedSampleSize: 10,
              unmappedSort,
              topicSetDraft: simulationDraft,
            }),
            simulateTopicSetOverlap({
              minOverlap: 1,
              limit: 20,
              topicSetDraft: simulationDraft,
            }),
          ]).then(([coverageResult, dashboardResult, overlapResult]) => ({
            coverageResult,
            dashboardResult,
            overlapResult,
          }));
        if (!existingPromise) {
          simulationCoverageBundlePromiseRef.current = { key: bundleKey, promise };
        }
        try {
          bundle = await promise;
          simulationCoverageBundleCacheRef.current = { key: bundleKey, data: bundle };
        } finally {
          if (simulationCoverageBundlePromiseRef.current?.key === bundleKey) {
            simulationCoverageBundlePromiseRef.current = null;
          }
        }
      }
      if (cancelled) return;
      const { coverageResult, dashboardResult, overlapResult } = bundle;
      const {
        nodeMap: latestNodeMap,
        rootNodeIds: latestRootNodeIds,
        childrenByParent: latestChildrenByParent,
        nodeMap: latestNodeMapAll,
      } = useTopicSetStore.getState();
      const latestTotalBoundTopics = Object.values(latestNodeMapAll).reduce(
        (sum, node) => sum + Number(node.topicCount ?? 0),
        0
      );

      const coverageNodes = coverageResult.data?.nodes ?? [];
      const rows = coverageNodes
        .map((item) => ({
          nodeId: item.nodeId,
          name: latestNodeMap[item.nodeId]?.name || item.name || item.nodeId,
          hitDocs: Number(item.docCount ?? 0),
          topics: Number(latestNodeMap[item.nodeId]?.topicCount ?? 0),
        }))
        .filter((item) => {
          if (!item.nodeId) return true;
          const isRoot = latestRootNodeIds.includes(item.nodeId);
          const hasChildren = (latestChildrenByParent[item.nodeId]?.length ?? 0) > 0;
          return !(isRoot && hasChildren);
        })
        .sort((a, b) => b.hitDocs - a.hitDocs);

      setCoverageRows(rows);
      setCoverageDashboard({
        totalDocs: Number(
          dashboardResult.data?.coverage?.totalDocs ?? coverageResult.data?.totalDocs ?? 0
        ),
        classifiedDocs: Number(
          dashboardResult.data?.coverage?.classifiedDocs ?? coverageResult.data?.classifiedDocs ?? 0
        ),
        unmappedDocs: Number(
          dashboardResult.data?.coverage?.unmappedDocs ?? coverageResult.data?.unmappedDocs ?? 0
        ),
        nodes: rows.length,
        topics: latestTotalBoundTopics,
      });
      setLowCoverageRows(
        rows
          .filter(
            (item) =>
              item.nodeId &&
              Number(item.topics ?? 0) > 0 &&
              Number(item.hitDocs ?? 0) < LOW_COVERAGE_THRESHOLD
          )
          .map((item) => ({
            nodeId: item.nodeId ?? "",
            name: item.name,
            hitDocs: item.hitDocs,
            topicCount: Number(item.topics ?? 0),
          }))
      );
      setOverlapRows(
        (overlapResult.data?.overlaps ?? []).map((item) => ({
          topicAId: item.topicAId,
          topicAName: item.topicAName,
          topicBId: item.topicBId,
          topicBName: item.topicBName,
          overlapDocs: Number(item.overlapDocs ?? 0),
          docsPath: null,
          explainPathTemplate: null,
        }))
      );
      setUnmappedDashboard({
        totalDocs: Number(dashboardResult.data?.unmappedDocs ?? coverageResult.data?.totalDocs ?? 0),
        classifiedDocs: Number(
          dashboardResult.data?.coverage?.classifiedDocs ?? coverageResult.data?.classifiedDocs ?? 0
        ),
        unmappedDocs: Number(
          dashboardResult.data?.unmappedDocs ?? coverageResult.data?.unmappedDocs ?? 0
        ),
        sampleDocuments: (dashboardResult.data?.unmappedSampleDocs ?? []).map((item) => ({
          docId: item.docId ?? item.id ?? "",
          title: item.title ?? null,
        })),
      });
      setTopicHitDocsMap({});
    }
    void loadCoverage();
    return () => {
      cancelled = true;
    };
  }, [
    coverageDedup,
    topicSetId,
    runtimeRefreshTick,
    usePublishedGovernanceApis,
    simulationRuntimeReady,
    simulationTopicsPriming,
    simulationTopicsReady,
    buildSimulationDraft,
  ]);

  useEffect(() => {
    let cancelled = false;
    async function loadUnmappedList() {
      if (!topicSetId) return;
      if (usePublishedGovernanceApis) {
        const result = await fetchTopicSetUnmapped(topicSetId, {
          page: unmappedPage,
          size: unmappedSize,
          sort: unmappedSort,
        });
        if (cancelled) return;
        const items = result.data?.items ?? [];
        setUnmappedTotal(Number(result.data?.total ?? items.length));
        setUnmappedDocs(
          items.map((item) => ({
            docId: item.docId,
            title: item.title ?? null,
          }))
        );
        return;
      }

      if (!simulationRuntimeReady) {
        setUnmappedTotal(0);
        setUnmappedDocs([]);
        return;
      }
      if (!simulationTopicsReady || simulationTopicsPriming) {
        return;
      }

      const simulationDraft = await buildSimulationDraft();
      if (!simulationDraft) {
        setUnmappedTotal(0);
        setUnmappedDocs([]);
        return;
      }
      const result = await simulateTopicSetUnmapped({
        page: unmappedPage,
        size: unmappedSize,
        sort: unmappedSort,
        topicSetDraft: simulationDraft,
      });
      if (cancelled) return;
      const items = result.data?.documents ?? [];
      setUnmappedTotal(Number(result.data?.total ?? items.length));
      setUnmappedDocs(
        items.map((item) => ({
          docId: item.docId ?? item.id ?? "",
          title: item.title ?? null,
        }))
      );
    }
    void loadUnmappedList();
    return () => {
      cancelled = true;
    };
  }, [
    topicSetId,
    unmappedPage,
    unmappedSize,
    unmappedSort,
    runtimeRefreshTick,
    usePublishedGovernanceApis,
    simulationRuntimeReady,
    simulationTopicsPriming,
    simulationTopicsReady,
    buildSimulationDraft,
  ]);

  useEffect(() => {
    let cancelled = false;
    async function loadDriftDashboard() {
      if (!topicSetId) return;
      if (!usePublishedGovernanceApis) {
        setDriftDashboard(null);
        setDriftHealth(null);
        setDriftHistory([]);
        setDriftSummary(null);
        setDriftCoverageRows([]);
        setDriftOverlapRows([]);
        setDriftKeywords([]);
        setDriftUnmappedTotal(0);
        return;
      }

      const [dashboardResult, healthResult, historyResult, summaryResult, coverageResult, overlapResult, unmappedResult, keywordsResult] =
        await Promise.all([
          getTopicSetDriftDashboard(topicSetId),
          getTopicSetDriftHealth(topicSetId),
          getTopicSetDriftHistory(topicSetId, { limit: 12 }),
          fetchTopicSetDriftSummary(topicSetId),
          fetchTopicSetDriftCoverage(topicSetId),
          fetchTopicSetDriftOverlap(topicSetId, { minOverlap: 1, limit: 20 }),
          fetchTopicSetDriftUnmapped(topicSetId),
          fetchTopicSetDriftKeywords(topicSetId, { limit: 20, sampleDocs: 200 }),
        ]);
      if (cancelled) return;

      setDriftDashboard(
        dashboardResult.data
          ? {
              healthScore: dashboardResult.data.healthScore ?? null,
              coverageDrift: Number(dashboardResult.data.coverageDrift ?? 0),
              overlapDrift: Number(dashboardResult.data.overlapDrift ?? 0),
              unmappedIncrease: Number(dashboardResult.data.unmappedIncrease ?? 0),
              lastAnalysis: dashboardResult.data.lastAnalysis ?? null,
            }
          : null
      );
      setDriftHealth(
        healthResult.data
          ? {
              score: healthResult.data.healthScore ?? null,
              trend: healthResult.data.trend ?? null,
              snapshotDate: healthResult.data.snapshotDate ?? null,
            }
          : null
      );
      setDriftHistory(
        (historyResult.data?.history ?? []).map((item) => ({
          snapshotDate: item.snapshotDate,
          coverageRatio: Number(item.coverageRatio ?? 0),
          unmappedDocs: Number(item.unmappedDocs ?? 0),
          overlapDocCount: Number(item.overlapDocCount ?? 0),
          healthScore: Number(item.healthScore ?? 0),
        }))
      );
      setDriftSummary(
        summaryResult.data
          ? {
              totalDocs: Number(summaryResult.data.totalDocs ?? 0),
              classifiedDocs: Number(summaryResult.data.classifiedDocs ?? 0),
              unmappedDocs: Number(summaryResult.data.unmappedDocs ?? 0),
              coverageRatio: Number(summaryResult.data.coverageRatio ?? 0),
              overlapCount: Number(summaryResult.data.overlapCount ?? 0),
            }
          : null
      );
      setDriftCoverageRows(
        (coverageResult.data?.topics ?? [])
          .map((item) => ({
            topicId: item.topicId ?? null,
            topicName: item.topicName ?? item.topicId ?? null,
            currentDocs: Number(item.currentDocs ?? item.docCount ?? 0),
            previousDocs: Number(item.previousDocs ?? 0),
            changeRate: item.changeRate ?? null,
          }))
          .sort((a, b) => b.currentDocs - a.currentDocs)
      );
      setDriftOverlapRows(
        (overlapResult.data?.overlaps ?? []).map((item) => ({
          topicAId: item.topicAId,
          topicAName: item.topicAName ?? (item as { topicA?: string | null }).topicA ?? null,
          topicBId: item.topicBId,
          topicBName: item.topicBName ?? (item as { topicB?: string | null }).topicB ?? null,
          overlapDocs: Number(item.overlapDocs ?? 0),
        }))
      );
      setDriftKeywords(
        (keywordsResult.data?.keywords ?? []).map((item) => ({
          term: item.term,
          frequency: Number(item.frequency ?? 0),
          score: item.score ?? null,
        }))
      );
      setDriftUnmappedTotal(Number(unmappedResult.data?.unmappedDocs ?? summaryResult.data?.unmappedDocs ?? 0));
    }
    void loadDriftDashboard();
    return () => {
      cancelled = true;
    };
  }, [topicSetId, usePublishedGovernanceApis, driftRefreshTick]);

  const loadNodeDistribution = useCallback(
    async (nodeId: string) => {
      if (!topicSetId) return;
      setNodeDistributionLoadingByNode((prev) => ({ ...prev, [nodeId]: true }));
      setNodeDistributionErrorByNode((prev) => ({ ...prev, [nodeId]: null }));
      if (!usePublishedGovernanceApis) {
        await loadNodeTopics(nodeId);
        const nextTopics = useTopicSetStore.getState().topics[nodeId] ?? [];
        setNodeDistributionCache((prev) => ({
          ...prev,
          [nodeId]: nextTopics.map((topic) => ({
            topicId: topic.topicId,
            topicName: topic.topicName ?? topic.topicId,
            hitDocs: topicDocCountMap[topic.topicId] ?? topicHitDocsMap[topic.topicId] ?? 0,
          })),
        }));
        setNodeDistributionLoadingByNode((prev) => ({ ...prev, [nodeId]: false }));
        setNodeDistributionErrorByNode((prev) => ({ ...prev, [nodeId]: null }));
        return;
      }
      const result = await fetchTopicSetNodeDistribution(topicSetId, nodeId, {
        dedup: coverageDedup,
        limit: 50,
        sort: "docCount",
        order: "desc",
      });
      setNodeDistributionLoadingByNode((prev) => ({ ...prev, [nodeId]: false }));
      if (!result.data) {
        setNodeDistributionCache((prev) => ({ ...prev, [nodeId]: [] }));
        setNodeDistributionErrorByNode((prev) => ({
          ...prev,
          [nodeId]: result.error ?? t("topicSet.analytics.distributionLoadFailed"),
        }));
        return;
      }
      setNodeDistributionCache((prev) => ({
        ...prev,
        [nodeId]: (result.data?.items ?? []).map((item) => ({
          topicId: item.topicId,
          topicName: item.topicName,
          hitDocs: Number(item.docCount ?? 0),
        })),
      }));
      setNodeDistributionErrorByNode((prev) => ({ ...prev, [nodeId]: null }));
    },
    [coverageDedup, loadNodeTopics, topicDocCountMap, topicHitDocsMap, topicSetId, usePublishedGovernanceApis]
  );

  useEffect(() => {
    if (!selectedNode) return;
    void loadNodeDistribution(selectedNode);
  }, [loadNodeDistribution, runtimeRefreshTick, selectedNode]);

  useEffect(() => {
    if (!impactDrawerOpen || !impactDrawerNodeId) return;
    void loadNodeDistribution(impactDrawerNodeId);
  }, [impactDrawerNodeId, impactDrawerOpen, loadNodeDistribution, runtimeRefreshTick]);

  useEffect(() => {
    let cancelled = false;
    async function loadTopicDocCounts() {
      if (loadedTopicIds.length === 0) return;
      const missingTopicIds = loadedTopicIds.filter((topicId) => !(topicId in topicDocCountMap));
      if (missingTopicIds.length === 0) {
        return;
      }
      const entries = await Promise.all(
        missingTopicIds.map(async (topicId) => {
          const total = await loadGovernanceTopicDocCount(topicId, runtimeRefreshTick);
          return [topicId, total] as const;
        })
      );
      if (cancelled) return;
      setTopicDocCountMap((prev) => {
        let changed = false;
        const nextMap = { ...prev };
        for (const [topicId, total] of entries) {
          if (nextMap[topicId] !== total) {
            nextMap[topicId] = total;
            changed = true;
          }
        }
        return changed ? nextMap : prev;
      });
    }
    void loadTopicDocCounts();
    return () => {
      cancelled = true;
    };
  }, [loadedTopicIdsKey, runtimeRefreshTick, topicDocCountMap]);

  useEffect(() => {
    let cancelled = false;
    async function loadImpactDocs() {
      if (!topicSetId || !selectedNode) {
        setImpactDocs([]);
        setImpactDocsError(null);
        return;
      }
      if (!usePublishedGovernanceApis && !simulationRuntimeReady) {
        setImpactDocs([]);
        setImpactDocsError(getSimulationRuntimeMissingMessage());
        return;
      }
      if (!usePublishedGovernanceApis && (!simulationTopicsReady || simulationTopicsPriming)) {
        setImpactDocs([]);
        setImpactDocsError(null);
        return;
      }
      setImpactDocsLoading(true);
      setImpactDocsError(null);
      const result = usePublishedGovernanceApis
        ? await fetchTopicSetNodeImpact(topicSetId, selectedNode, {
            page: impactPage,
            size: impactSize,
            sort: impactSort,
          })
        : await (async () => {
            const simulationDraft = await buildSimulationDraft();
            if (!simulationDraft) return { data: null, error: getSimulationDraftUnavailableMessage() };
            if (!hasSimulationNode(simulationDraft, selectedNode)) {
              return { data: null, error: getSimulationNodeUnavailableMessage() };
            }
            return simulateTopicSetImpact({
              nodeId: selectedNode,
              page: impactPage,
              size: impactSize,
              sort: impactSort,
              topicSetDraft: simulationDraft,
            });
          })();
      if (cancelled) return;
      setImpactDocsLoading(false);
      if (!result.data) {
        setImpactDocsError(result.error ?? t("topicSet.feedback.loadDocsFailed"));
        return;
      }
      const documents = getImpactDocuments(result.data);
      setImpactDocs(
        documents.map((item) => ({
          docId: getDocumentId(item),
          title: getDocumentTitle(item),
          summary: item.summary ?? null,
        }))
      );
      setImpactTotal(Number(result.data.total ?? 0));
    }
    void loadImpactDocs();
    return () => {
      cancelled = true;
    };
  }, [buildSimulationDraft, impactPage, impactSize, impactSort, selectedNode, topicSetId, runtimeRefreshTick, simulationRuntimeReady, simulationTopicsPriming, simulationTopicsReady, usePublishedGovernanceApis]);

  const prefetchImpactForNode = useCallback(
    async (nodeId: string) => {
      if (!topicSetId) return;
      if (!usePublishedGovernanceApis && !simulationRuntimeReady) return;
      if (!usePublishedGovernanceApis && (!simulationTopicsReady || simulationTopicsPriming)) return;
      await loadNodeTopics(nodeId, true);
      if (impactDrawerDocsCache[nodeId]) return;
      const result = usePublishedGovernanceApis
        ? await fetchTopicSetNodeImpact(topicSetId, nodeId, {
            page: 0,
            size: 12,
            sort: "score",
          })
        : await (async () => {
            const simulationDraft = await buildSimulationDraft();
            if (!simulationDraft) return { data: null, error: getSimulationDraftUnavailableMessage() };
            if (!hasSimulationNode(simulationDraft, nodeId)) {
              return { data: null, error: getSimulationNodeUnavailableMessage() };
            }
            return simulateTopicSetImpact({
              nodeId,
              page: 0,
              size: 12,
              sort: "score",
              topicSetDraft: simulationDraft,
            });
          })();
      if (!result.data) return;
      const documents = getImpactDocuments(result.data);
      setImpactDrawerDocsCache((prev) => ({
        ...prev,
        [nodeId]: documents.map((item) => ({
          docId: getDocumentId(item),
          title: getDocumentTitle(item),
          weight: 0,
        })),
      }));
    },
    [buildSimulationDraft, hasSimulationNode, impactDrawerDocsCache, loadNodeTopics, topicSetId, simulationRuntimeReady, simulationTopicsPriming, simulationTopicsReady, usePublishedGovernanceApis]
  );

  useEffect(() => {
    let cancelled = false;
    async function loadDrawerDocs() {
      if (!impactDrawerOpen || !impactDrawerNodeId || !topicSetId) {
        setImpactDrawerDocs([]);
        setImpactDrawerDocsError(null);
        return;
      }
      if (!usePublishedGovernanceApis && !simulationRuntimeReady) {
        setImpactDrawerDocs([]);
        setImpactDrawerDocsError(getSimulationRuntimeMissingMessage());
        return;
      }
      if (!usePublishedGovernanceApis && (!simulationTopicsReady || simulationTopicsPriming)) {
        setImpactDrawerDocs([]);
        setImpactDrawerDocsError(null);
        return;
      }
      setImpactDrawerDocsLoading(true);
      setImpactDrawerDocsError(null);
      if (impactDrawerDocsCache[impactDrawerNodeId]) {
        setImpactDrawerDocs(impactDrawerDocsCache[impactDrawerNodeId]);
        setImpactDrawerDocsLoading(false);
        return;
      }
      const result = usePublishedGovernanceApis
        ? await fetchTopicSetNodeImpact(topicSetId, impactDrawerNodeId, {
            page: 0,
            size: 12,
            sort: "score",
          })
        : await (async () => {
            const simulationDraft = await buildSimulationDraft();
            if (!simulationDraft) return { data: null, error: getSimulationDraftUnavailableMessage() };
            if (!hasSimulationNode(simulationDraft, impactDrawerNodeId)) {
              return { data: null, error: getSimulationNodeUnavailableMessage() };
            }
            return simulateTopicSetImpact({
              nodeId: impactDrawerNodeId,
              page: 0,
              size: 12,
              sort: "score",
              topicSetDraft: simulationDraft,
            });
          })();
      if (cancelled) return;
      setImpactDrawerDocsLoading(false);
      if (!result.data) {
        setImpactDrawerDocsError(result.error ?? t("topicSet.feedback.loadDocsFailed"));
        return;
      }
      const documents = getImpactDocuments(result.data);
      setImpactDrawerDocs(
        documents.map((item) => ({
          docId: getDocumentId(item),
          title: getDocumentTitle(item),
          weight: 0,
        }))
      );
      setImpactDrawerDocsCache((prev) => ({
        ...prev,
        [impactDrawerNodeId]: documents.map((item) => ({
          docId: getDocumentId(item),
          title: getDocumentTitle(item),
          weight: 0,
        })),
      }));
    }
    void loadDrawerDocs();
    return () => {
      cancelled = true;
    };
  }, [buildSimulationDraft, hasSimulationNode, impactDrawerDocsCache, impactDrawerNodeId, impactDrawerOpen, topicSetId, runtimeRefreshTick, simulationRuntimeReady, simulationTopicsPriming, simulationTopicsReady, usePublishedGovernanceApis]);

  async function refreshRuntimeViews() {
    if (!topicSetId) return { ok: false, error: "TopicSet is not selected." };
    if (usePublishedGovernanceApis) {
      const result = await refreshTopicSetRuntimeCache(topicSetId);
      if (!result.data) {
        return { ok: false, error: result.error ?? t("topicSet.feedback.runtimeRefreshFailed") };
      }
    }
    setImpactDrawerDocsCache({});
    setNodeDistributionCache({});
    setNodeDistributionLoadingByNode({});
    setNodeDistributionErrorByNode({});
    setTopicDocCountMap({});
    setRuntimeRefreshTick((prev) => prev + 1);
    return { ok: true };
  }

  async function handleVersionConflict(error?: string | null) {
    if (topicSetId) {
      await setTopicSet(topicSetId);
      setVersion(null);
    }
    setFeedback({
      type: "error",
      title: t("topicSet.feedback.versionConflictTitle"),
      message: error ?? t("topicSet.feedback.versionConflictMessage"),
    });
  }

  async function prepareLifecycleWrite() {
    const result = await refreshTopicSetMeta();
    if (!result.ok) {
      setFeedback({
        type: "error",
        title: t("topicSet.feedback.versionConflictTitle"),
        message: result.error ?? t("topicSet.feedback.versionConflictMessage"),
      });
      return null;
    }
    return result.etag ?? topicSetEtag;
  }

  async function handleCreateNewVersion() {
    if (!topicSetId) return;
    const latestEtag = await prepareLifecycleWrite();
    if (!latestEtag) return;
    const result = await createTopicSetVersion(topicSetId, "Create new version from published", latestEtag);
    if (!result.data) {
      if (result.status === VERSION_CONFLICT_STATUS) {
        await handleVersionConflict(result.error);
        return;
      }
      setFeedback({
        type: "error",
        title: t("topicSet.lifecycle.createVersionFailed"),
        message: result.error ?? undefined,
      });
      return;
    }
    await setTopicSet(topicSetId);
    setVersion(null);
    setFeedback({
      type: "success",
      title: t("topicSet.lifecycle.createVersionSuccess", { version: `v${result.data.version}` }),
    });
  }

  async function handleApprove() {
    if (!topicSetId) return;
    const latestEtag = await prepareLifecycleWrite();
    if (!latestEtag) return;
    const result = await approveTopicSet(topicSetId, undefined, latestEtag);
    if (!result.data) {
      if (result.status === VERSION_CONFLICT_STATUS) {
        await handleVersionConflict(result.error);
        return;
      }
      setFeedback({
        type: "error",
        title: t("topicSet.lifecycle.approveFailed"),
        message: result.error ?? undefined,
      });
      return;
    }
    await setTopicSet(topicSetId);
    setVersion(null);
    setFeedback({
      type: "success",
      title: t("topicSet.lifecycle.approved"),
    });
  }

  async function handleReject() {
    if (!topicSetId) return;
    const latestEtag = await prepareLifecycleWrite();
    if (!latestEtag) return;
    const result = await rejectTopicSet(topicSetId, undefined, latestEtag);
    if (!result.data) {
      if (result.status === VERSION_CONFLICT_STATUS) {
        await handleVersionConflict(result.error);
        return;
      }
      setFeedback({
        type: "error",
        title: t("topicSet.lifecycle.rejectFailed"),
        message: result.error ?? undefined,
      });
      return;
    }
    await setTopicSet(topicSetId);
    setVersion(null);
    setFeedback({
      type: "info",
      title: t("topicSet.lifecycle.rejected"),
    });
  }

  async function handleDeprecate() {
    if (!topicSetId) return;
    const latestEtag = await prepareLifecycleWrite();
    if (!latestEtag) return;
    const result = await deprecateTopicSet(topicSetId, undefined, latestEtag);
    if (!result.data) {
      if (result.status === VERSION_CONFLICT_STATUS) {
        await handleVersionConflict(result.error);
        return;
      }
      setFeedback({
        type: "error",
        title: t("topicSet.lifecycle.deprecateFailed"),
        message: result.error ?? undefined,
      });
      return;
    }
    await setTopicSet(topicSetId);
    setVersion(null);
    setFeedback({
      type: "success",
      title: t("topicSet.lifecycle.deprecated"),
    });
  }

  async function handleArchive() {
    if (!topicSetId) return;
    const latestEtag = await prepareLifecycleWrite();
    if (!latestEtag) return;
    const result = await archiveTopicSet(topicSetId, undefined, latestEtag);
    if (!result.data) {
      if (result.status === VERSION_CONFLICT_STATUS) {
        await handleVersionConflict(result.error);
        return;
      }
      setFeedback({
        type: "error",
        title: t("topicSet.lifecycle.archiveFailed"),
        message: result.error ?? undefined,
      });
      return;
    }
    await setTopicSet(topicSetId);
    setVersion(null);
    setFeedback({
      type: "success",
      title: t("topicSet.lifecycle.archived"),
    });
  }

  async function handleRunTagging() {
    if (!topicSetId) return;
    setTaggingLoading(true);
    const result = await createTopicSetTaggingJob(topicSetId);
    setTaggingLoading(false);
    if (!result.data) {
      setFeedback({
        type: "error",
        title: t("topicSet.workspace.runTaggingFailed"),
        message: result.error ?? undefined,
      });
      return;
    }
    router.push(
      `/knowledge/tagging?mode=TOPICSET_ONLY&topicSetId=${encodeURIComponent(
        topicSetId
      )}&jobId=${encodeURIComponent(result.data.jobId)}`
    );
  }

  async function handleCreateInlineNode(nextName?: string) {
    const resolvedName = (nextName ?? createName).trim();
    if (!resolvedName) return;
    setCreateLoading(true);
    const result = await createNode({
      parentId: createParentId ?? null,
      name: resolvedName,
      description: null,
    });
    setCreateLoading(false);
    if (!result.ok) {
      if (result.status === VERSION_CONFLICT_STATUS) {
        await handleVersionConflict(result.error);
        return;
      }
      setFeedback({
        type: "error",
        title: t("topicSet.feedback.createFailed"),
        message: result.error,
      });
      return;
    }
    setCreateName("");
    setCreateParentId(undefined);
  }

  async function handleRenameInlineNode(nextName?: string) {
    const resolvedName = (nextName ?? renamingName).trim();
    if (!renamingNodeId || !resolvedName) return;
    setRenamingLoading(true);
    const result = await renameNode(renamingNodeId, {
      name: resolvedName,
      description: null,
    });
    setRenamingLoading(false);
    if (!result.ok) {
      if (result.status === VERSION_CONFLICT_STATUS) {
        await handleVersionConflict(result.error);
        return;
      }
      setFeedback({
        type: "error",
        title: t("topicSet.feedback.renameFailed"),
        message: result.error,
      });
      return;
    }
    setRenamingNodeId(null);
    setRenamingName("");
  }

  async function openTopicDocs(topicId: string, topicName?: string | null) {
    setTopicDocsOpen(true);
    setTopicDocsLoading(true);
    setTopicDocsError(null);
    setTopicDocsContext({ kind: "topic", topicId });
    setTopicDocsTitle(topicName ?? topicId);
    const result = await fetchGovernanceTopicDocs(topicId, {
      matchMode: "REALTIME",
      page: 0,
      size: 50,
      sortBy: "WEIGHT",
      sortOrder: "DESC",
    });
    setTopicDocsLoading(false);
    if (!result.data) {
      setTopicDocsRows([]);
      setTopicDocsTotal(0);
      setTopicDocsError(result.error ?? t("topicSet.feedback.loadDocsFailed"));
      return;
    }
    setTopicDocsTitle(result.data.topic?.topicName || topicName || topicId);
    setTopicDocsTotal(Number(result.data.total ?? 0));
    setTopicDocsRows(
      (result.data.items ?? []).map((item) => ({
        docId: item.docId,
        title: item.title || item.docId,
        secondary: item.snippet ?? null,
        metric: Number(item.weight ?? 0).toFixed(2),
      }))
    );
    setTopicDocCountMap((prev) => ({
      ...prev,
      [topicId]: Number(result.data?.total ?? 0),
    }));
  }

  async function ensureCompiledTopicGql(topicId: string) {
    const cached = compiledTopicGqlCacheRef.current[topicId];
    if (cached) return cached;
    const draftResult = await fetchTopicDraft(topicId);
    const draftRule = draftResult.data?.rule;
    if (!draftRule) return null;
    const previewResult = await previewTopicRule(topicId, {
      rule: draftRule,
      runtimeEnvironmentId: simulationRuntimeEnvironment?.id ?? undefined,
    });
    const gql = previewResult.data?.gql?.trim();
    if (!gql) return null;
    const mapped = applyRuntimeFieldMappings(gql, simulationRuntimeEnvironment);
    compiledTopicGqlCacheRef.current[topicId] = mapped;
    return mapped;
  }

  async function openSearchDocs(
    title: string,
    query: string,
    mode: "coverage" | "overlap" | "keyword" | "unmapped"
  ) {
    setTopicDocsOpen(true);
    setTopicDocsLoading(true);
    setTopicDocsError(null);
    setTopicDocsContext({ kind: "search", query, mode });
    setTopicDocsTitle(title);
    const result = await searchDocuments({ q: query, page: 1, size: 20 });
    setTopicDocsLoading(false);
    if (!result.data) {
      setTopicDocsRows([]);
      setTopicDocsTotal(0);
      setTopicDocsError(result.error ?? t("topicSet.feedback.loadDocsFailed"));
      return;
    }
    const hits = result.data.hits ?? result.data.items ?? [];
    setTopicDocsTotal(Number(result.data.totalHits ?? result.data.total ?? hits.length));
    setTopicDocsRows(
      hits.map((item) => ({
        docId: item.docId ?? item.id ?? "",
        title: item.title ?? item.docId ?? item.id ?? "-",
        secondary: item.summary ?? item.snippet ?? null,
        metric: item.score != null ? Number(item.score).toFixed(2) : null,
      }))
    );
  }

  async function openDriftCoverageTopic(row: {
    topicId?: string | null;
    topicName?: string | null;
    currentDocs: number;
    previousDocs: number;
    changeRate?: number | null;
  }) {
    if (!row.topicId) {
      setFeedback({ type: "error", title: t("topicSet.feedback.loadDocsFailed"), message: "Missing topic id" });
      return;
    }
    const gql = await ensureCompiledTopicGql(row.topicId);
    if (!gql) {
      setFeedback({ type: "error", title: t("topicSet.feedback.loadDocsFailed"), message: "Failed to compile topic GQL" });
      return;
    }
    await openSearchDocs(row.topicName ?? row.topicId, `{!geelink}${gql}`, "coverage");
  }

  async function openDriftOverlapSearch(row: {
    topicAId: string;
    topicAName?: string | null;
    topicBId: string;
    topicBName?: string | null;
    overlapDocs: number;
  }) {
    const [topicAGql, topicBGql] = await Promise.all([
      ensureCompiledTopicGql(row.topicAId),
      ensureCompiledTopicGql(row.topicBId),
    ]);
    if (!topicAGql || !topicBGql) {
      setFeedback({ type: "error", title: t("topicSet.feedback.loadDocsFailed"), message: "Failed to compile overlap topics" });
      return;
    }
    await openSearchDocs(
      `${row.topicAName ?? row.topicAId} / ${row.topicBName ?? row.topicBId}`,
      `{!geelink}<and>(${topicAGql},${topicBGql})`,
      "overlap"
    );
  }

  async function openDriftUnmappedSearch() {
    const gqlList = (
      await Promise.all(loadedTopicIds.map((topicId) => ensureCompiledTopicGql(topicId)))
    ).filter((item): item is string => Boolean(item));
    const query = gqlList.length > 0 ? `{!geelink}NOT(<or>(${gqlList.join(",")}))` : "*:*";
    await openSearchDocs("Unmapped Documents", query, "unmapped");
  }

  async function openDriftKeywordSearch(keyword: string) {
    await openSearchDocs(keyword, keyword, "keyword");
  }

  async function runDriftAnalysis() {
    if (!topicSetId) return;
    setDriftAnalyzing(true);
    const result = await runTopicSetDriftAnalyze(topicSetId);
    setDriftAnalyzing(false);
    if (!result.data) {
      setFeedback({
        type: "error",
        title: "Drift analysis failed",
        message: result.error ?? "Failed to run drift analysis",
      });
      return;
    }
    setDriftRefreshTick((prev) => prev + 1);
    setFeedback({
      type: "success",
      title: "Drift analysis completed",
      message: result.data.snapshotDate ?? undefined,
    });
  }

  async function openOverlapDocs(row: {
    topicAId: string;
    topicAName?: string | null;
    topicBId: string;
    topicBName?: string | null;
    overlapDocs: number;
    docsPath?: string | null;
    explainPathTemplate?: string | null;
  }) {
    if (!topicSetId) return;
    if (!usePublishedGovernanceApis && !simulationRuntimeReady) {
      setTopicDocsOpen(true);
      setTopicDocsLoading(false);
      setTopicDocsRows([]);
      setTopicDocsTotal(0);
      setTopicDocsError(getSimulationRuntimeMissingMessage());
      return;
    }
    if (!usePublishedGovernanceApis && (!simulationTopicsReady || simulationTopicsPriming)) {
      setTopicDocsOpen(true);
      setTopicDocsLoading(true);
      setTopicDocsRows([]);
      setTopicDocsTotal(0);
      setTopicDocsError(null);
      return;
    }
    setTopicDocsOpen(true);
    setTopicDocsLoading(true);
    setTopicDocsError(null);
    setTopicDocsContext({
      kind: "overlap",
      topicAId: row.topicAId,
      topicAName: row.topicAName,
      topicBId: row.topicBId,
      topicBName: row.topicBName,
    });
    setTopicDocsTitle(`${row.topicAName ?? row.topicAId} / ${row.topicBName ?? row.topicBId}`);
    const result = usePublishedGovernanceApis
      ? row.docsPath
        ? await fetchTopicSetSearchEnvelopeByPath<{
            page: number;
            size: number;
            total: number;
            items: Array<{
              docId: string;
              title?: string | null;
              summary?: string | null;
              highlightFragments?: string[];
            }>;
          }>(row.docsPath)
        : await fetchTopicSetOverlapDocs(topicSetId, {
            topicAId: row.topicAId,
            topicBId: row.topicBId,
            page: 0,
            size: 20,
            sort: "score",
          })
      : await (async () => {
          const simulationDraft = await buildSimulationDraft();
          if (!simulationDraft) return { data: null, error: getSimulationDraftUnavailableMessage() };
          return simulateTopicSetOverlapDocs({
            topicAId: row.topicAId,
            topicBId: row.topicBId,
            page: 0,
            size: 20,
            sort: "score",
            topicSetDraft: simulationDraft,
          });
        })();
    setTopicDocsLoading(false);
    if (!result.data) {
      setTopicDocsRows([]);
      setTopicDocsTotal(0);
      setTopicDocsError(result.error ?? t("topicSet.feedback.loadDocsFailed"));
      return;
    }
    setTopicDocsTotal(Number(result.data.total ?? 0));
    const documents = getOverlapDocuments(result.data);
    setTopicDocsRows(
      documents.map((item) => ({
        docId: getDocumentId(item),
        title: getDocumentTitle(item),
        secondary: item.highlightFragments?.[0] ?? item.summary ?? null,
        metric: null,
      }))
    );
  }

  async function openOverlapExplain(docId: string) {
    if (!topicSetId || topicDocsContext?.kind !== "overlap") return;
    if (!usePublishedGovernanceApis && !simulationRuntimeReady) {
      setOverlapExplainOpen(true);
      setOverlapExplainLoading(false);
      setOverlapExplainData(null);
      setOverlapExplainError(getSimulationRuntimeMissingMessage());
      return;
    }
    if (!usePublishedGovernanceApis && (!simulationTopicsReady || simulationTopicsPriming)) {
      setOverlapExplainOpen(true);
      setOverlapExplainLoading(true);
      setOverlapExplainData(null);
      setOverlapExplainError(null);
      return;
    }
    setOverlapExplainOpen(true);
    setOverlapExplainLoading(true);
    setOverlapExplainError(null);
    const overlapRow = overlapRows.find(
      (row) =>
        row.topicAId === topicDocsContext.topicAId &&
        row.topicBId === topicDocsContext.topicBId
    );
    const explainPath = overlapRow?.explainPathTemplate?.replace("{docId}", encodeURIComponent(docId));
    const result = usePublishedGovernanceApis
      ? explainPath
        ? await fetchTopicSetSearchEnvelopeByPath<{
            version?: number;
            topicSetId: string;
            docId: string;
            topicA: {
              topicId: string;
              topicName: string;
              matched: boolean;
              matchedNodeIds: string[];
              matchedTerms: string[];
              appliedModes?: string[];
              reason?: string | null;
              explain?: Array<{ nodeId?: string | null; label?: string | null; matched: boolean }>;
            };
            topicB: {
              topicId: string;
              topicName: string;
              matched: boolean;
              matchedNodeIds: string[];
              matchedTerms: string[];
              appliedModes?: string[];
              reason?: string | null;
              explain?: Array<{ nodeId?: string | null; label?: string | null; matched: boolean }>;
            };
          }>(explainPath)
        : await fetchTopicSetOverlapDocExplain(topicSetId, {
            docId,
            topicAId: topicDocsContext.topicAId,
            topicBId: topicDocsContext.topicBId,
          })
      : await (async () => {
          const simulationDraft = await buildSimulationDraft();
          if (!simulationDraft) return { data: null, error: getSimulationDraftUnavailableMessage() };
          return simulateTopicSetOverlapExplain(docId, {
            topicAId: topicDocsContext.topicAId,
            topicBId: topicDocsContext.topicBId,
            topicSetDraft: simulationDraft,
          });
        })();
    setOverlapExplainLoading(false);
    if (!result.data) {
      setOverlapExplainData(null);
      setOverlapExplainError(result.error ?? t("topicSet.docs.explainLoadFailed"));
      return;
    }
    setOverlapExplainData({
      docId: result.data.docId,
      topicA: result.data.topicA,
      topicB: result.data.topicB,
    });
  }

  return (
    <div className="space-y-4 p-5">
      <h1 className="text-xl font-semibold">{t("topicSet.workspace.title")}</h1>

      {feedback && (
        <FeedbackBanner
          type={feedback.type}
          title={feedback.title}
          message={feedback.message}
          onDismiss={() => setFeedback(null)}
        />
      )}

      {showSimulationRuntimeWarning && (
        <FeedbackBanner
          type="error"
          title={t("topicSet.simulation.runtimeRequiredTitle")}
          message={t("topicSet.simulation.runtimeRequiredMessage")}
          actions={
            <Link
              href="/runtime"
              className="inline-flex rounded-md border border-current px-3 py-1.5 text-sm font-medium hover:bg-white/40"
            >
              {t("topicSet.simulation.runtimeRequiredAction")}
            </Link>
          }
        />
      )}

      <WorkspaceHeader
        topicSetDetail={topicSetDetail}
        version={version}
        versions={versions}
        editable={editable}
        lifecycleStatus={lifecycleStatus}
        canSubmitReview={canSubmitReview}
        canApprove={canApprove}
        canReject={canReject}
        canPublish={canPublishLifecycle}
        canCreateVersion={canCreateVersion}
        canDeprecate={canDeprecate}
        canArchive={canArchive}
        canRunAi={canEdit}
        taggingLoading={taggingLoading}
        diffSummary={headerDiffSummary}
        diffBaselineVersion={latestPublishedVersion}
        onChangeVersion={setVersion}
        onViewVersions={() => setActiveTab("versions")}
        onViewDiff={() => {
          if (!topicSetDetail?.version || !latestPublishedVersion) return;
          setDiffFromVersion(latestPublishedVersion);
          setDiffToVersion(topicSetDetail.version);
          setActiveTab("diff");
        }}
        onSubmitReview={() =>
          setSubmitReviewDialog({
            open: true,
            comment: "taxonomy update",
            loading: false,
            errorMessage: null,
            validationDetails: null,
          })
        }
        onApprove={() => {
          void handleApprove();
        }}
        onReject={() => {
          void handleReject();
        }}
        onPublish={() => {
          setPublishErrorMessage(null);
          setPublishValidationDetails(null);
          setPublishOpen(true);
        }}
        onCreateVersion={() => {
          void handleCreateNewVersion();
        }}
        onDeprecate={() => {
          void handleDeprecate();
        }}
        onArchive={() => {
          void handleArchive();
        }}
        onRunTagging={() => {
          void handleRunTagging();
        }}
        onGenerateStructure={() => {
          void handleOpenAiStructure();
        }}
        onAutoAssign={() => {
          void handleApplyAiBindings();
        }}
        onAiOptimize={() => {
          void handleRunAiOptimize();
        }}
      />

      <WorkspaceTabs activeTab={activeTab} onChange={setActiveTab} />
      <AIGenerateStructureModal
        open={aiStructureOpen}
        groups={aiStructureGroups}
        applying={aiStructureApplying || aiStructureLoading}
        onClose={() => setAiStructureOpen(false)}
        onApply={() => void handleApplyAiStructure()}
        onCompare={() =>
          setFeedback({
            type: "info",
            title: t("topicSet.ai.compareCurrent"),
            message: t("topicSet.ai.compareCurrentHint"),
          })
        }
      />

      {activeTab === "taxonomy" && (
        <div className="space-y-4">
          <section className="rounded-lg border bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="rounded-md border px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => {
                  if (!canEdit) {
                    setFeedback({
                      type: "info",
                      title: t("topicSet.feedback.readonlyTitle"),
                      message: t("topicSet.feedback.readonlyMessage"),
                    });
                    return;
                  }
                  setCreateParentId(null);
                  setCreateName("");
                }}
              >
                {t("topicSet.workspace.addRootNode")}
              </button>
              <button
                type="button"
                className="rounded-md border border-fuchsia-200 bg-fuchsia-50 px-2 py-1 text-xs text-fuchsia-700 disabled:opacity-50"
                disabled={!canEdit}
                onClick={() => {
                  void handleOpenAiStructure();
                }}
              >
                {t("topicSet.ai.generateStructure")}
              </button>
              <button
                type="button"
                className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-700 disabled:opacity-50"
                disabled={!canEdit || !selectedNode || aiBindingSuggestions.length === 0}
                onClick={() => {
                  void handleApplyAiBindings();
                }}
              >
                {t("topicSet.ai.autoAssign")}
              </button>
              <button
                type="button"
                className="rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-xs text-sky-700 disabled:opacity-50"
                disabled={!canEdit}
                onClick={() => {
                  void handleRunAiOptimize();
                }}
              >
                {t("topicSet.ai.optimize")}
              </button>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="xl:col-span-1">
            <TaxonomyTree
              nodes={nodes}
              nodeMap={nodeMap}
              childrenByParent={childrenByParent}
              rootNodeIds={rootNodeIds}
              selectedNodeId={selectedNode}
              dragDisabled={!canEdit}
              creatingParentId={createParentId}
              creatingName={createName}
              creatingLoading={createLoading}
              renamingNodeId={renamingNodeId}
              renamingName={renamingName}
              renamingLoading={renamingLoading}
              onSelect={selectNode}
              onExpandNode={(nodeId) => {
                void loadChildren(nodeId);
              }}
              onContextMenu={(nodeId, x, y) => {
                if (!canEdit) return;
                setContextMenu({ nodeId, x, y });
              }}
              onOpenImpact={async (nodeId) => {
                selectNode(nodeId);
                setImpactDrawerNodeId(nodeId);
                setImpactDrawerOpen(true);
                await loadNodeTopics(nodeId, true);
              }}
              onPrefetchImpact={(nodeId) => {
                void prefetchImpactForNode(nodeId);
              }}
              maxDocCount={maxDocCount}
              aiSuggestionOpen={aiStructureOpen}
              aiSuggestionGroups={aiStructureGroups}
              aiNodeStateMap={aiNodeStateMap}
              onToggleAiSuggestion={() => {
                void handleOpenAiStructure();
              }}
              onApplyAiSuggestion={() => void handleApplyAiStructure()}
              onCompareAiSuggestion={() => {
                setFeedback({
                  type: "info",
                  title: t("topicSet.ai.compareCurrent"),
                  message: t("topicSet.ai.compareCurrentHint"),
                });
              }}
              onStartCreate={(parentId) => {
                if (!canEdit) return;
                setCreateParentId(parentId);
                setCreateName("");
              }}
              onChangeCreatingName={setCreateName}
              onConfirmCreate={handleCreateInlineNode}
              onCancelCreate={() => {
                setCreateParentId(undefined);
                setCreateName("");
              }}
              onStartRename={(nodeId, currentName) => {
                if (!canEdit) return;
                setRenamingNodeId(nodeId);
                setRenamingName(currentName);
              }}
              onChangeRenamingName={setRenamingName}
              onConfirmRename={handleRenameInlineNode}
              onCancelRename={() => {
                setRenamingNodeId(null);
                setRenamingName("");
              }}
              onMoveByDrag={async ({ sourceNodeId, newParentId, index }) => {
                if (!canEdit) return;
                if (sourceNodeId === newParentId) {
                  setFeedback({
                    type: "error",
                    title: t("topicSet.feedback.invalidMoveTitle"),
                    message: t("topicSet.feedback.invalidMoveMessage"),
                  });
                  return;
                }
                if (isDescendant(childrenByParent, sourceNodeId, newParentId)) {
                  setFeedback({
                    type: "error",
                    title: t("topicSet.feedback.invalidMoveTitle"),
                    message: t("topicSet.feedback.invalidMoveMessage"),
                  });
                  return;
                }
                if (exceedsDepthLimit(sourceNodeId, newParentId)) {
                  setFeedback({
                    type: "error",
                    title: t("topicSet.feedback.invalidMoveTitle"),
                    message: t("topicSet.feedback.depthLimit", { max: MAX_TAXONOMY_DEPTH }),
                  });
                  return;
                }
                const result = await moveNode(sourceNodeId, newParentId, index);
                if (!result.ok) {
                  if (result.status === VERSION_CONFLICT_STATUS) {
                    await handleVersionConflict(result.error);
                    return;
                  }
                  setFeedback({
                    type: "error",
                    title: t("topicSet.feedback.moveFailed"),
                    message: result.error,
                  });
                }
              }}
            />
          </div>

          <div className="xl:col-span-1">
            <NodeDetailPanel
              node={selectedNodeData}
              detail={nodeDetail}
              displayPath={selectedNodeDisplayPath ?? undefined}
              detailLoading={nodeDetailLoading}
              topicsBound={nodeDetail?.topicCount ?? 0}
              coverageDocs={selectedCoverageDocs}
              impactDocs={selectedImpactDocs}
              readOnly={!canEdit}
              description={nodeDetail?.description ?? ""}
              saving={nodeSaving}
              onSave={async ({ name, description }) => {
                if (!selectedNodeData) return;
                setNodeSaving(true);
                const result = await renameNode(selectedNodeData.id, {
                  name,
                  description: description || null,
                });
                setNodeSaving(false);
                if (!result.ok) {
                  if (result.status === VERSION_CONFLICT_STATUS) {
                    await handleVersionConflict(result.error);
                    return;
                  }
                  setFeedback({
                    type: "error",
                    title: t("topicSet.feedback.updateFailed"),
                    message: result.error,
                  });
                  return;
                }
                setNodeDetail((prev) =>
                  prev
                    ? {
                        ...prev,
                        name,
                        description: description || null,
                      }
                    : prev
                );
                setFeedback({ type: "success", title: t("topicSet.feedback.nodeUpdated") });
              }}
              aiAnalysis={selectedNodeAiAnalysis}
              aiActions={selectedNodeAiActions}
              aiSuggestionActions={aiOptimizeSuggestionActions}
            />
          </div>

          <div className="xl:col-span-1">
            <TopicBindingPanel
              readOnly={!canEdit || !selectedNode}
              boundTopics={selectedNodeTopics}
              topicDocCountMap={topicDocCountMap}
              loadingBoundTopics={false}
              onSearch={searchTopic}
              aiRecommendedTopics={aiBindingSuggestions}
              unmappedTopics={aiUnmappedTopics}
              onBindRecommended={handleApplyAiBindings}
              onAutoClassify={handleApplyAiBindings}
              onBind={async (topicId) => {
                if (!selectedNode) return;
                const result = await bindTopic(selectedNode, topicId);
                if (!result.ok) {
                  if (result.status === VERSION_CONFLICT_STATUS) {
                    await handleVersionConflict(result.error);
                    return;
                  }
                  setFeedback({
                    type: "error",
                    title: t("topicSet.feedback.bindFailed"),
                    message: result.error,
                  });
                  return;
                }
                const refreshResult = await refreshRuntimeViews();
                if (!refreshResult.ok) {
                  setFeedback({
                    type: "error",
                    title: t("topicSet.feedback.runtimeRefreshFailed"),
                    message: refreshResult.error,
                  });
                  return;
                }
                await refreshNodeDetail(selectedNode);
              }}
              onUnbind={async (topicId) => {
                if (!selectedNode) return;
                const result = await unbindTopic(selectedNode, topicId);
                if (!result.ok) {
                  if (result.status === VERSION_CONFLICT_STATUS) {
                    await handleVersionConflict(result.error);
                    return;
                  }
                  setFeedback({
                    type: "error",
                    title: t("topicSet.feedback.unbindFailed"),
                    message: result.error,
                  });
                  return;
                }
                const refreshResult = await refreshRuntimeViews();
                if (!refreshResult.ok) {
                  setFeedback({
                    type: "error",
                    title: t("topicSet.feedback.runtimeRefreshFailed"),
                    message: refreshResult.error,
                  });
                  return;
                }
                await refreshNodeDetail(selectedNode);
              }}
              onViewDocuments={async (topic) => {
                await openTopicDocs(topic.topicId, topic.topicName);
              }}
            />
          </div>
          </section>

          <AIInsightPanel
            expanded={aiInsightExpanded}
            summary={aiInsightSummary}
            onToggle={() => setAiInsightExpanded((prev) => !prev)}
            onOptimize={() => {
              void handleRunAiOptimize();
            }}
            onApplyOneByOne={() =>
              setFeedback({
                type: "info",
                title: t("topicSet.ai.applyOneByOne"),
                message: t("topicSet.ai.applyOneByOneHint"),
              })
            }
          />
        </div>
      )}

      {activeTab === "map" && (
        <KnowledgeMapPage
          topicSetName={topicSetDetail?.name}
          nodeMap={nodeMap}
          childrenByParent={childrenByParent}
          rootNodeIds={rootNodeIds}
          selectedNodeId={selectedNode}
          selectedNodeTopics={selectedCoverageTopics}
          topicsByNode={topics}
          topicHitDocsMap={topicHitDocsMap}
          topicDocCountMap={topicDocCountMap}
          coverageByNodeId={coverageByNodeId}
          lowCoverageNodeIds={lowCoverageRows.map((row) => row.nodeId)}
          unmappedTotal={unmappedTotal}
          onSelectNode={(nodeId) => selectNode(nodeId)}
          onOpenTaxonomy={(nodeId) => {
            selectNode(nodeId);
            setActiveTab("taxonomy");
          }}
          onOpenImpact={(nodeId) => {
            selectNode(nodeId);
            setImpactPage(0);
            setActiveTab("impact");
          }}
          onOpenUnmapped={() => setActiveTab("unmapped")}
          onLoadNodeTopics={loadNodeTopics}
        />
      )}

      {topicDocsOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 px-4 py-8">
          <div className="mx-auto w-full max-w-3xl rounded-lg border bg-white shadow-2xl">
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <div className="text-sm font-semibold">{t("topicSet.binding.viewDocs")}</div>
              <div className="truncate text-xs text-muted-foreground">{topicDocsTitle}</div>
              <div className="ml-auto text-xs text-muted-foreground">
                {t("topicSet.binding.docsCount", { count: topicDocsTotal })}
              </div>
              <button
                type="button"
                className="rounded border px-2 py-0.5 text-xs"
                onClick={() => {
                  setTopicDocsOpen(false);
                  setTopicDocsContext(null);
                }}
              >
                {t("common.close")}
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto p-4">
              {topicDocsLoading && <div className="text-sm text-muted-foreground">{t("common.loading")}</div>}
              {topicDocsError && <div className="text-sm text-rose-700">{topicDocsError}</div>}
              {!topicDocsLoading && !topicDocsError && (
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="py-2">{t("topicSet.docs.columnTitle")}</th>
                      <th className="py-2">{t("topicSet.docs.columnTopic")}</th>
                      {topicDocsContext?.kind === "overlap" && (
                        <th className="py-2">{t("topicSet.docs.columnAction")}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {topicDocsRows.map((row) => (
                      <tr key={row.docId} className="border-b">
                        <td className="py-2">
                          <div
                            className="break-words text-sm leading-6"
                            dangerouslySetInnerHTML={{ __html: sanitizeHighlightHtml(row.title) }}
                          />
                          <div className="text-[10px] text-muted-foreground">{row.docId}</div>
                        </td>
                        <td className="py-2">
                          {row.secondary ? (
                            <div
                              className="break-words text-xs leading-6 text-muted-foreground"
                              dangerouslySetInnerHTML={{ __html: sanitizeHighlightHtml(row.secondary) }}
                            />
                          ) : row.metric ? (
                            <div>{row.metric}</div>
                          ) : (
                            <div className="text-xs text-muted-foreground">-</div>
                          )}
                        </td>
                        {topicDocsContext?.kind === "overlap" && (
                          <td className="py-2">
                            <button
                              type="button"
                              className="rounded border px-2 py-1 text-xs"
                              onClick={() => {
                                void openOverlapExplain(row.docId);
                              }}
                            >
                              {t("topicSet.docs.explain")}
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                    {topicDocsRows.length === 0 && (
                      <tr>
                        <td
                          className="py-4 text-muted-foreground"
                          colSpan={topicDocsContext?.kind === "overlap" ? 3 : 2}
                        >
                          {t("topicSet.docs.empty")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {overlapExplainOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 px-4 py-8">
          <div className="mx-auto w-full max-w-4xl rounded-lg border bg-white shadow-2xl">
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <div className="text-sm font-semibold">{t("topicSet.docs.explain")}</div>
              <div className="truncate text-xs text-muted-foreground">{overlapExplainData?.docId}</div>
              <button
                type="button"
                className="ml-auto rounded border px-2 py-0.5 text-xs"
                onClick={() => {
                  setOverlapExplainOpen(false);
                  setOverlapExplainData(null);
                  setOverlapExplainError(null);
                }}
              >
                {t("common.close")}
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto p-4">
              {overlapExplainLoading && <div className="text-sm text-muted-foreground">{t("common.loading")}</div>}
              {overlapExplainError && <div className="text-sm text-rose-700">{overlapExplainError}</div>}
              {!overlapExplainLoading && !overlapExplainError && overlapExplainData && (
                <div className="grid gap-4 md:grid-cols-2">
                  <OverlapExplainCard title="Topic A" item={overlapExplainData.topicA} />
                  <OverlapExplainCard title="Topic B" item={overlapExplainData.topicB} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {impactDrawerOpen && impactDrawerNode && (
        <div className="fixed inset-y-0 right-0 z-50 w-[420px] border-l bg-white shadow-2xl">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <div className="text-sm font-semibold">{t("topicSet.impact.drawerTitle")}</div>
            <button
              type="button"
              className="rounded border px-2 py-0.5 text-xs"
              disabled={impactRuntimeRefreshing}
              onClick={async () => {
                setImpactRuntimeRefreshing(true);
                const result = await refreshRuntimeViews();
                setImpactRuntimeRefreshing(false);
                if (!result.ok) {
                  setFeedback({
                    type: "error",
                    title: t("topicSet.feedback.runtimeRefreshFailed"),
                    message: result.error,
                  });
                  return;
                }
                setFeedback({
                  type: "success",
                  title: t("topicSet.feedback.runtimeRefreshed"),
                });
              }}
            >
              {impactRuntimeRefreshing ? t("common.loading") : t("topicSet.impact.refreshRuntime")}
            </button>
            <button
              type="button"
              className="ml-auto rounded border px-2 py-0.5 text-xs"
              onClick={() => setImpactDrawerOpen(false)}
            >
              {t("common.close")}
            </button>
          </div>
          <div className="space-y-4 p-4 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">{t("topicSet.impact.node")}</div>
              <div className="font-medium">{impactDrawerNode.name}</div>
              <div className="text-xs text-muted-foreground">{impactDrawerNode.path}</div>
            </div>

            <div>
              <div className="mb-2 text-xs text-muted-foreground">{t("topicSet.impact.topTopics")}</div>
              <div className="space-y-1">
                {impactDrawerTopics.length === 0 && (
                  <div className="rounded border border-dashed px-2 py-2 text-xs text-muted-foreground">
                    {t("topicSet.binding.empty")}
                  </div>
                )}
                {impactDrawerTopics.map((topic) => (
                  <div
                    key={topic.topicId}
                    className="flex w-full items-center gap-2 rounded border px-2 py-1.5 text-left text-xs"
                  >
                    <span className="truncate">{topic.topicName ?? topic.topicId}</span>
                    <span className="ml-auto text-muted-foreground">
                      {topic.hitDocs ?? topicDocCountMap[topic.topicId] ?? topicHitDocsMap[topic.topicId] ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs text-muted-foreground">{t("topicSet.impact.documents")}</div>
              {impactDrawerDocsLoading && (
                <div className="text-xs text-muted-foreground">{t("common.loading")}</div>
              )}
              {impactDrawerDocsError && <div className="text-xs text-rose-700">{impactDrawerDocsError}</div>}
              {!impactDrawerDocsLoading && !impactDrawerDocsError && (
                <ul className="max-h-[260px] space-y-1 overflow-auto">
                  {impactDrawerDocs.map((doc) => (
                    <li key={doc.docId} className="rounded border px-2 py-1.5 text-xs">
                      <div className="truncate">{doc.title}</div>
                      <div className="text-[10px] text-muted-foreground">{doc.weight.toFixed(2)}</div>
                    </li>
                  ))}
                  {impactDrawerDocs.length === 0 && (
                    <li className="rounded border border-dashed px-2 py-2 text-xs text-muted-foreground">
                      {t("topicSet.impact.noDocuments")}
                    </li>
                  )}
                </ul>
              )}
            </div>

            <button
              type="button"
              className="w-full rounded-md border px-3 py-1.5 text-xs"
              disabled={!impactDrawerNodeId}
              onClick={() => {
                setActiveTab("impact");
                if (impactDrawerNodeId) {
                  selectNode(impactDrawerNodeId);
                }
                setImpactDrawerOpen(false);
              }}
            >
              {t("topicSet.impact.viewFull")}
            </button>
          </div>
        </div>
      )}

      {activeTab === "impact" && (
        <ImpactPage
          selectedNode={selectedNodeData}
          displayPath={selectedNodeDisplayPath}
          selectedTopics={selectedCoverageTopics}
          loading={impactDocsLoading}
          error={impactDocsError}
          docs={impactDocs}
          page={impactPage}
          size={impactSize}
          total={impactTotal}
          sort={impactSort}
          onOpenTopicDocs={(topicId, topicName) => {
            void openTopicDocs(topicId, topicName);
          }}
          onPageChange={setImpactPage}
          onSizeChange={(next) => {
            setImpactSize(next);
            setImpactPage(0);
          }}
          onSortChange={(next) => {
            setImpactSort(next);
            setImpactPage(0);
          }}
        />
      )}

      {activeTab === "drift" && (
        <DriftWorkspace
          topicSetName={topicSetDetail?.name}
          datasetName={simulationRuntimeEnvironment?.datasetName ?? null}
          lastAnalysis={driftLastAnalysis}
          health={driftHealth}
          liveSummary={
            driftSummary
              ? {
                  totalDocs: driftSummary.totalDocs,
                  classifiedDocs: driftSummary.classifiedDocs,
                  unmappedDocs: driftSummary.unmappedDocs,
                  coverageRatio: driftSummary.coverageRatio,
                  overlapCount: driftSummary.overlapCount,
                }
              : coverageDashboard
              ? {
                  classifiedDocs: coverageDashboard.classifiedDocs,
                  unmappedDocs: coverageDashboard.unmappedDocs,
                  coverageRatio:
                    coverageDashboard.classifiedDocs + coverageDashboard.unmappedDocs > 0
                      ? coverageDashboard.classifiedDocs /
                        (coverageDashboard.classifiedDocs + coverageDashboard.unmappedDocs)
                      : 0,
                  overlapCount: overlapRows.length,
                }
              : null
          }
          coverageRows={driftCoverageRows}
          overlapRows={driftOverlapRows}
          unmappedTotal={driftUnmappedTotal || driftSummary?.unmappedDocs || 0}
          keywords={driftKeywords}
          impactRows={driftImpactRows}
          suggestionRows={driftSuggestionRows}
          history={driftHistory}
          analyzing={driftAnalyzing}
          onAnalyze={() => {
            void runDriftAnalysis();
          }}
          onOpenCoverageTopic={(row) => {
            void openDriftCoverageTopic(row);
          }}
          onOpenOverlap={(row) => {
            void openDriftOverlapSearch(row);
          }}
          onOpenUnmapped={() => {
            void openDriftUnmappedSearch();
          }}
          onOpenKeyword={(keyword) => {
            void openDriftKeywordSearch(keyword);
          }}
        />
      )}

      {activeTab === "coverage" && (
        <CoveragePage
          dashboard={coverageDashboard}
          rows={coverageRows}
          selectedRow={selectedCoverageRow}
          selectedTopics={selectedCoverageTopics}
          selectedPath={selectedNodeDisplayPath}
          selectedTopicsLoading={selectedNodeDistributionLoading}
          selectedTopicsError={selectedNodeDistributionError}
          lowCoverageRows={lowCoverageRows}
          lowCoverageThreshold={LOW_COVERAGE_THRESHOLD}
          overlapRows={overlapRows}
          dedup={coverageDedup}
          onToggleDedup={(next) => setCoverageDedup(next)}
          onOpenTopicDocs={(topicId, topicName) => {
            void openTopicDocs(topicId, topicName);
          }}
          onOpenNode={(nodeId) => {
            selectNode(nodeId);
            setActiveTab("taxonomy");
          }}
          onViewOverlapDocs={(row) => {
            void openOverlapDocs(row);
          }}
          onOpenImpact={() => {
            setImpactPage(0);
            setActiveTab("impact");
          }}
          onSelect={(row) => {
            const node = row.nodeId ? flatNodes.find((item) => item.id === row.nodeId) : null;
            if (!node) return;
            selectNode(node.id);
          }}
        />
      )}

      {activeTab === "unmapped" && (
        <UnmappedPage
          dashboard={unmappedDashboard}
          total={unmappedTotal}
          docs={unmappedDocs}
          page={unmappedPage}
          size={unmappedSize}
          sort={unmappedSort}
          onPageChange={setUnmappedPage}
          onSizeChange={(next) => {
            setUnmappedSize(next);
            setUnmappedPage(0);
          }}
          onSortChange={(next) => {
            setUnmappedSort(next);
            setUnmappedPage(0);
          }}
          onViewDocument={(docId) =>
            setFeedback({ type: "info", title: t("topicSet.unmapped.viewing"), message: docId })
          }
          onBindTopic={(docId) =>
            setFeedback({ type: "info", title: t("topicSet.unmapped.binding"), message: docId })
          }
          onIgnore={(docId) =>
            setFeedback({ type: "info", title: t("topicSet.unmapped.ignored"), message: docId })
          }
        />
      )}

      {activeTab === "versions" && (
        <VersionsPage
          currentVersion={topicSetDetail?.version ?? null}
          selectedVersion={version}
          versions={versions}
          onView={(v) => setVersion(v)}
          onCompare={(v) => {
            const current = topicSetDetail?.version ?? null;
            if (current == null) {
              setFeedback({
                type: "error",
                title: t("topicSet.diff.loadFailed"),
              });
              return;
            }
            setDiffFromVersion(v);
            setDiffToVersion(current);
            setActiveTab("diff");
          }}
          onRestore={(v) => {
            setVersionActionComment("");
            setVersionActionDialog({ mode: "restore", version: v });
          }}
          onRollback={(v) => {
            setVersionActionComment("");
            setVersionActionDialog({ mode: "rollback", version: v });
          }}
        />
      )}

      {activeTab === "diff" && topicSetId && (
        <TaxonomyDiffPage
          topicSetId={topicSetId}
          fromVersion={diffFromVersion}
          toVersion={diffToVersion}
          currentVersion={topicSetDetail?.version ?? null}
        />
      )}

      {contextMenu && (
        <div
          className="fixed z-40 w-44 rounded-md border bg-white py-1 shadow-lg"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            type="button"
            className="block w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
            onClick={() => {
              setCreateParentId(contextMenu.nodeId);
              setCreateName("");
              setContextMenu(null);
            }}
          >
            {t("topicSet.menu.addChild")}
          </button>
          <button
            type="button"
            className="block w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
            onClick={() => {
              const node = findNodeById(contextMenu.nodeId);
              if (!node || !canEdit) return;
              setRenamingNodeId(node.id);
              setRenamingName(node.name);
              setContextMenu(null);
            }}
          >
            {t("topicSet.menu.rename")}
          </button>
          <button
            type="button"
            className="block w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
            onClick={() => {
              setMoveSourceNodeId(contextMenu.nodeId);
              setMoveParentId(null);
              setMoveOpen(true);
              setContextMenu(null);
            }}
          >
            {t("topicSet.menu.move")}
          </button>
          <button
            type="button"
            className="block w-full px-3 py-1.5 text-left text-sm text-rose-700 hover:bg-rose-50"
            onClick={() => {
              const node = findNodeById(contextMenu.nodeId);
              if (!node || !canEdit) return;
              setDeleteDialog({
                nodeId: node.id,
                nodeName: node.name,
                hasChildren: (childrenByParent[node.id]?.length ?? 0) > 0,
              });
              setContextMenu(null);
            }}
          >
            {t("topicSet.menu.delete")}
          </button>
        </div>
      )}

      {moveOpen && normalizedMoveSourceNode && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-[520px] rounded-lg bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold">{t("topicSet.move.title")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("topicSet.move.node")}: {normalizedMoveSourceNode.path}
            </p>
            <div className="mt-4">
              <label className="text-sm">{t("topicSet.move.newParent")}</label>
              <select
                className="mt-1 h-9 w-full rounded-md border bg-white px-2 text-sm"
                value={moveParentId ?? ""}
                onChange={(event) => setMoveParentId(event.target.value || null)}
              >
                <option value="">{t("topicSet.move.selectParent")}</option>
                {flatNodes
                  .filter((node) => {
                    if (node.id === normalizedMoveSourceNode.id) return false;
                    if (isDescendant(childrenByParent, normalizedMoveSourceNode.id, node.id)) return false;
                    return true;
                  })
                  .map((node) => (
                    <option key={node.id} value={node.id}>
                      {node.path}
                    </option>
                  ))}
              </select>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="rounded-md border px-3 py-1.5 text-sm" onClick={() => setMoveOpen(false)}>
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="rounded-md bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50"
                disabled={!moveParentId || moveLoading || moveDepthInvalid}
                onClick={async () => {
                  if (!moveSourceNodeId || !moveParentId) return;
                  if (exceedsDepthLimit(moveSourceNodeId, moveParentId)) {
                    setFeedback({
                      type: "error",
                      title: t("topicSet.feedback.invalidMoveTitle"),
                      message: t("topicSet.feedback.depthLimit", { max: MAX_TAXONOMY_DEPTH }),
                    });
                    return;
                  }
                  setMoveLoading(true);
                  const result = await moveNode(moveSourceNodeId, moveParentId, null);
                  setMoveLoading(false);
                  if (!result.ok) {
                    if (result.status === VERSION_CONFLICT_STATUS) {
                      await handleVersionConflict(result.error);
                      setMoveOpen(false);
                      return;
                    }
                    setFeedback({
                      type: "error",
                      title: t("topicSet.feedback.moveFailed"),
                      message: result.error,
                    });
                    return;
                  }
                  setMoveOpen(false);
                }}
              >
                {t("topicSet.menu.move")}
              </button>
            </div>
            {moveDepthInvalid && (
              <div className="mt-2 text-xs text-rose-700">
                {t("topicSet.feedback.depthLimit", { max: MAX_TAXONOMY_DEPTH })}
              </div>
            )}
          </div>
        </div>
      )}

      {deleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[520px] rounded-lg bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold">{t("topicSet.delete.title")}</h3>
            <p className="mt-2 text-sm text-slate-700">
              {t("topicSet.delete.message")} <span className="font-medium">{deleteDialog.nodeName}</span>
            </p>
            {deleteDialog.hasChildren && (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {t("topicSet.delete.warning")}
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border px-3 py-1.5 text-sm"
                onClick={() => setDeleteDialog(null)}
                disabled={deleteLoading}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="rounded-md bg-rose-700 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                disabled={deleteLoading}
                onClick={async () => {
                  setDeleteLoading(true);
                  const result = await deleteNode(deleteDialog.nodeId);
                  setDeleteLoading(false);
                  if (!result.ok) {
                    if (result.status === VERSION_CONFLICT_STATUS) {
                      await handleVersionConflict(result.error);
                      setDeleteDialog(null);
                      return;
                    }
                    setFeedback({
                      type: "error",
                      title: t("topicSet.feedback.deleteFailed"),
                      message: result.error,
                    });
                    return;
                  }
                  setDeleteDialog(null);
                }}
              >
                {deleteLoading ? t("topicSet.delete.deleting") : t("topicSet.menu.delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {submitReviewDialog && topicSetDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[560px] rounded-lg bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold">{t("topicSet.lifecycle.submitTitle")}</h3>
            <div className="mt-4 rounded-lg border bg-slate-50 p-3 text-sm">
              <div className="font-medium">{t("topicSet.publish.changes")}</div>
              <div className="mt-2 space-y-1 text-xs">
                {lifecycleChanges.added.map((item) => (
                  <div key={`submit-added-${item.nodeId}`}>+ {t("topicSet.diff.summary.added")}: {item.newName ?? item.name ?? item.newPath ?? item.nodeId}</div>
                ))}
                {lifecycleChanges.updated.map((item) => (
                  <div key={`submit-updated-${item.nodeId}`}>~ {t("topicSet.diff.summary.updated")}: {(item.oldName ?? item.name ?? item.oldPath ?? item.nodeId)} -&gt; {(item.newName ?? item.name ?? item.newPath ?? item.nodeId)}</div>
                ))}
                {lifecycleChanges.removed.map((item) => (
                  <div key={`submit-removed-${item.nodeId}`}>- {t("topicSet.diff.summary.removed")}: {item.oldName ?? item.name ?? item.oldPath ?? item.nodeId}</div>
                ))}
                {lifecycleChanges.added.length === 0 &&
                  lifecycleChanges.updated.length === 0 &&
                  lifecycleChanges.removed.length === 0 && (
                    <div className="text-muted-foreground">{t("topicSet.lifecycle.noChanges")}</div>
                  )}
              </div>
            </div>
            <label className="mt-4 block text-sm font-medium">{t("topicSet.publish.comment")}</label>
            <textarea
              className="mt-2 h-24 w-full rounded-md border px-3 py-2 text-sm"
              value={submitReviewDialog.comment}
              onChange={(event) =>
                setSubmitReviewDialog((prev) => (prev ? { ...prev, comment: event.target.value } : prev))
              }
              placeholder={t("topicSet.publish.placeholder")}
            />
            {submitReviewDialog.errorMessage && (
              <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {submitReviewDialog.errorMessage}
              </div>
            )}
            <LifecycleValidationPanel details={submitReviewDialog.validationDetails} />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border px-3 py-1.5 text-sm"
                onClick={() => setSubmitReviewDialog(null)}
                disabled={submitReviewDialog.loading}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="rounded-md bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50"
                disabled={submitReviewDialog.loading}
                onClick={async () => {
                  if (!topicSetId) return;
                  const latestEtag = await prepareLifecycleWrite();
                  if (!latestEtag) return;
                  setSubmitReviewDialog((prev) =>
                    prev
                      ? {
                          ...prev,
                          loading: true,
                          errorMessage: null,
                          validationDetails: null,
                        }
                      : prev
                  );
                  const result = await submitTopicSetReview(
                    topicSetId,
                    submitReviewDialog.comment.trim(),
                    latestEtag
                  );
                  if (!result.data) {
                    if (result.status === VERSION_CONFLICT_STATUS) {
                      await handleVersionConflict(result.error);
                      setSubmitReviewDialog(null);
                      return;
                    }
                    setSubmitReviewDialog((prev) =>
                      prev
                        ? {
                            ...prev,
                            loading: false,
                            errorMessage: result.error ?? t("topicSet.lifecycle.submitFailed"),
                            validationDetails: result.errorDetails ?? null,
                          }
                        : prev
                    );
                    return;
                  }
                  await setTopicSet(topicSetId);
                  setVersion(null);
                  setSubmitReviewDialog(null);
                  setFeedback({
                    type: "success",
                    title: t("topicSet.lifecycle.submitted"),
                  });
                }}
              >
                {submitReviewDialog.loading ? t("common.loading") : t("topicSet.workspace.submitReview")}
              </button>
            </div>
          </div>
        </div>
      )}

      <PublishDialog
        open={publishOpen}
        versionLabel={
          !topicSetDetail
            ? "-"
            : version == null || version === topicSetDetail.version
            ? `${t("topicSet.version.draft")} v${topicSetDetail.version}`
            : `${t("topicSet.version.published")} v${version}`
        }
        loading={publishLoading}
        diffLoading={publishDiffLoading}
        diffSummary={publishDiffSummary}
        errorMessage={publishErrorMessage}
        validationDetails={publishValidationDetails}
        onClose={() => {
          setPublishOpen(false);
          setPublishErrorMessage(null);
          setPublishValidationDetails(null);
        }}
        onPublish={async (comment) => {
          setPublishLoading(true);
          setPublishErrorMessage(null);
          setPublishValidationDetails(null);
          const result = await publish(comment);
          setPublishLoading(false);
          if (!result.ok) {
            if (result.status === VERSION_CONFLICT_STATUS) {
              setPublishOpen(false);
              await handleVersionConflict(result.error);
              return;
            }
            setPublishErrorMessage(result.error ?? t("topicSet.feedback.publishFailed"));
            setPublishValidationDetails(result.errorDetails ?? null);
            return;
          }
          if (topicSetId) {
            await refreshTopicSetRuntimeCache(topicSetId);
          }
          setPublishOpen(false);
          setFeedback({
            type: "success",
            title: `${t("topicSet.feedback.published")} v${result.version ?? "-"}`,
          });
        }}
      />

      {versionActionDialog && topicSetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[520px] rounded-lg bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold">
              {versionActionDialog.mode === "restore"
                ? t("topicSet.versions.restoreTitle")
                : t("topicSet.versions.rollbackTitle")}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {versionActionDialog.mode === "restore"
                ? t("topicSet.versions.restoreMessage", { version: `v${versionActionDialog.version}` })
                : t("topicSet.versions.rollbackMessage", { version: `v${versionActionDialog.version}` })}
            </p>
            <label className="mt-4 block text-sm font-medium">{t("topicSet.publish.comment")}</label>
            <textarea
              className="mt-2 h-24 w-full rounded-md border px-3 py-2 text-sm"
              value={versionActionComment}
              onChange={(event) => setVersionActionComment(event.target.value)}
              placeholder={t("topicSet.publish.placeholder")}
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border px-3 py-1.5 text-sm"
                onClick={() => setVersionActionDialog(null)}
                disabled={versionActionLoading}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="rounded-md bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50"
                disabled={versionActionLoading}
                onClick={async () => {
                  const latestEtag = await prepareLifecycleWrite();
                  if (!latestEtag) return;
                  setVersionActionLoading(true);
                  const result =
                    versionActionDialog.mode === "restore"
                      ? await restoreTopicSetVersionAsDraft(topicSetId, versionActionDialog.version, {
                          comment: versionActionComment || null,
                        }, latestEtag)
                      : await rollbackTopicSetVersion(topicSetId, versionActionDialog.version, {
                          comment: versionActionComment || null,
                        }, latestEtag);
                  setVersionActionLoading(false);
                  if (!result.data) {
                    if (result.status === VERSION_CONFLICT_STATUS) {
                      await handleVersionConflict(result.error);
                      setVersionActionDialog(null);
                      return;
                    }
                    setFeedback({
                      type: "error",
                      title:
                        versionActionDialog.mode === "restore"
                          ? t("topicSet.versions.restoreFailed")
                          : t("topicSet.versions.rollbackFailed"),
                      message: result.error ?? undefined,
                    });
                    return;
                  }
                  await setTopicSet(topicSetId);
                  setVersion(null);
                  setVersionActionDialog(null);
                  setFeedback({
                    type: "success",
                    title:
                      versionActionDialog.mode === "restore"
                        ? t("topicSet.versions.restoreSuccess", { version: `v${versionActionDialog.version}` })
                        : t("topicSet.versions.rollbackSuccess", { version: `v${versionActionDialog.version}` }),
                  });
                }}
              >
                {versionActionLoading
                  ? t("common.loading")
                  : versionActionDialog.mode === "restore"
                  ? t("topicSet.versions.restore")
                  : t("topicSet.versions.rollback")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
