"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { fetchGovernanceTopicDocs } from "@/lib/governance-topic-detail-api";
import { fetchCoverageTopics } from "@/lib/governance-coverage-api";
import {
  fetchTopicSetCoverage,
  fetchTopicSetNodeImpact,
  fetchTopicSetUnmapped,
  refreshTopicSetRuntimeCache,
} from "@/lib/topicset-search-api";
import { NodeTopicView, TopicSetNode, TopicSetNodeDetail, getTopicSetNodeDetail } from "@/lib/topicset-api";
import { useTopicSetStore } from "@/store/topicsetStore";
import { t } from "@/i18n";
import { NodeDetailPanel } from "../components/node-detail-panel";
import { PublishDialog } from "../components/publish-dialog";
import { TaxonomyTree } from "../components/taxonomy-tree";
import { TopicBindingPanel } from "../components/topic-binding-panel";
import { WorkspaceHeader } from "./components/workspace-header";
import { TopicSetWorkspaceTab, WorkspaceTabs } from "./components/workspace-tabs";
import { ImpactPage } from "./components/impact/impact-page";
import { CoveragePage } from "./components/coverage/coverage-page";
import { UnmappedPage } from "./components/unmapped/unmapped-page";
import { VersionsPage } from "./components/versions/versions-page";
import { TaxonomyDiffPage } from "./components/diff/taxonomy-diff-page";

type FeedbackState = {
  type: "error" | "success" | "info";
  title: string;
  message?: string;
} | null;

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

const MAX_TAXONOMY_DEPTH = 6;

export function TopicSetWorkspaceClient({
  initialTopicSetId,
}: {
  initialTopicSetId: string;
}) {
  const {
    topicSetId,
    topicSetDetail,
    nodes,
    nodeMap,
    childrenByParent,
    rootNodeIds,
    selectedNode,
    topics,
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
    searchTopic,
    findNodeById,
  } = useTopicSetStore();

  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [activeTab, setActiveTab] = useState<TopicSetWorkspaceTab>("taxonomy");
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
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

  const [coverageRows, setCoverageRows] = useState<Array<{ nodeId?: string; name: string; hitDocs: number }>>([]);
  const [coverageDedup, setCoverageDedup] = useState(false);
  const [unmappedTotal, setUnmappedTotal] = useState(0);
  const [unmappedDocs, setUnmappedDocs] = useState<Array<{ docId: string; title?: string | null }>>([]);
  const [unmappedPage, setUnmappedPage] = useState(0);
  const [unmappedSize, setUnmappedSize] = useState(20);
  const [unmappedSort, setUnmappedSort] = useState<"score" | "updatedAt" | "publishedAt">("score");

  const [impactDocsLoading, setImpactDocsLoading] = useState(false);
  const [impactDocsError, setImpactDocsError] = useState<string | null>(null);
  const [impactDocs, setImpactDocs] = useState<Array<{ docId: string; title: string; summary?: string | null }>>([]);
  const [impactPage, setImpactPage] = useState(0);
  const [impactSize, setImpactSize] = useState(20);
  const [impactSort, setImpactSort] = useState<"score" | "updatedAt" | "publishedAt">("score");
  const [impactTotal, setImpactTotal] = useState(0);
  const [topicHitDocsMap, setTopicHitDocsMap] = useState<Record<string, number>>({});
  const [topicDocCountMap, setTopicDocCountMap] = useState<Record<string, number>>({});
  const [topicDocsOpen, setTopicDocsOpen] = useState(false);
  const [topicDocsLoading, setTopicDocsLoading] = useState(false);
  const [topicDocsError, setTopicDocsError] = useState<string | null>(null);
  const [topicDocsTitle, setTopicDocsTitle] = useState("");
  const [topicDocsTotal, setTopicDocsTotal] = useState(0);
  const [topicDocsRows, setTopicDocsRows] = useState<Array<{ docId: string; title: string; weight: number }>>([]);
  const [impactDrawerOpen, setImpactDrawerOpen] = useState(false);
  const [impactDrawerNodeId, setImpactDrawerNodeId] = useState<string | null>(null);
  const [impactDrawerDocsLoading, setImpactDrawerDocsLoading] = useState(false);
  const [impactDrawerDocsError, setImpactDrawerDocsError] = useState<string | null>(null);
  const [impactDrawerDocs, setImpactDrawerDocs] = useState<Array<{ docId: string; title: string; weight: number }>>([]);
  const [impactDrawerDocsCache, setImpactDrawerDocsCache] = useState<
    Record<string, Array<{ docId: string; title: string; weight: number }>>
  >({});
  const [nodeDetail, setNodeDetail] = useState<TopicSetNodeDetail | null>(null);
  const [nodeDetailLoading, setNodeDetailLoading] = useState(false);
  const [diffFromVersion, setDiffFromVersion] = useState<number | null>(null);
  const [diffToVersion, setDiffToVersion] = useState<number | null>(null);

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

  useEffect(() => {
    if (!selectedNode) return;
    loadNodeTopics(selectedNode);
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
  const selectedNodeTopics = selectedNode ? topics[selectedNode] ?? [] : [];
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
  const impactDrawerTopics = useMemo(() => {
    if (!impactDrawerNodeId) return [];
    const current = topics[impactDrawerNodeId] ?? [];
    return [...current].sort((a, b) => {
      const ah = topicHitDocsMap[a.topicId] ?? 0;
      const bh = topicHitDocsMap[b.topicId] ?? 0;
      return bh - ah;
    });
  }, [impactDrawerNodeId, topicHitDocsMap, topics]);
  const flatNodes = useMemo(
    () => Object.values(nodeMap).sort((a, b) => a.path.localeCompare(b.path)),
    [nodeMap]
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
  const canEdit = Boolean(topicSetDetail) && editable;
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
  const selectedTopicIdsKey = useMemo(
    () => selectedNodeTopics.map((item) => item.topicId).sort().join("|"),
    [selectedNodeTopics]
  );

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

  useEffect(() => {
    let cancelled = false;
    async function loadCoverage() {
      if (!topicSetId) return;
      const [coverageResult, unmappedResult, topicsResult] = await Promise.all([
        fetchTopicSetCoverage(topicSetId, { dedup: coverageDedup }),
        fetchTopicSetUnmapped(topicSetId, { page: unmappedPage, size: unmappedSize, sort: unmappedSort }),
        fetchCoverageTopics(),
      ]);
      if (cancelled) return;

      const coverageNodes = coverageResult.data?.nodes ?? [];
      const rows = coverageNodes
        .map((item) => ({
          nodeId: item.nodeId,
          name: item.name || item.nodeId,
          hitDocs: Number(item.docCount ?? 0),
        }))
        .sort((a, b) => b.hitDocs - a.hitDocs);
      setCoverageRows(rows);

      const unmappedItems = unmappedResult.data?.items ?? [];
      setUnmappedTotal(Number(unmappedResult.data?.total ?? unmappedItems.length));
      setUnmappedDocs(
        unmappedItems.map((item) => ({
          docId: item.docId,
          title: item.title ?? null,
        }))
      );

      if (topicsResult.data) {
        const nextTopicHits: Record<string, number> = {};
        for (const item of topicsResult.data.topics ?? []) {
          nextTopicHits[item.topicId] = item.hitDocs ?? 0;
        }
        setTopicHitDocsMap(nextTopicHits);
      }
    }
    void loadCoverage();
    return () => {
      cancelled = true;
    };
  }, [coverageDedup, topicSetId, unmappedPage, unmappedSize, unmappedSort]);

  useEffect(() => {
    let cancelled = false;
    async function loadBoundTopicCounts() {
      if (!selectedNode || selectedNodeTopics.length === 0) {
        setTopicDocCountMap({});
        return;
      }
      const entries = await Promise.all(
        selectedNodeTopics.map(async (topic) => {
          const result = await fetchGovernanceTopicDocs(topic.topicId, {
            page: 0,
            size: 1,
            sortBy: "WEIGHT",
            sortOrder: "DESC",
          });
          return [topic.topicId, Number(result.data?.total ?? 0)] as const;
        })
      );
      if (cancelled) return;
      const nextMap: Record<string, number> = {};
      for (const [topicId, total] of entries) {
        nextMap[topicId] = total;
      }
      setTopicDocCountMap(nextMap);
    }
    void loadBoundTopicCounts();
    return () => {
      cancelled = true;
    };
  }, [selectedNode, selectedTopicIdsKey, selectedNodeTopics]);

  useEffect(() => {
    let cancelled = false;
    async function loadImpactDocs() {
      if (!topicSetId || !selectedNode) {
        setImpactDocs([]);
        setImpactDocsError(null);
        return;
      }
      setImpactDocsLoading(true);
      setImpactDocsError(null);
      const result = await fetchTopicSetNodeImpact(topicSetId, selectedNode, {
        page: impactPage,
        size: impactSize,
        sort: impactSort,
      });
      if (cancelled) return;
      setImpactDocsLoading(false);
      if (!result.data) {
        setImpactDocsError(result.error ?? t("topicSet.feedback.loadDocsFailed"));
        return;
      }
      setImpactDocs(
        (result.data.items ?? []).map((item) => ({
          docId: item.docId,
          title: item.title ?? item.docId,
          summary: item.summary ?? null,
        }))
      );
      setImpactTotal(Number(result.data.total ?? 0));
    }
    void loadImpactDocs();
    return () => {
      cancelled = true;
    };
  }, [impactPage, impactSize, impactSort, selectedNode, topicSetId]);

  const prefetchImpactForNode = useCallback(
    async (nodeId: string) => {
      if (!topicSetId) return;
      await loadNodeTopics(nodeId, true);
      if (impactDrawerDocsCache[nodeId]) return;
      const result = await fetchTopicSetNodeImpact(topicSetId, nodeId, {
        page: 0,
        size: 12,
        sort: "score",
      });
      if (!result.data) return;
      setImpactDrawerDocsCache((prev) => ({
        ...prev,
        [nodeId]: (result.data?.items ?? []).map((item) => ({
          docId: item.docId,
          title: item.title ?? item.docId,
          weight: 0,
        })),
      }));
    },
    [impactDrawerDocsCache, loadNodeTopics, topicSetId]
  );

  useEffect(() => {
    let cancelled = false;
    async function loadDrawerDocs() {
      if (!impactDrawerOpen || !impactDrawerNodeId || !topicSetId) {
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
      const result = await fetchTopicSetNodeImpact(topicSetId, impactDrawerNodeId, {
        page: 0,
        size: 12,
        sort: "score",
      });
      if (cancelled) return;
      setImpactDrawerDocsLoading(false);
      if (!result.data) {
        setImpactDrawerDocsError(result.error ?? t("topicSet.feedback.loadDocsFailed"));
        return;
      }
      setImpactDrawerDocs(
        (result.data.items ?? []).map((item) => ({
          docId: item.docId,
          title: item.title ?? item.docId,
          weight: 0,
        }))
      );
      setImpactDrawerDocsCache((prev) => ({
        ...prev,
        [impactDrawerNodeId]: (result.data?.items ?? []).map((item) => ({
          docId: item.docId,
          title: item.title ?? item.docId,
          weight: 0,
        })),
      }));
    }
    void loadDrawerDocs();
    return () => {
      cancelled = true;
    };
  }, [impactDrawerDocsCache, impactDrawerNodeId, impactDrawerOpen, topicSetId]);

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

      <WorkspaceHeader
        topicSetDetail={topicSetDetail}
        version={version}
        versions={versions}
        editable={editable}
        onChangeVersion={setVersion}
        onPublish={() => setPublishOpen(true)}
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
              onContextMenu={(nodeId, x, y) => setContextMenu({ nodeId, x, y })}
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
                  setFeedback({
                    type: "error",
                    title: t("topicSet.feedback.bindFailed"),
                    message: result.error,
                  });
                  return;
                }
                await refreshNodeDetail(selectedNode);
              }}
              onUnbind={async (topicId) => {
                if (!selectedNode) return;
                const result = await unbindTopic(selectedNode, topicId);
                if (!result.ok) {
                  setFeedback({
                    type: "error",
                    title: t("topicSet.feedback.unbindFailed"),
                    message: result.error,
                  });
                  return;
                }
                await refreshNodeDetail(selectedNode);
              }}
              onViewDocuments={async (topic) => {
                setTopicDocsOpen(true);
                setTopicDocsLoading(true);
                setTopicDocsError(null);
                setTopicDocsTitle(topic.topicName ?? topic.topicId);
                const result = await fetchGovernanceTopicDocs(topic.topicId, {
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
                setTopicDocsTitle(result.data.topic?.topicName || topic.topicName || topic.topicId);
                setTopicDocsTotal(Number(result.data.total ?? 0));
                setTopicDocsRows(
                  (result.data.items ?? []).map((item) => ({
                    docId: item.docId,
                    title: item.title || item.docId,
                    weight: Number(item.weight ?? 0),
                  }))
                );
                setTopicDocCountMap((prev) => ({
                  ...prev,
                  [topic.topicId]: Number(result.data?.total ?? 0),
                }));
              }}
            />
          </div>
        </section>
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
                onClick={() => setTopicDocsOpen(false)}
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
                      <th className="py-2">{t("topicSet.impact.score")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topicDocsRows.map((row) => (
                      <tr key={row.docId} className="border-b">
                        <td className="py-2">{row.title}</td>
                        <td className="py-2">{row.weight.toFixed(2)}</td>
                      </tr>
                    ))}
                    {topicDocsRows.length === 0 && (
                      <tr>
                        <td className="py-4 text-muted-foreground" colSpan={2}>
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

      {impactDrawerOpen && impactDrawerNode && (
        <div className="fixed inset-y-0 right-0 z-50 w-[420px] border-l bg-white shadow-2xl">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <div className="text-sm font-semibold">{t("topicSet.impact.drawerTitle")}</div>
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
                      {topicHitDocsMap[topic.topicId] ?? 0}
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
          loading={impactDocsLoading}
          error={impactDocsError}
          docs={impactDocs}
          page={impactPage}
          size={impactSize}
          total={impactTotal}
          sort={impactSort}
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

      {activeTab === "coverage" && (
        <CoveragePage
          rows={coverageRows}
          dedup={coverageDedup}
          onToggleDedup={(next) => setCoverageDedup(next)}
          onSelect={(row) => {
            const node = row.nodeId ? flatNodes.find((item) => item.id === row.nodeId) : null;
            if (!node) return;
            selectNode(node.id);
            setImpactPage(0);
            setActiveTab("impact");
          }}
        />
      )}

      {activeTab === "unmapped" && (
        <UnmappedPage
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
          onRollback={(v) => {
            setFeedback({
              type: "info",
              title: t("topicSet.versions.rollback"),
              message: `${t("topicSet.versions.rollbackPending")} v${v}`,
            });
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
        onClose={() => setPublishOpen(false)}
        onPublish={async (comment) => {
          setPublishLoading(true);
          const result = await publish(comment);
          setPublishLoading(false);
          if (!result.ok) {
            setFeedback({
              type: "error",
              title: t("topicSet.feedback.publishFailed"),
              message: result.error,
            });
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
    </div>
  );
}
