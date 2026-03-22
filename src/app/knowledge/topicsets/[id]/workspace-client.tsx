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
      />

      <WorkspaceTabs activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === "taxonomy" && (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="xl:col-span-1">
            <div className="mb-2 flex items-center gap-2">
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
            </div>
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
            />
          </div>

          <div className="xl:col-span-1">
            <TopicBindingPanel
              readOnly={!canEdit || !selectedNode}
              boundTopics={selectedNodeTopics}
              topicDocCountMap={topicDocCountMap}
              loadingBoundTopics={false}
              onSearch={searchTopic}
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
